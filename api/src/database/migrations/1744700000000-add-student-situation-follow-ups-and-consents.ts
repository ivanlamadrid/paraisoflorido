import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudentSituationFollowUpsAndConsents1744700000000 implements MigrationInterface {
  name = 'AddStudentSituationFollowUpsAndConsents1744700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "students"
      ADD COLUMN "image_consent_granted" boolean,
      ADD COLUMN "image_consent_recorded_at" timestamptz,
      ADD COLUMN "image_consent_recorded_by_user_id" uuid,
      ADD COLUMN "image_consent_observation" varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "students"
      ADD CONSTRAINT "FK_students_image_consent_recorded_by_user_id"
      FOREIGN KEY ("image_consent_recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE "student_contacts"
      ADD COLUMN "email" varchar(160),
      ADD COLUMN "is_authorized_to_coordinate" boolean NOT NULL DEFAULT false,
      ADD COLUMN "is_authorized_to_pick_up" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "student_enrollments"
      DROP CONSTRAINT "CHK_student_enrollments_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "student_enrollments"
      ADD COLUMN "movement_type" varchar(24) NOT NULL DEFAULT 'continuity',
      ADD COLUMN "administrative_detail" varchar(255),
      ADD COLUMN "status_changed_at" timestamptz,
      ADD COLUMN "status_changed_by_user_id" uuid
    `);
    await queryRunner.query(`
      UPDATE "student_enrollments"
      SET "status_changed_at" = COALESCE("updated_at", "created_at")
      WHERE "status_changed_at" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "student_enrollments"
      ADD CONSTRAINT "FK_student_enrollments_status_changed_by_user_id"
      FOREIGN KEY ("status_changed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "student_enrollments"
      ADD CONSTRAINT "CHK_student_enrollments_status"
      CHECK ("status" IN ('active', 'observed', 'promoted', 'graduated', 'withdrawn', 'transferred'))
    `);
    await queryRunner.query(`
      ALTER TABLE "student_enrollments"
      ADD CONSTRAINT "CHK_student_enrollments_movement_type"
      CHECK ("movement_type" IN ('continuity', 'new_admission', 'transfer_in', 'transfer_out', 'withdrawal'))
    `);

    await queryRunner.query(`
      CREATE TABLE "student_follow_ups" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "student_id" uuid NOT NULL,
        "author_user_id" uuid NOT NULL,
        "record_type" varchar(24) NOT NULL,
        "category" varchar(24),
        "incident_type" varchar(80),
        "recorded_at" date NOT NULL,
        "note" varchar(500) NOT NULL,
        "actions_taken" varchar(500),
        "status" varchar(20) NOT NULL,
        "external_reference" varchar(80),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_student_follow_ups_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_student_follow_ups_student_id"
          FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_student_follow_ups_author_user_id"
          FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_student_follow_ups_record_type"
          CHECK ("record_type" IN ('tutorial_note', 'incident')),
        CONSTRAINT "CHK_student_follow_ups_category"
          CHECK ("category" IS NULL OR "category" IN ('attendance', 'coexistence', 'family', 'risk', 'support')),
        CONSTRAINT "CHK_student_follow_ups_status"
          CHECK ("status" IN ('open', 'in_progress', 'closed'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_student_follow_ups_student_id_recorded_at"
      ON "student_follow_ups" ("student_id", "recorded_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_student_follow_ups_student_id_record_type_status"
      ON "student_follow_ups" ("student_id", "record_type", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_student_follow_ups_author_user_id_recorded_at"
      ON "student_follow_ups" ("author_user_id", "recorded_at")
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
          'student_created',
          'profile_updated',
          'enrollment_updated',
          'status_updated',
          'consent_updated',
          'contact_created',
          'contact_updated',
          'contact_deactivated'
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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

    await queryRunner.query(
      'DROP INDEX "public"."IDX_student_follow_ups_author_user_id_recorded_at"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_student_follow_ups_student_id_record_type_status"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_student_follow_ups_student_id_recorded_at"',
    );
    await queryRunner.query('DROP TABLE "student_follow_ups"');

    await queryRunner.query(`
      ALTER TABLE "student_enrollments"
      DROP CONSTRAINT "CHK_student_enrollments_movement_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "student_enrollments"
      DROP CONSTRAINT "CHK_student_enrollments_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "student_enrollments"
      DROP CONSTRAINT "FK_student_enrollments_status_changed_by_user_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "student_enrollments"
      DROP COLUMN "status_changed_by_user_id",
      DROP COLUMN "status_changed_at",
      DROP COLUMN "administrative_detail",
      DROP COLUMN "movement_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "student_enrollments"
      ADD CONSTRAINT "CHK_student_enrollments_status"
      CHECK ("status" IN ('active', 'promoted', 'graduated', 'withdrawn', 'transferred'))
    `);

    await queryRunner.query(`
      ALTER TABLE "student_contacts"
      DROP COLUMN "is_authorized_to_pick_up",
      DROP COLUMN "is_authorized_to_coordinate",
      DROP COLUMN "email"
    `);

    await queryRunner.query(`
      ALTER TABLE "students"
      DROP CONSTRAINT "FK_students_image_consent_recorded_by_user_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "students"
      DROP COLUMN "image_consent_observation",
      DROP COLUMN "image_consent_recorded_by_user_id",
      DROP COLUMN "image_consent_recorded_at",
      DROP COLUMN "image_consent_granted"
    `);
  }
}
