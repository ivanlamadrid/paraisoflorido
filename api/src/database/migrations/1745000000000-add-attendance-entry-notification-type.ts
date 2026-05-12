import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttendanceEntryNotificationType1745000000000 implements MigrationInterface {
  name = 'AddAttendanceEntryNotificationType1745000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
      DROP CONSTRAINT "CHK_notifications_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "CHK_notifications_type"
      CHECK ("type" IN ('attendance_marked', 'attendance_entry_marked', 'announcement_published', 'system_test'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
      DROP CONSTRAINT "CHK_notifications_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "CHK_notifications_type"
      CHECK ("type" IN ('attendance_marked', 'announcement_published', 'system_test'))
    `);
  }
}
