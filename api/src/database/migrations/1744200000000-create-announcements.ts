import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnnouncements1744200000000 implements MigrationInterface {
  name = 'CreateAnnouncements1744200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "announcements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar(160) NOT NULL,
        "summary" varchar(280) NOT NULL,
        "body" text NOT NULL,
        "type" varchar(32) NOT NULL,
        "priority" varchar(16) NOT NULL DEFAULT 'normal',
        "status" varchar(16) NOT NULL DEFAULT 'draft',
        "is_pinned" boolean NOT NULL DEFAULT false,
        "scheduled_at" timestamptz,
        "published_at" timestamptz,
        "visible_from" timestamptz,
        "visible_until" timestamptz,
        "created_by_user_id" uuid NOT NULL,
        "published_by_user_id" uuid,
        "archived_by_user_id" uuid,
        "archived_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_announcements_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_announcements_created_by_user_id" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_announcements_published_by_user_id" FOREIGN KEY ("published_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_announcements_archived_by_user_id" FOREIGN KEY ("archived_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_announcements_type" CHECK ("type" IN ('institutional', 'administrative', 'academic', 'attendance')),
        CONSTRAINT "CHK_announcements_priority" CHECK ("priority" IN ('normal', 'important', 'urgent')),
        CONSTRAINT "CHK_announcements_status" CHECK ("status" IN ('draft', 'scheduled', 'published', 'archived'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_announcements_status_created_at"
      ON "announcements" ("status", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_announcements_published_at"
      ON "announcements" ("published_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_announcements_scheduled_at"
      ON "announcements" ("scheduled_at")
    `);

    await queryRunner.query(`
      CREATE TABLE "announcement_links" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "announcement_id" uuid NOT NULL,
        "label" varchar(120) NOT NULL,
        "url" varchar(500) NOT NULL,
        "sort_order" smallint NOT NULL DEFAULT 0,
        CONSTRAINT "PK_announcement_links_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_announcement_links_announcement_id" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_announcement_links_announcement_id_sort_order"
      ON "announcement_links" ("announcement_id", "sort_order")
    `);

    await queryRunner.query(`
      CREATE TABLE "announcement_audiences" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "announcement_id" uuid NOT NULL,
        "audience_type" varchar(32) NOT NULL,
        "role" varchar(32),
        "school_year" smallint,
        "grade" smallint,
        "section" varchar(10),
        "shift" varchar(20),
        "student_id" uuid,
        CONSTRAINT "PK_announcement_audiences_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_announcement_audiences_announcement_id" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_announcement_audiences_student_id" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_announcement_audiences_type" CHECK ("audience_type" IN ('all', 'all_students', 'all_staff', 'role', 'student_grade', 'student_classroom', 'student_shift', 'student')),
        CONSTRAINT "CHK_announcement_audiences_role" CHECK ("role" IS NULL OR "role" IN ('director', 'secretary', 'auxiliary', 'student')),
        CONSTRAINT "CHK_announcement_audiences_shift" CHECK ("shift" IS NULL OR "shift" IN ('morning', 'afternoon'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_announcement_audiences_announcement_id"
      ON "announcement_audiences" ("announcement_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_announcement_audiences_student_target"
      ON "announcement_audiences" ("audience_type", "school_year", "grade", "section", "shift")
    `);

    await queryRunner.query(`
      CREATE TABLE "announcement_reads" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "announcement_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "first_read_at" timestamptz NOT NULL,
        "last_read_at" timestamptz NOT NULL,
        CONSTRAINT "PK_announcement_reads_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_announcement_reads_announcement_id" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_announcement_reads_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_announcement_reads_announcement_user"
      ON "announcement_reads" ("announcement_id", "user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_announcement_reads_user_id_last_read_at"
      ON "announcement_reads" ("user_id", "last_read_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."IDX_announcement_reads_user_id_last_read_at"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."UQ_announcement_reads_announcement_user"',
    );
    await queryRunner.query('DROP TABLE "announcement_reads"');
    await queryRunner.query(
      'DROP INDEX "public"."IDX_announcement_audiences_student_target"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_announcement_audiences_announcement_id"',
    );
    await queryRunner.query('DROP TABLE "announcement_audiences"');
    await queryRunner.query(
      'DROP INDEX "public"."IDX_announcement_links_announcement_id_sort_order"',
    );
    await queryRunner.query('DROP TABLE "announcement_links"');
    await queryRunner.query(
      'DROP INDEX "public"."IDX_announcements_scheduled_at"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_announcements_published_at"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_announcements_status_created_at"',
    );
    await queryRunner.query('DROP TABLE "announcements"');
  }
}
