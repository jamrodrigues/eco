import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261018131423 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "franchise_unit" ("id" text not null, "name" text not null, "city" text not null, "state" text not null, "cep_prefix_start" text not null, "cep_prefix_end" text not null, "stock_location_id" text not null, "recipient_pagarme_id" text null, "commission_rate" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "franchise_unit_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_franchise_unit_deleted_at" ON "franchise_unit" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "franchise_unit" cascade;`);
  }

}
