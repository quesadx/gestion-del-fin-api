import { z } from 'zod';

/*

For reference:

model users {
  id                                                      Int                      @id @default(autoincrement()) @db.UnsignedInt
  camp_id                                                 Int                      @db.UnsignedInt
  role_id                                                 Int                      @db.UnsignedInt
  username                                                String                   @unique(map: "username_UNIQUE") @db.VarChar(60)
  password_hash                                           String                   @db.VarChar(255)
  is_active                                               Boolean                  @default(true)
  last_activity                                           DateTime?                @db.Timestamp(0)
  created_at                                              DateTime                 @default(now()) @db.DateTime(0)
  admission_requests                                      admission_requests[]
  camp_transfers_camp_transfers_approved_by_sourceTousers camp_transfers[]         @relation("camp_transfers_approved_by_sourceTousers")
  camp_transfers_camp_transfers_approved_by_targetTousers camp_transfers[]         @relation("camp_transfers_approved_by_targetTousers")
  camp_transfers_camp_transfers_requested_byTousers       camp_transfers[]         @relation("camp_transfers_requested_byTousers")
  contribution_overrides                                  contribution_overrides[]
  expeditions                                             expeditions[]
  inventory_log                                           inventory_log[]
  person_status_log                                       person_status_log[]
  user_achievements                                       user_achievements[]
  camps                                                   camps                    @relation(fields: [camp_id], references: [id], onDelete: NoAction, onUpdate: NoAction, map: "fk_camp_id")
  roles                                                   roles                    @relation(fields: [role_id], references: [id], onDelete: NoAction, onUpdate: NoAction, map: "fk_role_id")

  @@index([camp_id], map: "fk_users_camp_idx")
  @@index([role_id], map: "fk_users_role_idx")
}
*/

export const CreateUserSchema = z.object({
  username: z.string().min(1).max(60),
  password: z.string().min(1).max(255),
  camp_id: z.number().int().positive(),
  role_id: z.number().int().positive(),
  is_active: z.boolean(),
  last_activity: z.iso.datetime().optional(),
  created_at: z.iso.datetime(),
});

export const UpdateUserSchema = CreateUserSchema.partial();

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
