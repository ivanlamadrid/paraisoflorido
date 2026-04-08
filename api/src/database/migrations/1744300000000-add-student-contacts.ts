import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudentContacts1744300000000 implements MigrationInterface {
  name = 'AddStudentContacts1744300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "student_contacts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "student_id" uuid NOT NULL,
        "full_name" varchar(160) NOT NULL,
        "relationship" varchar(80) NOT NULL,
        "phone_primary" varchar(30) NOT NULL,
        "phone_secondary" varchar(30),
        "address" varchar(255),
        "is_primary" boolean NOT NULL DEFAULT false,
        "is_emergency_contact" boolean NOT NULL DEFAULT false,
        "notes" varchar(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_student_contacts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_student_contacts_student_id" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_student_contacts_student_id_is_active"
      ON "student_contacts" ("student_id", "is_active")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_student_contacts_student_id_is_primary"
      ON "student_contacts" ("student_id", "is_primary")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."IDX_student_contacts_student_id_is_primary"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_student_contacts_student_id_is_active"',
    );
    await queryRunner.query('DROP TABLE "student_contacts"');
  }
}
