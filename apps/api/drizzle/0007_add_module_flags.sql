ALTER TABLE "organizations" ADD COLUMN "has_payroll_module" boolean DEFAULT true NOT NULL;
ALTER TABLE "organizations" ADD COLUMN "has_marketing_module" boolean DEFAULT true NOT NULL;
ALTER TABLE "organizations" ADD COLUMN "has_analytics_module" boolean DEFAULT true NOT NULL;
ALTER TABLE "organizations" ADD COLUMN "has_inventory_module" boolean DEFAULT true NOT NULL;