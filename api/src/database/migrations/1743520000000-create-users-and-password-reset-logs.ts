import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndPasswordResetLogs1743520000000 implements MigrationInterface {
  name = 'CreateUsersAndPasswordResetLogs1743520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "username" varchar(32) NOT NULL,
        "display_name" varchar(120) NOT NULL,
        "role" varchar(20) NOT NULL,
        "password_hash" text NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "must_change_password" boolean NOT NULL DEFAULT false,
        "last_login_at" timestamptz,
        "auth_version" integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "CHK_users_role" CHECK ("role" IN ('director', 'secretary', 'auxiliary', 'student'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "password_reset_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "target_user_id" uuid NOT NULL,
        "performed_by_user_id" uuid NOT NULL,
        "reason" varchar(255) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_reset_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_password_reset_logs_target_user" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_password_reset_logs_performed_by_user" FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_users_username" ON "users" ("username")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_users_role_is_active" ON "users" ("role", "is_active")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_password_reset_logs_target_user_id_created_at" ON "password_reset_logs" ("target_user_id", "created_at")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_password_reset_logs_performed_by_user_id_created_at" ON "password_reset_logs" ("performed_by_user_id", "created_at")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."IDX_password_reset_logs_performed_by_user_id_created_at"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_password_reset_logs_target_user_id_created_at"',
    );
    await queryRunner.query('DROP INDEX "public"."IDX_users_role_is_active"');
    await queryRunner.query('DROP INDEX "public"."IDX_users_username"');
    await queryRunner.query('DROP TABLE "password_reset_logs"');
    await queryRunner.query('DROP TABLE "users"');
  }
}
