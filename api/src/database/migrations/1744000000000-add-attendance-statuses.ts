import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttendanceStatuses1744000000000 implements MigrationInterface {
  name = 'AddAttendanceStatuses1744000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "attendance_records"
      ADD COLUMN "status" varchar(32) NOT NULL DEFAULT 'regular'
    `);

    await queryRunner.query(`
      ALTER TABLE "attendance_records"
      ADD CONSTRAINT "CHK_attendance_records_status"
      CHECK ("status" IN ('regular', 'late', 'early_departure'))
    `);

    await queryRunner.query(`
      CREATE TABLE "attendance_day_statuses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "student_id" uuid NOT NULL,
        "attendance_date" date NOT NULL,
        "school_year" smallint NOT NULL,
        "grade" smallint NOT NULL,
        "section" varchar(10) NOT NULL,
        "shift" varchar(20) NOT NULL,
        "status_type" varchar(32) NOT NULL,
        "observation" varchar(255),
        "recorded_by_user_id" uuid NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "resolved_by_user_id" uuid,
        "resolved_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance_day_statuses_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_attendance_day_statuses_student_id" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_attendance_day_statuses_recorded_by_user_id" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_attendance_day_statuses_resolved_by_user_id" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_attendance_day_statuses_shift" CHECK ("shift" IN ('morning', 'afternoon')),
        CONSTRAINT "CHK_attendance_day_statuses_status_type" CHECK ("status_type" IN ('justified_absence', 'unjustified_absence'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_day_statuses_student_id_attendance_date"
      ON "attendance_day_statuses" ("student_id", "attendance_date")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_day_statuses_attendance_date_grade_section_shift"
      ON "attendance_day_statuses" ("attendance_date", "grade", "section", "shift")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_day_statuses_recorded_by_user_id_created_at"
      ON "attendance_day_statuses" ("recorded_by_user_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_attendance_day_statuses_student_id_attendance_date_active"
      ON "attendance_day_statuses" ("student_id", "attendance_date")
      WHERE "is_active" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."UQ_attendance_day_statuses_student_id_attendance_date_active"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_attendance_day_statuses_recorded_by_user_id_created_at"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_attendance_day_statuses_attendance_date_grade_section_shift"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_attendance_day_statuses_student_id_attendance_date"',
    );
    await queryRunner.query('DROP TABLE "attendance_day_statuses"');
    await queryRunner.query(
      'ALTER TABLE "attendance_records" DROP CONSTRAINT "CHK_attendance_records_status"',
    );
    await queryRunner.query(`
      ALTER TABLE "attendance_records"
      DROP COLUMN "status"
    `);
  }
}
