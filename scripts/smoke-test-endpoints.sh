#!/usr/bin/env bash
set -u

BASE_URL="${BASE_URL:-}"
USERNAME="${USERNAME:-}"
PASSWORD="${PASSWORD:-}"
TOKEN_FILE="${TOKEN_FILE:-}"
TMP_DIR="${TMP_DIR:-/tmp/gestion-del-fin-smoke}"

DEFAULT_BASE_URL="http://localhost:3000"
DEFAULT_TOKEN_FILE="/tmp/gestion-del-fin.token"

prompt_with_default() {
  local var_name="$1"
  local prompt_label="$2"
  local default_value="$3"
  local current_value="$4"

  if [[ -n "$current_value" ]]; then
    printf -v "$var_name" '%s' "$current_value"
    return
  fi

  read -r -p "$prompt_label [$default_value]: " input_value
  if [[ -z "$input_value" ]]; then
    input_value="$default_value"
  fi

  printf -v "$var_name" '%s' "$input_value"
}

prompt_required() {
  local var_name="$1"
  local prompt_label="$2"
  local current_value="$3"

  if [[ -n "$current_value" ]]; then
    printf -v "$var_name" '%s' "$current_value"
    return
  fi

  local input_value=""
  while [[ -z "$input_value" ]]; do
    read -r -p "$prompt_label: " input_value
  done

  printf -v "$var_name" '%s' "$input_value"
}

prompt_always_with_default() {
  local var_name="$1"
  local prompt_label="$2"
  local default_value="$3"

  local input_value=""
  read -r -p "$prompt_label [$default_value]: " input_value
  if [[ -z "$input_value" ]]; then
    input_value="$default_value"
  fi

  printf -v "$var_name" '%s' "$input_value"
}

prompt_password() {
  local var_name="$1"
  local prompt_label="$2"
  local current_value="$3"

  if [[ -n "$current_value" ]]; then
    printf -v "$var_name" '%s' "$current_value"
    return
  fi

  local input_value=""
  while [[ -z "$input_value" ]]; do
    read -r -s -p "$prompt_label: " input_value
    echo
  done

  printf -v "$var_name" '%s' "$input_value"
}

prompt_with_default BASE_URL "Base URL" "$DEFAULT_BASE_URL" "$BASE_URL"
prompt_always_with_default USERNAME "Username" "admin_master"
prompt_password PASSWORD "Password" "$PASSWORD"
prompt_with_default TOKEN_FILE "Token file" "$DEFAULT_TOKEN_FILE" "$TOKEN_FILE"

# Reset token file at start to avoid using stale tokens if login fails.
: > "$TOKEN_FILE"

mkdir -p "$TMP_DIR"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required"
  exit 1
fi

pass_count=0
warn_count=0
fail_count=0

log_pass() {
  echo "[PASS] $1"
  pass_count=$((pass_count + 1))
}

log_warn() {
  echo "[WARN] $1"
  warn_count=$((warn_count + 1))
}

log_fail() {
  echo "[FAIL] $1"
  fail_count=$((fail_count + 1))
}

request() {
  local method="$1"
  local path="$2"
  local auth="$3"
  local data="${4:-}"
  local out_file="$TMP_DIR/body.out"
  local url="$BASE_URL$path"

  local -a args
  args=(-sS -o "$out_file" -w "%{http_code}" -X "$method" "$url" -H "Accept: application/json")

  if [[ "$auth" == "yes" ]]; then
    args+=(-H "Authorization: Bearer $TOKEN")
  fi

  if [[ -n "$data" ]]; then
    args+=(-H "Content-Type: application/json" -d "$data")
  fi

  local code
  code=$(curl "${args[@]}" 2>/dev/null)

  if [[ "$code" == "000" || -z "$code" ]]; then
    echo "000"
    return
  fi

  echo "$code"
}

echo "== Smoke test start =="
echo "BASE_URL: $BASE_URL"

# Basic unauthenticated checks
code=$(request GET "/" no)
if [[ "$code" =~ ^2 ]]; then
  log_pass "GET / -> $code"
else
  log_warn "GET / -> $code"
fi

code=$(request GET "/api/system/time" no)
if [[ "$code" =~ ^2 ]]; then
  log_pass "GET /api/system/time -> $code"
else
  log_warn "GET /api/system/time -> $code"
fi

login_out="$TMP_DIR/login.out"
login_code=""

# Allow retrying credentials when login fails (inactive user, wrong password, etc.)
for attempt in 1 2 3; do
  login_body=$(jq -cn --arg username "$USERNAME" --arg password "$PASSWORD" '{username: $username, password: $password}')
  login_code=$(curl -sS -o "$login_out" -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$login_body" 2>/dev/null)

  if [[ "$login_code" == "200" ]]; then
    break
  fi

  echo "Login failed with status $login_code"
  echo "Response:"
  cat "$login_out"

  if [[ "$attempt" -lt 3 ]]; then
    echo
    echo "Try different credentials (attempt $((attempt + 1)) of 3)"
    prompt_always_with_default USERNAME "Username" "admin_master"
    prompt_password PASSWORD "Password" ""
  fi
done

if [[ "$login_code" != "200" ]]; then
  exit 1
fi

TOKEN=$(jq -r '.token // empty' "$login_out")
if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "Login succeeded but token missing"
  cat "$login_out"
  exit 1
fi

printf '%s\n' "$TOKEN" > "$TOKEN_FILE"
log_pass "POST /api/auth/login -> $login_code (token saved to $TOKEN_FILE)"

# Pull endpoint list from OpenAPI
spec_out="$TMP_DIR/docs.out"
spec_code=$(curl -sS -o "$spec_out" -w "%{http_code}" "$BASE_URL/api/docs.json" 2>/dev/null)
if [[ "$spec_code" != "200" ]]; then
  log_fail "GET /api/docs.json -> $spec_code"
  echo "Cannot continue without OpenAPI docs"
  exit 1
fi

log_pass "GET /api/docs.json -> $spec_code"

mapfile -t endpoints < <(jq -r '
  .paths
  | to_entries[] as $path
  | $path.value
  | to_entries[]
  | "\(.key | ascii_upcase) \($path.key)"
' "$spec_out")

if [[ ${#endpoints[@]} -eq 0 ]]; then
  log_fail "No endpoints discovered in /api/docs.json"
  exit 1
fi

# Exercise every discovered endpoint except login/logout (handled separately)
for entry in "${endpoints[@]}"; do
  method="${entry%% *}"
  raw_path="${entry#* }"

  if [[ "$raw_path" == "/api/auth/login" || "$raw_path" == "/api/auth/logout" ]]; then
    continue
  fi

  # Replace path params like /api/users/{id} -> /api/users/1
  path=$(echo "$raw_path" | sed -E 's/\{[^}]+\}/1/g')

  body=""
  if [[ "$method" == "POST" || "$method" == "PUT" || "$method" == "PATCH" ]]; then
    body='{}'
  fi

  requires_auth="yes"
  if [[ "$path" == "/api/system/time" ]]; then
    requires_auth="no"
  fi

  code=$(request "$method" "$path" "$requires_auth" "$body")

  if [[ "$code" == "000" ]]; then
    log_fail "$method $path -> connection failed"
    continue
  fi

  # Consider these acceptable for smoke tests:
  # 2xx success, 400 validation, 401/403 auth-role, 404 missing record for id=1, 409 conflict
  case "$code" in
    2*|400|401|403|404|409)
      log_pass "$method $path -> $code"
      ;;
    *)
      log_warn "$method $path -> $code"
      ;;
  esac

done

# Explicit logout at end
logout_code=$(request POST "/api/auth/logout" yes)
if [[ "$logout_code" =~ ^2 ]]; then
  log_pass "POST /api/auth/logout -> $logout_code"
else
  log_warn "POST /api/auth/logout -> $logout_code"
fi

echo
echo "== Smoke test summary =="
echo "Pass: $pass_count"
echo "Warn: $warn_count"
echo "Fail: $fail_count"

if [[ "$fail_count" -gt 0 ]]; then
  exit 1
fi

exit 0
