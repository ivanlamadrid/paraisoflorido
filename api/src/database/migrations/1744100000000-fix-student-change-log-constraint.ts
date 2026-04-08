import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixStudentChangeLogConstraint1744100000000 implements MigrationInterface {
  name = 'FixStudentChangeLogConstraint1744100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "student_change_logs"
      DROP CONSTRAINT "CHK_student_change_logs_change_type"
    `);

    await queryRunner.query(`
      ALTER TABLE "student_change_logs"
      ADD CONSTRAINT "CHK_student_change_logs_change_type"
      CHECK (
        "change_type" IN (
          'student_created',
          'profile_updated',
          'enrollment_updated',
          'status_updated'
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "student_change_logs"
      WHERE "change_type" = 'student_created'
    `);

    await queryRunner.query(`
      ALTER TABLE "student_change_logs"
      DROP CONSTRAINT "CHK_student_change_logs_change_type"
    `);

    await queryRunner.query(`
      ALTER TABLE "student_change_logs"
      ADD CONSTRAINT "CHK_student_change_logs_change_type"
      CHECK (
        "change_type" IN (
          'profile_updated',
          'enrollment_updated',
          'status_updated'
        )
      )
    `);
  }
}
