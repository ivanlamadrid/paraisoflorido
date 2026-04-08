import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInstitutionSettingsAndAnnualStudents1743800000000 implements MigrationInterface {
  name = 'AddInstitutionSettingsAndAnnualStudents1743800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "institution_settings" (
        "id" uuid NOT NULL,
        "school_name" varchar(160) NOT NULL,
        "active_school_year" smallint NOT NULL,
        "initial_student_password_hash" text NOT NULL,
        "enabled_turns" varchar(20) array NOT NULL,
        "enabled_grades" smallint array NOT NULL,
        "sections_by_grade" jsonb NOT NULL,
        "initial_student_password_updated_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_institution_settings_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_institution_settings_active_school_year" CHECK ("active_school_year" BETWEEN 2000 AND 2100)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "student_enrollments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "student_id" uuid NOT NULL,
        "school_year" smallint NOT NULL,
        "grade" smallint NOT NULL,
        "section" varchar(10) NOT NULL,
        "shift" varchar(20) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_student_enrollments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_student_enrollments_student_id" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_student_enrollments_school_year" CHECK ("school_year" BETWEEN 2000 AND 2100),
        CONSTRAINT "CHK_student_enrollments_grade" CHECK ("grade" BETWEEN 1 AND 5),
        CONSTRAINT "CHK_student_enrollments_shift" CHECK ("shift" IN ('morning', 'afternoon')),
        CONSTRAINT "CHK_student_enrollments_status" CHECK ("status" IN ('active', 'promoted', 'graduated', 'withdrawn', 'transferred'))
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_student_enrollments_student_id_school_year"
      ON "student_enrollments" ("student_id", "school_year")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_student_enrollments_school_year_grade_section_shift"
      ON "student_enrollments" ("school_year", "grade", "section", "shift")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_student_enrollments_school_year_status_is_active"
      ON "student_enrollments" ("school_year", "status", "is_active")
    `);

    await queryRunner.query(`
      CREATE TABLE "student_change_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "student_id" uuid NOT NULL,
        "changed_by_user_id" uuid NOT NULL,
        "school_year" smallint,
        "change_type" varchar(40) NOT NULL,
        "previous_data" jsonb,
        "next_data" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_student_change_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_student_change_logs_student_id" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_student_change_logs_changed_by_user_id" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_student_change_logs_change_type" CHECK ("change_type" IN ('profile_updated', 'enrollment_updated', 'status_updated'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_student_change_logs_student_id_created_at"
      ON "student_change_logs" ("student_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_student_change_logs_changed_by_user_id_created_at"
      ON "student_change_logs" ("changed_by_user_id", "created_at")
    `);

    await queryRunner.query(`
      INSERT INTO "student_enrollments" (
        "student_id",
        "school_year",
        "grade",
        "section",
        "shift",
        "status",
        "is_active",
        "created_at",
        "updated_at"
      )
      SELECT
        "id",
        "school_year",
        "grade",
        "section",
        "shift",
        'active',
        "is_active",
        "created_at",
        "updated_at"
      FROM "students"
    `);

    await queryRunner.query(`
      ALTER TABLE "students"
      ADD COLUMN "document" varchar(20)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_students_document_unique"
      ON "students" ("document")
      WHERE "document" IS NOT NULL
    `);

    await queryRunner.query(
      'DROP INDEX "public"."IDX_students_school_year_grade_section_shift_is_active"',
    );

    await queryRunner.query(`
      ALTER TABLE "students"
      DROP COLUMN "grade",
      DROP COLUMN "section",
      DROP COLUMN "shift",
      DROP COLUMN "school_year"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "students"
      ADD COLUMN "grade" smallint NOT NULL DEFAULT 1,
      ADD COLUMN "section" varchar(10) NOT NULL DEFAULT 'A',
      ADD COLUMN "shift" varchar(20) NOT NULL DEFAULT 'morning',
      ADD COLUMN "school_year" smallint NOT NULL DEFAULT 2000
    `);

    await queryRunner.query(`
      UPDATE "students" AS "student"
      SET
        "school_year" = "enrollment"."school_year",
        "grade" = "enrollment"."grade",
        "section" = "enrollment"."section",
        "shift" = "enrollment"."shift"
      FROM (
        SELECT DISTINCT ON ("student_id")
          "student_id",
          "school_year",
          "grade",
          "section",
          "shift"
        FROM "student_enrollments"
        ORDER BY "student_id", "school_year" DESC
      ) AS "enrollment"
      WHERE "student"."id" = "enrollment"."student_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "students"
      ADD CONSTRAINT "CHK_students_grade" CHECK ("grade" BETWEEN 1 AND 5)
    `);
    await queryRunner.query(`
      ALTER TABLE "students"
      ADD CONSTRAINT "CHK_students_shift" CHECK ("shift" IN ('morning', 'afternoon'))
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_students_school_year_grade_section_shift_is_active"
      ON "students" ("school_year", "grade", "section", "shift", "is_active")
    `);

    await queryRunner.query(
      'DROP INDEX "public"."IDX_students_document_unique"',
    );
    await queryRunner.query(`
      ALTER TABLE "students"
      DROP COLUMN "document"
    `);

    await queryRunner.query(
      'DROP INDEX "public"."IDX_student_change_logs_changed_by_user_id_created_at"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_student_change_logs_student_id_created_at"',
    );
    await queryRunner.query('DROP TABLE "student_change_logs"');

    await queryRunner.query(
      'DROP INDEX "public"."IDX_student_enrollments_school_year_status_is_active"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_student_enrollments_school_year_grade_section_shift"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."UQ_student_enrollments_student_id_school_year"',
    );
    await queryRunner.query('DROP TABLE "student_enrollments"');

    await queryRunner.query('DROP TABLE "institution_settings"');
  }
}
