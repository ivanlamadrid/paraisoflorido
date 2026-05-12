import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotifications1744900000000 implements MigrationInterface {
  name = 'CreateNotifications1744900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notification_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token" text NOT NULL,
        "platform" varchar(20) NOT NULL DEFAULT 'unknown',
        "user_agent" varchar(512),
        "enabled" boolean NOT NULL DEFAULT true,
        "last_seen_at" timestamptz,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_notification_tokens_token" UNIQUE ("token"),
        CONSTRAINT "FK_notification_tokens_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_notification_tokens_platform"
          CHECK ("platform" IN ('web', 'android', 'ios', 'unknown'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notification_tokens_user_id_enabled"
      ON "notification_tokens" ("user_id", "enabled")
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "student_id" uuid,
        "type" varchar(40) NOT NULL,
        "title" varchar(140) NOT NULL,
        "body" varchar(280) NOT NULL,
        "data_json" jsonb,
        "read_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_student_id"
          FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_notifications_type"
          CHECK ("type" IN ('attendance_marked', 'announcement_published', 'system_test'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_id_created_at"
      ON "notifications" ("user_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_id_read_at"
      ON "notifications" ("user_id", "read_at")
    `);

    await queryRunner.query(`
      CREATE TABLE "notification_delivery_attempts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "notification_id" uuid NOT NULL,
        "notification_token_id" uuid,
        "provider" varchar(20) NOT NULL DEFAULT 'fcm',
        "status" varchar(32) NOT NULL DEFAULT 'pending',
        "provider_message_id" varchar(255),
        "error_code" varchar(120),
        "error_message" varchar(512),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_delivery_attempts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_delivery_attempts_notification_id"
          FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notification_delivery_attempts_notification_token_id"
          FOREIGN KEY ("notification_token_id") REFERENCES "notification_tokens"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_notification_delivery_attempts_provider"
          CHECK ("provider" IN ('fcm')),
        CONSTRAINT "CHK_notification_delivery_attempts_status"
          CHECK ("status" IN ('pending', 'sent', 'failed', 'invalid_token', 'skipped'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notification_delivery_attempts_notification_id_created_at"
      ON "notification_delivery_attempts" ("notification_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notification_delivery_attempts_token_id_created_at"
      ON "notification_delivery_attempts" ("notification_token_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."IDX_notification_delivery_attempts_token_id_created_at"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_notification_delivery_attempts_notification_id_created_at"',
    );
    await queryRunner.query('DROP TABLE "notification_delivery_attempts"');
    await queryRunner.query(
      'DROP INDEX "public"."IDX_notifications_user_id_read_at"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_notifications_user_id_created_at"',
    );
    await queryRunner.query('DROP TABLE "notifications"');
    await queryRunner.query(
      'DROP INDEX "public"."IDX_notification_tokens_user_id_enabled"',
    );
    await queryRunner.query('DROP TABLE "notification_tokens"');
  }
}
