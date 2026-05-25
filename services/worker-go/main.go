package main

import (
    "context"
    "fmt"
    "log"
    "math"
    "net/http"
    "os"
    "sort"
    "strings"
    "database/sql"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
    rds "github.com/redis/go-redis/v9"
    "encoding/json"
    "strconv"
)

const (
    jobQueueDailyRations    = "jobs:daily_rations"
    jobQueueDailyProduction = "jobs:daily_production"
    jobQueueResourceAlerts  = "jobs:resource_alerts"
    jobQueueDelayed         = "jobs:delayed"
    jobQueueDLQ             = "jobs:dlq"
)

type Camp struct {
    ID   int
    Name string
}

type Person struct {
    ID           int
    Age          *int
    ProfessionID int
    Profession   string
}

type Resource struct {
    ID         int
    Name       string
    Unit       string
    DailyRation float64
    Quantity   float64
}

type ProfessionResourceAmount struct {
    ProfessionID    int
    ResourceTypeID  int
    Amount          float64
}

type ContributionOverride struct {
    ResourceTypeID int
    Amount         float64
}

type ResourceAlert struct {
    ResourceID          int
    ResourceName        string
    QuantityCurrent     float64
    QuantityMinThreshold float64
    Status              string
}

func main() {
    ctx := context.Background()

    dburl := os.Getenv("DATABASE_URL")
    if dburl == "" {
        log.Fatal("DATABASE_URL is required")
    }

    childAge := 12
    if v := os.Getenv("CHILD_AGE"); v != "" {
        fmt.Sscanf(v, "%d", &childAge)
    }

    pool, err := pgxpool.New(ctx, dburl)
    if err != nil {
        log.Fatalf("failed to connect to db: %v", err)
    }
    defer pool.Close()

    // If VALKEY_JOBS_URL is set, run in daemon mode consuming jobs from the queue.
    valkeyURL := os.Getenv("VALKEY_JOBS_URL")
    if valkeyURL != "" {
        log.Printf("Starting worker in daemon mode (queues: %s, %s, %s)", jobQueueDailyRations, jobQueueDailyProduction, jobQueueResourceAlerts)
        if err := runDaemon(ctx, pool, valkeyURL, childAge); err != nil {
            log.Fatalf("worker daemon failed: %v", err)
        }
        return
    }

    if err := runOnce(ctx, pool, childAge); err != nil {
        log.Fatalf("worker single-run failed: %v", err)
    }
}

func runOnce(ctx context.Context, pool *pgxpool.Pool, childAge int) error {
    camps, err := getAllCamps(ctx, pool)
    if err != nil {
        return err
    }

    for _, camp := range camps {
        log.Printf("[JOB] Processing camp %d (%s)", camp.ID, camp.Name)
        if err := processCampRations(ctx, pool, camp, childAge); err != nil {
            log.Printf("[JOB] Camp %d error: %v", camp.ID, err)
        }
    }

    if err := processDailyProduction(ctx, pool, nil); err != nil {
        log.Printf("[JOB] Daily production error: %v", err)
    }

    if err := processResourceAlerts(ctx, pool, nil); err != nil {
        log.Printf("[JOB] Resource alerts error: %v", err)
    }

    return nil
}

func runDaemon(ctx context.Context, pool *pgxpool.Pool, redisUrl string, childAge int) error {
    // start small HTTP health endpoint
    go func() {
        http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
            w.WriteHeader(200)
            _, _ = w.Write([]byte(`{"status":"ok"}`))
        })
        log.Printf("health endpoint listening on :8080")
        _ = http.ListenAndServe(":8080", nil)
    }()

    opt, err := rds.ParseURL(redisUrl)
    if err != nil {
        return fmt.Errorf("invalid VALKEY_JOBS_URL: %w", err)
    }
    client := rds.NewClient(opt)
    defer client.Close()

    maxRetries := 3
    if v := os.Getenv("MAX_RETRIES"); v != "" {
        if n, err := strconv.Atoi(v); err == nil {
            maxRetries = n
        }
    }
    baseDelay := 5 // seconds
    if v := os.Getenv("BASE_DELAY_SECONDS"); v != "" {
        if n, err := strconv.Atoi(v); err == nil {
            baseDelay = n
        }
    }

    queues := []string{jobQueueDailyRations, jobQueueDailyProduction, jobQueueResourceAlerts}

    moveDueDelayedJobs := func(ctx context.Context) error {
        nowMs := time.Now().UnixMilli()
        maxStr := strconv.FormatInt(nowMs, 10)
        members, err := client.ZRangeByScore(ctx, jobQueueDelayed, &rds.ZRangeBy{Min: "-inf", Max: maxStr, Count: 100}).Result()
        if err != nil {
            return err
        }
        if len(members) == 0 {
            return nil
        }
        for _, m := range members {
            if _, err := client.ZRem(ctx, jobQueueDelayed, m).Result(); err != nil {
                log.Printf("failed to ZREM delayed member: %v", err)
                continue
            }
            var delayedJob map[string]interface{}
            if err := json.Unmarshal([]byte(m), &delayedJob); err != nil {
                log.Printf("invalid delayed payload, moving to DLQ: %v", err)
                if _, e := client.RPush(ctx, jobQueueDLQ, m).Result(); e != nil {
                    log.Printf("failed to push delayed payload to DLQ: %v", e)
                }
                continue
            }

            queue := payloadString(delayedJob, "queue")
            if queue == "" {
                queue = queueForJobType(payloadString(delayedJob, "type"))
            }
            if queue == "" {
                queue = jobQueueDailyRations
            }

            if _, err := client.RPush(ctx, queue, m).Result(); err != nil {
                log.Printf("failed to RPUSH delayed member into queue: %v", err)
                continue
            }
            log.Printf("moved delayed job into queue %s", queue)
        }
        return nil
    }

    for {
        // move due delayed jobs into main list before blocking
        if err := moveDueDelayedJobs(ctx); err != nil {
            log.Printf("failed to move delayed jobs: %v", err)
        }

        // BRPOP with 5s timeout
        res, err := client.BRPop(ctx, 5*time.Second, queues...).Result()
        if err != nil && err != rds.Nil {
            log.Printf("redis BRPop error: %v", err)
            time.Sleep(2 * time.Second)
            continue
        }
        if err == rds.Nil || len(res) == 0 {
            // timeout - continue
            continue
        }

        queue := res[0]
        payload := res[1]
        log.Printf("[WORKER] Job popped from queue %s: %s", queue, payload)

        var job map[string]interface{}
        if err := json.Unmarshal([]byte(payload), &job); err != nil {
            log.Printf("invalid job payload, moving to DLQ: %v", err)
            if _, e := client.RPush(ctx, jobQueueDLQ, payload).Result(); e != nil {
                log.Printf("failed to push to DLQ: %v", e)
            }
            continue
        }

        attempts := 0
        if a, ok := job["attempts"]; ok {
            switch v := a.(type) {
            case float64:
                attempts = int(v)
            case int:
                attempts = v
            }
        }

        jobType, _ := job["type"].(string)
        queueName := payloadString(job, "queue")
        if queueName == "" {
            queueName = queueForJobType(jobType)
        }
        if queueName == "" {
            queueName = queue
        }
        if payloadString(job, "queue") == "" {
            job["queue"] = queueName
        }

        var errProc error
        switch jobType {
        case "daily_rations":
            errProc = processDailyRations(ctx, pool, job, childAge)
        case "daily_production":
            errProc = processDailyProduction(ctx, pool, job)
        case "resource_alerts":
            errProc = processResourceAlerts(ctx, pool, job)
        default:
            log.Printf("unknown job type: %s", jobType)
            errProc = fmt.Errorf("unknown job type: %s", jobType)
        }

        if errProc != nil {
            attempts++
            if attempts > maxRetries {
                log.Printf("job failed after %d attempts; moving to DLQ", attempts)
                if _, e := client.RPush(ctx, jobQueueDLQ, payload).Result(); e != nil {
                    log.Printf("failed to push to DLQ: %v", e)
                }
                continue
            }
            delaySec := baseDelay * (1 << (attempts - 1))
            job["attempts"] = attempts
            job["queue"] = queueName
            updated, _ := json.Marshal(job)
            score := float64(time.Now().UnixMilli() + int64(delaySec*1000))
            if _, e := client.ZAdd(ctx, jobQueueDelayed, rds.Z{Score: score, Member: string(updated)}).Result(); e != nil {
                log.Printf("failed to add to delayed set: %v", e)
            } else {
                log.Printf("re-enqueued job with delay %ds (attempt %d)", delaySec, attempts)
            }
            continue
        }
    }
    // unreachable
    // return nil
}

func processDailyRations(ctx context.Context, pool *pgxpool.Pool, job map[string]interface{}, childAge int) error {
    if cid, ok := payloadInt(job, "campId"); ok {
        camp, err := getCampByID(ctx, pool, cid)
        if err != nil {
            return err
        }
        return processCampRations(ctx, pool, camp, childAge)
    }

    camps, err := getAllCamps(ctx, pool)
    if err != nil {
        return err
    }

    for _, camp := range camps {
        if err := processCampRations(ctx, pool, camp, childAge); err != nil {
            log.Printf("[JOB] Camp %d error: %v", camp.ID, err)
            return err
        }
    }

    return nil
}

func processDailyProduction(ctx context.Context, pool *pgxpool.Pool, job map[string]interface{}) error {
    professionResourceAmounts, err := getProfessionResourceAmounts(ctx, pool)
    if err != nil {
        return err
    }

    if cid, ok := payloadInt(job, "campId"); ok {
        camp, err := getCampByID(ctx, pool, cid)
        if err != nil {
            return err
        }
        return processCampProduction(ctx, pool, camp, professionResourceAmounts)
    }

    camps, err := getAllCamps(ctx, pool)
    if err != nil {
        return err
    }

    for _, camp := range camps {
        if err := processCampProduction(ctx, pool, camp, professionResourceAmounts); err != nil {
            log.Printf("[JOB] Camp %d (%s) production error: %v", camp.ID, camp.Name, err)
            return err
        }
    }

    return nil
}

func processResourceAlerts(ctx context.Context, pool *pgxpool.Pool, job map[string]interface{}) error {
    if cid, ok := payloadInt(job, "campId"); ok {
        camp, err := getCampByID(ctx, pool, cid)
        if err != nil {
            return err
        }
        return processCampAlerts(ctx, pool, camp)
    }

    camps, err := getAllCamps(ctx, pool)
    if err != nil {
        return err
    }

    for _, camp := range camps {
        if err := processCampAlerts(ctx, pool, camp); err != nil {
            log.Printf("[JOB] Camp %d (%s) alert error: %v", camp.ID, camp.Name, err)
            return err
        }
    }

    return nil
}

func getCampByID(ctx context.Context, pool *pgxpool.Pool, campId int) (Camp, error) {
    row := pool.QueryRow(ctx, `SELECT id, name FROM camps WHERE id = $1 AND status = 'ACTIVE' AND deleted_at IS NULL`, campId)
    var camp Camp
    if err := row.Scan(&camp.ID, &camp.Name); err != nil {
        return Camp{}, err
    }
    return camp, nil
}

func getProfessionResourceAmounts(ctx context.Context, pool *pgxpool.Pool) ([]ProfessionResourceAmount, error) {
    rows, err := pool.Query(ctx, `SELECT profession_id, resource_type_id, amount::float FROM professions_resources_amounts ORDER BY profession_id, resource_type_id`)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var out []ProfessionResourceAmount
    for rows.Next() {
        var item ProfessionResourceAmount
        if err := rows.Scan(&item.ProfessionID, &item.ResourceTypeID, &item.Amount); err != nil {
            return nil, err
        }
        out = append(out, item)
    }
    return out, nil
}

func getActiveContributionOverridesByCamp(ctx context.Context, pool *pgxpool.Pool, campId int) ([]ContributionOverride, error) {
    todayStr := time.Now().UTC().Format("2006-01-02")
    today := todayStr + "T00:00:00.000Z"

    rows, err := pool.Query(ctx, `
        SELECT co.resource_type_id, co.amount::float
        FROM contribution_overrides co
        JOIN persons p ON p.id = co.person_id
        WHERE p.camp_id = $1
          AND co.start_date <= $2::timestamptz
          AND (co.end_date IS NULL OR co.end_date >= $2::timestamptz)
        ORDER BY co.resource_type_id
    `, campId, today)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var out []ContributionOverride
    for rows.Next() {
        var item ContributionOverride
        if err := rows.Scan(&item.ResourceTypeID, &item.Amount); err != nil {
            return nil, err
        }
        out = append(out, item)
    }
    return out, nil
}

func processCampProduction(ctx context.Context, pool *pgxpool.Pool, camp Camp, professionResourceAmounts []ProfessionResourceAmount) error {
    people, err := getActivePeopleWithProfessionsByCamp(ctx, pool, camp.ID)
    if err != nil {
        return err
    }

    if len(people) == 0 {
        log.Printf(" [JOB] Camp %d (%s): no active people, skipping production", camp.ID, camp.Name)
        return nil
    }

    activeOverrides, err := getActiveContributionOverridesByCamp(ctx, pool, camp.ID)
    if err != nil {
        return err
    }

    activeProfessionIds := make(map[int]struct{}, len(people))
    for _, person := range people {
        activeProfessionIds[person.ProfessionID] = struct{}{}
    }

    totals := make(map[int]float64)
    for _, amount := range professionResourceAmounts {
        if _, ok := activeProfessionIds[amount.ProfessionID]; !ok {
            continue
        }

        total := roundToTwoDecimals(amount.Amount * float64(countProfessionMembers(people, amount.ProfessionID)))
        if total <= 0 {
            continue
        }

        totals[amount.ResourceTypeID] = roundToTwoDecimals(totals[amount.ResourceTypeID] + total)
    }

    for _, override := range activeOverrides {
        totals[override.ResourceTypeID] = roundToTwoDecimals(totals[override.ResourceTypeID] + override.Amount)
    }

    var appliedCount int
    for resourceTypeID, quantity := range totals {
        if quantity <= 0 {
            continue
        }

        appliedCount++
        if err := increaseInventoryWithLog(ctx, pool, camp.ID, resourceTypeID, quantity, fmt.Sprintf("Daily production from professions and overrides for camp %d", camp.ID)); err != nil {
            return err
        }
    }

    if err := logLowResourceAlerts(ctx, pool, camp.ID); err != nil {
        return err
    }

    if appliedCount == 0 {
        log.Printf(" [JOB] Camp %d (%s): production netted no positive gains", camp.ID, camp.Name)
        return nil
    }

    log.Printf(" [JOB] Camp %d (%s): applied %d production movement(s)", camp.ID, camp.Name, appliedCount)
    return nil
}

func increaseInventoryWithLog(ctx context.Context, pool *pgxpool.Pool, campId int, resourceTypeId int, quantity float64, description string) error {
    tx, err := pool.Begin(ctx)
    if err != nil {
        return err
    }
    defer tx.Rollback(ctx)

    cmd, err := tx.Exec(
        ctx,
        `UPDATE inventory SET quantity = quantity + $1, last_updated = now() WHERE camp_id = $2 AND resource_type_id = $3`,
        quantity,
        campId,
        resourceTypeId,
    )
    if err != nil {
        return err
    }
    if cmd.RowsAffected() == 0 {
        if _, err := tx.Exec(
            ctx,
            `INSERT INTO inventory (camp_id, resource_type_id, quantity, last_updated) VALUES ($1, $2, $3, now())`,
            campId,
            resourceTypeId,
            quantity,
        ); err != nil {
            return err
        }
    }

    if _, err := tx.Exec(
        ctx,
        `INSERT INTO inventory_log (camp_id, resource_type_id, log_type, quantity_change, description) VALUES ($1, $2, $3, $4, $5)`,
        campId,
        resourceTypeId,
        "DAILY_GAIN",
        quantity,
        description,
    ); err != nil {
        return err
    }

    return tx.Commit(ctx)
}

func countProfessionMembers(people []Person, professionID int) int {
    count := 0
    for _, person := range people {
        if person.ProfessionID == professionID {
            count++
        }
    }
    return count
}

func processCampAlerts(ctx context.Context, pool *pgxpool.Pool, camp Camp) error {
    rows, err := pool.Query(ctx, `
        SELECT inv.resource_type_id, rt.name, inv.quantity::float, rt.minimum_stock::float
        FROM inventory inv
        JOIN resource_type rt ON inv.resource_type_id = rt.id
        WHERE inv.camp_id = $1
        ORDER BY rt.name
    `, camp.ID)
    if err != nil {
        return err
    }
    defer rows.Close()

    alertCount := 0
    for rows.Next() {
        var resourceID int
        var name string
        var qty, min float64
        if err := rows.Scan(&resourceID, &name, &qty, &min); err != nil {
            return err
        }

        status := "OK"
        if qty < min*0.5 {
            status = "CRITICAL"
        } else if qty < min {
            status = "LOW"
        } else if qty > min*3 {
            status = "OVERSTOCKED"
        }

        if status == "LOW" || status == "CRITICAL" {
            alertCount++
            if status == "CRITICAL" {
                log.Printf(" [JOB] Camp %d (%s): CRITICAL alert for %s (%.0f/%.0f)", camp.ID, camp.Name, name, qty, min)
            } else {
                log.Printf(" [JOB] Camp %d (%s): LOW alert for %s (%.0f/%.0f)", camp.ID, camp.Name, name, qty, min)
            }
        }
    }

    if alertCount > 0 {
        log.Printf(" [JOB] Camp %d (%s): %d resource alert(s) emitted", camp.ID, camp.Name, alertCount)
    }

    return nil
}

func payloadString(job map[string]interface{}, key string) string {
    if value, ok := job[key]; ok {
        if s, ok := value.(string); ok {
            return s
        }
    }
    return ""
}

func payloadInt(job map[string]interface{}, key string) (int, bool) {
    value, ok := job[key]
    if !ok {
        return 0, false
    }

    switch v := value.(type) {
    case float64:
        return int(v), true
    case int:
        return v, true
    default:
        return 0, false
    }
}

func queueForJobType(jobType string) string {
    switch jobType {
    case "daily_rations":
        return jobQueueDailyRations
    case "daily_production":
        return jobQueueDailyProduction
    case "resource_alerts":
        return jobQueueResourceAlerts
    default:
        return ""
    }
}

func getAllCamps(ctx context.Context, pool *pgxpool.Pool) ([]Camp, error) {
    rows, err := pool.Query(ctx, "SELECT id, name FROM camps WHERE status='ACTIVE' AND deleted_at IS NULL ORDER BY id")
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var out []Camp
    for rows.Next() {
        var c Camp
        if err := rows.Scan(&c.ID, &c.Name); err != nil {
            return nil, err
        }
        out = append(out, c)
    }
    return out, nil
}

func getActivePeopleWithProfessionsByCamp(ctx context.Context, pool *pgxpool.Pool, campId int) ([]Person, error) {
    // table persons is mapped as "persons"
    rows, err := pool.Query(ctx, `SELECT p.id, p.age, p.profession_id, pr.name FROM persons p JOIN professions pr ON p.profession_id = pr.id WHERE p.camp_id=$1 AND p.status <> 'DEAD' ORDER BY p.id`, campId)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var out []Person
    for rows.Next() {
        var p Person
        var age sql.NullInt64
        if err := rows.Scan(&p.ID, &age, &p.ProfessionID, &p.Profession); err != nil {
            return nil, err
        }
        if age.Valid {
            v := int(age.Int64)
            p.Age = &v
        }
        out = append(out, p)
    }
    return out, nil
}

func getDailyRationResources(ctx context.Context, pool *pgxpool.Pool, campId int) ([]Resource, error) {
    rows, err := pool.Query(ctx, `SELECT rt.id, rt.name, rt.unit, rt.daily_ration::float, COALESCE(inv.quantity::float, 0) FROM resource_type rt LEFT JOIN inventory inv ON inv.resource_type_id = rt.id AND inv.camp_id = $1 WHERE rt.auto_daily = true`, campId)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var out []Resource
    for rows.Next() {
        var r Resource
        if err := rows.Scan(&r.ID, &r.Name, &r.Unit, &r.DailyRation, &r.Quantity); err != nil {
            return nil, err
        }
        out = append(out, r)
    }
    return out, nil
}

func processCampRations(ctx context.Context, pool *pgxpool.Pool, camp Camp, childAge int) error {
    people, err := getActivePeopleWithProfessionsByCamp(ctx, pool, camp.ID)
    if err != nil {
        return err
    }

    if len(people) == 0 {
        log.Printf(" [JOB] Camp %d (%s): no active people, skipping", camp.ID, camp.Name)
        return nil
    }

    priority := buildPriorityPeople(people, childAge)
    assignments := createAssignments(priority)

    rationResources, err := getDailyRationResources(ctx, pool, camp.ID)
    if err != nil {
        return err
    }

    if len(rationResources) == 0 {
        log.Printf(" [JOB] Camp %d (%s): no daily ration resources configured", camp.ID, camp.Name)
        return nil
    }

    for _, resource := range rationResources {
        if err := distributeResource(ctx, pool, camp.ID, resource, assignments); err != nil {
            log.Printf(" [JOB] Camp %d: error distributing %s: %v", camp.ID, resource.Name, err)
        }
    }

    if err := logLowResourceAlerts(ctx, pool, camp.ID); err != nil {
        log.Printf(" [JOB] Camp %d: failed to log low resource alerts: %v", camp.ID, err)
    }

    served := countServed(assignments)
    log.Printf(" [JOB] Camp %d: assignments completed for %d/%d people", camp.ID, served, len(priority))
    return nil
}

func buildPriorityPeople(people []Person, childAge int) []Person {
    seen := make(map[int]struct{})
    var priority []Person

    for _, p := range people {
        if p.Age != nil && *p.Age <= childAge {
            seen[p.ID] = struct{}{}
            priority = append(priority, p)
        }
    }
    for _, p := range people {
        if _, ok := seen[p.ID]; ok { continue }
        lname := strings.ToLower(p.Profession)
        if strings.Contains(lname, "doctor") || strings.Contains(lname, "medic") {
            seen[p.ID] = struct{}{}
            priority = append(priority, p)
        }
    }
    for _, p := range people {
        if _, ok := seen[p.ID]; ok { continue }
        lname := strings.ToLower(p.Profession)
        if strings.Contains(lname, "explorer") || strings.Contains(lname, "scout") {
            seen[p.ID] = struct{}{}
            priority = append(priority, p)
        }
    }
    for _, p := range people {
        if _, ok := seen[p.ID]; ok { continue }
        priority = append(priority, p)
    }

    return priority
}

func roundToTwoDecimals(value float64) float64 {
    return math.Round(value*100) / 100
}

func createAssignments(priority []Person) map[int]map[int]float64 {
    m := make(map[int]map[int]float64)
    for _, p := range priority {
        m[p.ID] = make(map[int]float64)
    }
    return m
}

// Count served
func countServed(assignments map[int]map[int]float64) int {
    n := 0
    for _, v := range assignments {
        if len(v) > 0 { n++ }
    }
    return n
}

func distributeResource(ctx context.Context, pool *pgxpool.Pool, campId int, resource Resource, assignments map[int]map[int]float64) error {
    inventory := resource.Quantity
    perPersonNeed := resource.DailyRation

    if inventory <= 0 || perPersonNeed <= 0 {
        log.Printf(" [JOB] Camp %d: %s has no quantity or invalid ration (%.2f/%.2f)", campId, resource.Name, inventory, perPersonNeed)
        return nil
    }

    var recipientIds []int
    for id := range assignments {
        recipientIds = append(recipientIds, id)
    }
    sort.Ints(recipientIds)

    fullPortions := int(math.Floor(inventory / perPersonNeed))
    if fullPortions <= 0 {
        log.Printf(" [JOB] Camp %d: insufficient %s for one ration per person", campId, resource.Name)
        return nil
    }

    var selected []int
    if fullPortions >= len(recipientIds) {
        selected = recipientIds
    } else {
        selected = recipientIds[:fullPortions]
    }

    consumeTotal := perPersonNeed * float64(len(selected))

    for _, pid := range selected {
        assignments[pid][resource.ID] = perPersonNeed
    }

    // perform DB transaction to decrement inventory and insert inventory_log
    tx, err := pool.Begin(ctx)
    if err != nil { return err }
    defer tx.Rollback(ctx)

    cmd, err := tx.Exec(ctx, `UPDATE inventory SET quantity = quantity - $1, last_updated = now() WHERE camp_id=$2 AND resource_type_id=$3 AND quantity >= $1`, consumeTotal, campId, resource.ID)
    if err != nil { return err }
    if cmd.RowsAffected() == 0 {
        // insufficient inventory
        return fmt.Errorf("insufficient inventory for resource_type_id %d in camp %d", resource.ID, campId)
    }

    _, err = tx.Exec(
        ctx,
        `INSERT INTO inventory_log (camp_id, resource_type_id, log_type, quantity_change, description) VALUES ($1, $2, $3, $4, $5)`,
        campId,
        resource.ID,
        "DAILY_RATION",
        -consumeTotal,
        fmt.Sprintf("Daily %s distribution", resource.Name),
    )
    if err != nil { return err }

    if err := tx.Commit(ctx); err != nil { return err }

    if len(selected) == len(recipientIds) {
        log.Printf(" [JOB] Camp %d: %s distributed to all (%.2f %s)", campId, resource.Name, consumeTotal, resource.Unit)
    } else {
        log.Printf(" [JOB] Camp %d: %s supplied to %d people", campId, resource.Name, len(selected))
    }

    return nil
}

func logLowResourceAlerts(ctx context.Context, pool *pgxpool.Pool, campId int) error {
    rows, err := pool.Query(ctx, `SELECT inv.quantity::float, rt.minimum_stock::float, rt.name FROM inventory inv JOIN resource_type rt ON inv.resource_type_id = rt.id WHERE inv.camp_id = $1`, campId)
    if err != nil { return err }
    defer rows.Close()

    for rows.Next() {
        var qty, min float64
        var name string
        if err := rows.Scan(&qty, &min, &name); err != nil { return err }
        status := "OK"
        if qty < min*0.5 {
            status = "CRITICAL"
        } else if qty < min {
            status = "LOW"
        }

        if status != "OK" {
            if status == "CRITICAL" {
                log.Printf(" [INVENTORY] Camp %d: %s CRITICAL (%.2f/%.2f)", campId, name, qty, min)
            } else {
                log.Printf(" [INVENTORY] Camp %d: %s LOW (%.2f/%.2f)", campId, name, qty, min)
            }
        }
    }
    return nil
}
