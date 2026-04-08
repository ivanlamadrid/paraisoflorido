import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttendanceRecords1743700000000 implements MigrationInterface {
  name = 'CreateAttendanceRecords1743700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "attendance_records" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "student_id" uuid NOT NULL,
        "attendance_date" date NOT NULL,
        "mark_type" varchar(20) NOT NULL,
        "source" varchar(20) NOT NULL,
        "marked_at" timestamptz NOT NULL,
        "recorded_by_user_id" uuid NOT NULL,
        "school_year" smallint NOT NULL,
        "grade" smallint NOT NULL,
        "section" varchar(10) NOT NULL,
        "shift" varchar(20) NOT NULL,
        "observation" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance_records_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_attendance_records_student_id" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_attendance_records_recorded_by_user_id" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_attendance_records_mark_type" CHECK ("mark_type" IN ('entry', 'exit')),
        CONSTRAINT "CHK_attendance_records_source" CHECK ("source" IN ('qr', 'manual')),
        CONSTRAINT "CHK_attendance_records_grade" CHECK ("grade" BETWEEN 1 AND 5),
        CONSTRAINT "CHK_attendance_records_shift" CHECK ("shift" IN ('morning', 'afternoon'))
      )
    `);

    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_attendance_records_student_id_attendance_date_mark_type" ON "attendance_records" ("student_id", "attendance_date", "mark_type")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_attendance_records_student_id_attendance_date" ON "attendance_records" ("student_id", "attendance_date")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_attendance_records_attendance_date_grade_section_shift" ON "attendance_records" ("attendance_date", "grade", "section", "shift")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_attendance_records_recorded_by_user_id_created_at" ON "attendance_records" ("recorded_by_user_id", "created_at")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."IDX_attendance_records_recorded_by_user_id_created_at"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_attendance_records_attendance_date_grade_section_shift"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_attendance_records_student_id_attendance_date"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."UQ_attendance_records_student_id_attendance_date_mark_type"',
    );
    await queryRunner.query('DROP TABLE "attendance_records"');
  }
}
