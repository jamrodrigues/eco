import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261018183318 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "user_role" drop constraint if exists "user_role_user_id_unique";`);
    this.addSql(`alter table if exists "role" drop constraint if exists "role_slug_unique";`);
    this.addSql(`create table if not exists "maintenance_settings" ("id" text not null, "is_enabled" boolean not null default false, "message" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "maintenance_settings_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_maintenance_settings_deleted_at" ON "maintenance_settings" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "role" ("id" text not null, "slug" text not null, "name" text not null, "permissions" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "role_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_role_slug_unique" ON "role" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_role_deleted_at" ON "role" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "user_role" ("id" text not null, "user_id" text not null, "role_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "user_role_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_role_user_id_unique" ON "user_role" ("user_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_user_role_deleted_at" ON "user_role" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "maintenance_settings" cascade;`);

    this.addSql(`drop table if exists "role" cascade;`);

    this.addSql(`drop table if exists "user_role" cascade;`);
  }

}
