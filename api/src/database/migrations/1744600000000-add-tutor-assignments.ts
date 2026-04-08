import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTutorAssignments1744600000000 implements MigrationInterface {
  name = 'AddTutorAssignments1744600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT "CHK_users_role"
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "CHK_users_role"
      CHECK ("role" IN ('director', 'secretary', 'auxiliary', 'tutor', 'student'))
    `);

    await queryRunner.query(`
      ALTER TABLE "announcement_audiences"
      DROP CONSTRAINT "CHK_announcement_audiences_role"
    `);
    await queryRunner.query(`
      ALTER TABLE "announcement_audiences"
      ADD CONSTRAINT "CHK_announcement_audiences_role"
      CHECK ("role" IS NULL OR "role" IN ('director', 'secretary', 'auxiliary', 'tutor', 'student'))
    `);

    await queryRunner.query(`
      CREATE TABLE "tutor_assignments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tutor_user_id" uuid NOT NULL,
        "school_year" smallint NOT NULL,
        "grade" smallint NOT NULL,
        "section" varchar(10) NOT NULL,
        "shift" varchar(20) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tutor_assignments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tutor_assignments_tutor_user_id"
          FOREIGN KEY ("tutor_user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_tutor_assignments_shift"
          CHECK ("shift" IN ('morning', 'afternoon'))
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_tutor_assignments_user_classroom"
      ON "tutor_assignments" ("tutor_user_id", "school_year", "grade", "section", "shift")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_tutor_assignments_tutor_user_id"
      ON "tutor_assignments" ("tutor_user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_tutor_assignments_classroom"
      ON "tutor_assignments" ("school_year", "grade", "section", "shift")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."IDX_tutor_assignments_classroom"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_tutor_assignments_tutor_user_id"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."UQ_tutor_assignments_user_classroom"',
    );
    await queryRunner.query('DROP TABLE "tutor_assignments"');

    await queryRunner.query(`
      ALTER TABLE "announcement_audiences"
      DROP CONSTRAINT "CHK_announcement_audiences_role"
    `);
    await queryRunner.query(`
      ALTER TABLE "announcement_audiences"
      ADD CONSTRAINT "CHK_announcement_audiences_role"
      CHECK ("role" IS NULL OR "role" IN ('director', 'secretary', 'auxiliary', 'student'))
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT "CHK_users_role"
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "CHK_users_role"
      CHECK ("role" IN ('director', 'secretary', 'auxiliary', 'student'))
    `);
  }
}
