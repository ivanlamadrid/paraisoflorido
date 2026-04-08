import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSchoolYearPreparationLogs1744800000000 implements MigrationInterface {
  name = 'AddSchoolYearPreparationLogs1744800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "school_year_preparation_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "prepared_from_school_year" smallint NOT NULL,
        "prepared_to_school_year" smallint NOT NULL,
        "performed_by_user_id" uuid NOT NULL,
        "reset_student_passwords" boolean NOT NULL DEFAULT false,
        "continued_students_count" integer NOT NULL DEFAULT 0,
        "graduated_students_count" integer NOT NULL DEFAULT 0,
        "skipped_students_count" integer NOT NULL DEFAULT 0,
        "passwords_reset_count" integer NOT NULL DEFAULT 0,
        "section_adjustments_count" integer NOT NULL DEFAULT 0,
        "shift_adjustments_count" integer NOT NULL DEFAULT 0,
        "summary" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_school_year_preparation_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_school_year_preparation_logs_performed_by_user_id"
          FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_school_year_preparation_logs_prepared_to_school_year_created_at"
      ON "school_year_preparation_logs" ("prepared_to_school_year", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_school_year_preparation_logs_performed_by_user_id_created_at"
      ON "school_year_preparation_logs" ("performed_by_user_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."IDX_school_year_preparation_logs_performed_by_user_id_created_at"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_school_year_preparation_logs_prepared_to_school_year_created_at"',
    );
    await queryRunner.query('DROP TABLE "school_year_preparation_logs"');
  }
}
