import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserNameParts1744500000000 implements MigrationInterface {
  name = 'AddUserNameParts1744500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "first_name" VARCHAR(80),
      ADD COLUMN "last_name" VARCHAR(120)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "last_name",
      DROP COLUMN "first_name"
    `);
  }
}
