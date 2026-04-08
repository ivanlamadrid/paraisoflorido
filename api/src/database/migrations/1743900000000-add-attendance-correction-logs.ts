import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttendanceCorrectionLogs1743900000000 implements MigrationInterface {
  name = 'AddAttendanceCorrectionLogs1743900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "attendance_correction_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "attendance_record_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "attendance_date" date NOT NULL,
        "mark_type" varchar(20) NOT NULL,
        "reason" varchar(255) NOT NULL,
        "previous_data" jsonb NOT NULL,
        "next_data" jsonb NOT NULL,
        "corrected_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance_correction_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_attendance_correction_logs_attendance_record_id" FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_records"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_attendance_correction_logs_student_id" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_attendance_correction_logs_corrected_by_user_id" FOREIGN KEY ("corrected_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_attendance_correction_logs_mark_type" CHECK ("mark_type" IN ('entry', 'exit'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_correction_logs_attendance_record_id_created_at"
      ON "attendance_correction_logs" ("attendance_record_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_correction_logs_student_id_created_at"
      ON "attendance_correction_logs" ("student_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_attendance_correction_logs_corrected_by_user_id_created_at"
      ON "attendance_correction_logs" ("corrected_by_user_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."IDX_attendance_correction_logs_corrected_by_user_id_created_at"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_attendance_correction_logs_student_id_created_at"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_attendance_correction_logs_attendance_record_id_created_at"',
    );
    await queryRunner.query('DROP TABLE "attendance_correction_logs"');
  }
}
