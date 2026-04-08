import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordChangeLogs1744400000000 implements MigrationInterface {
  name = 'AddPasswordChangeLogs1744400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "password_change_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_change_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_password_change_logs_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_password_change_logs_user_id"
      ON "password_change_logs" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_password_change_logs_user_id_created_at"
      ON "password_change_logs" ("user_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_password_change_logs_user_id_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_password_change_logs_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "password_change_logs"`);
  }
}
