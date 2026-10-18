import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261018173413 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "coin_settings" ("id" text not null, "coins_per_real" integer not null default 100, "cashback_percent" integer not null default 0, "max_redeem_per_order" integer not null default 450, "expiration_days" integer null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "coin_settings_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_coin_settings_deleted_at" ON "coin_settings" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "coin_transaction" ("id" text not null, "customer_id" text not null, "amount" integer not null, "type" text check ("type" in ('purchase_cashback', 'signup_bonus', 'review_bonus', 'referral_bonus', 'redeemed', 'expired', 'manual_admin_adjust')) not null, "reference_id" text null, "expires_at" timestamptz null, "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "coin_transaction_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_coin_transaction_deleted_at" ON "coin_transaction" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "coin_settings" cascade;`);

    this.addSql(`drop table if exists "coin_transaction" cascade;`);
  }

}
