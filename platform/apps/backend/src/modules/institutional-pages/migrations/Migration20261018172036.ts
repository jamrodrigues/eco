import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261018172036 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "institutional_page" drop constraint if exists "institutional_page_slug_unique";`);
    this.addSql(`create table if not exists "institutional_page" ("id" text not null, "slug" text not null, "title" text not null, "body" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "institutional_page_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_institutional_page_slug_unique" ON "institutional_page" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_institutional_page_deleted_at" ON "institutional_page" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "institutional_page" cascade;`);
  }

}
