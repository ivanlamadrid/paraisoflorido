import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudents1743600000000 implements MigrationInterface {
  name = 'CreateStudents1743600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "students" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "code" varchar(32) NOT NULL,
        "first_name" varchar(80) NOT NULL,
        "last_name" varchar(120) NOT NULL,
        "grade" smallint NOT NULL,
        "section" varchar(10) NOT NULL,
        "shift" varchar(20) NOT NULL,
        "school_year" smallint NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_students_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_students_user_id" UNIQUE ("user_id"),
        CONSTRAINT "UQ_students_code" UNIQUE ("code"),
        CONSTRAINT "FK_students_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_students_grade" CHECK ("grade" BETWEEN 1 AND 5),
        CONSTRAINT "CHK_students_shift" CHECK ("shift" IN ('morning', 'afternoon'))
      )
    `);

    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_students_user_id" ON "students" ("user_id")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_students_code" ON "students" ("code")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_students_school_year_grade_section_shift_is_active" ON "students" ("school_year", "grade", "section", "shift", "is_active")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_students_last_name_first_name" ON "students" ("last_name", "first_name")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."IDX_students_last_name_first_name"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_students_school_year_grade_section_shift_is_active"',
    );
    await queryRunner.query('DROP INDEX "public"."IDX_students_code"');
    await queryRunner.query('DROP INDEX "public"."IDX_students_user_id"');
    await queryRunner.query('DROP TABLE "students"');
  }
}
