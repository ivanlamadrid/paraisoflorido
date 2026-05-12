import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebPushSubscriptions1745100000000
  implements MigrationInterface
{
  name = 'CreateWebPushSubscriptions1745100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "web_push_subscriptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "endpoint" text NOT NULL,
        "p256dh" text NOT NULL,
        "auth" text NOT NULL,
        "user_agent" varchar(512),
        "enabled" boolean NOT NULL DEFAULT true,
        "last_seen_at" timestamptz,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_web_push_subscriptions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_web_push_subscriptions_endpoint" UNIQUE ("endpoint"),
        CONSTRAINT "FK_web_push_subscriptions_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_web_push_subscriptions_user_id_enabled"
      ON "web_push_subscriptions" ("user_id", "enabled")
    `);

    await queryRunner.query(`
      ALTER TABLE "notification_delivery_attempts"
      DROP CONSTRAINT "CHK_notification_delivery_attempts_provider"
    `);
    await queryRunner.query(`
      ALTER TABLE "notification_delivery_attempts"
      ADD CONSTRAINT "CHK_notification_delivery_attempts_provider"
      CHECK ("provider" IN ('fcm', 'web_push'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notification_delivery_attempts"
      DROP CONSTRAINT "CHK_notification_delivery_attempts_provider"
    `);
    await queryRunner.query(`
      ALTER TABLE "notification_delivery_attempts"
      ADD CONSTRAINT "CHK_notification_delivery_attempts_provider"
      CHECK ("provider" IN ('fcm'))
    `);
    await queryRunner.query(
      'DROP INDEX "public"."IDX_web_push_subscriptions_user_id_enabled"',
    );
    await queryRunner.query('DROP TABLE "web_push_subscriptions"');
  }
}
