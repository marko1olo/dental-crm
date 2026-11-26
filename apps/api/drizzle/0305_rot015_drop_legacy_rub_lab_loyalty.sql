-- Финальное закрытие ROT-015: перенос остаточных значений и удаление legacy *Rub колонок в ЗТЛ, лояльности и прайсе ЗП
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'lab_orders' AND column_name = 'price_rub'
	) THEN
		UPDATE "lab_orders"
		SET "price_kopecks" = ROUND("price_rub" * 100)::bigint
		WHERE "price_kopecks" = 0 AND "price_rub" IS NOT NULL AND "price_rub" <> 0;
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'lab_orders' AND column_name = 'lab_cost_rub'
	) THEN
		UPDATE "lab_orders"
		SET "lab_cost_kopecks" = ROUND("lab_cost_rub" * 100)::bigint
		WHERE "lab_cost_kopecks" = 0 AND "lab_cost_rub" IS NOT NULL AND "lab_cost_rub" <> 0;
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'lab_items' AND column_name = 'price_rub'
	) THEN
		UPDATE "lab_items"
		SET "price_kopecks" = ROUND("price_rub" * 100)::bigint
		WHERE "price_kopecks" = 0 AND "price_rub" IS NOT NULL AND "price_rub" <> 0;
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'referral_campaigns' AND column_name = 'min_first_spend_threshold_rub'
	) THEN
		UPDATE "referral_campaigns"
		SET "min_first_spend_threshold_kopecks" = ROUND("min_first_spend_threshold_rub" * 100)::bigint
		WHERE "min_first_spend_threshold_kopecks" = 0 AND "min_first_spend_threshold_rub" IS NOT NULL;
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'patient_referrals' AND column_name = 'qualifying_amount_rub'
	) THEN
		UPDATE "patient_referrals"
		SET "qualifying_amount_kopecks" = ROUND("qualifying_amount_rub" * 100)::bigint
		WHERE "qualifying_amount_kopecks" IS NULL AND "qualifying_amount_rub" IS NOT NULL;
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'gift_certificates' AND column_name = 'nominal_rub'
	) THEN
		UPDATE "gift_certificates"
		SET "nominal_kopecks" = ROUND("nominal_rub" * 100)::bigint
		WHERE "nominal_kopecks" = 0 AND "nominal_rub" IS NOT NULL AND "nominal_rub" <> 0;
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'gift_certificates' AND column_name = 'initial_balance_rub'
	) THEN
		UPDATE "gift_certificates"
		SET "initial_balance_kopecks" = ROUND("initial_balance_rub" * 100)::bigint
		WHERE "initial_balance_kopecks" = 0 AND "initial_balance_rub" IS NOT NULL AND "initial_balance_rub" <> 0;
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'gift_certificates' AND column_name = 'current_balance_rub'
	) THEN
		UPDATE "gift_certificates"
		SET "current_balance_kopecks" = ROUND("current_balance_rub" * 100)::bigint
		WHERE "current_balance_kopecks" = 0 AND "current_balance_rub" IS NOT NULL AND "current_balance_rub" <> 0;
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'pricelist_doctor_payrolls' AND column_name = 'price_rub'
	) THEN
		UPDATE "pricelist_doctor_payrolls"
		SET "price_kopecks" = ROUND("price_rub" * 100)::bigint
		WHERE "price_kopecks" = 0 AND "price_rub" IS NOT NULL AND "price_rub" <> 0;
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'pricelist_doctor_payrolls' AND column_name = 'doctor_payroll_rub'
	) THEN
		UPDATE "pricelist_doctor_payrolls"
		SET "doctor_payroll_kopecks" = ROUND("doctor_payroll_rub" * 100)::bigint
		WHERE "doctor_payroll_kopecks" = 0 AND "doctor_payroll_rub" IS NOT NULL AND "doctor_payroll_rub" <> 0;
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'pricelist_doctor_payrolls' AND column_name = 'clinic_margin_rub'
	) THEN
		UPDATE "pricelist_doctor_payrolls"
		SET "clinic_margin_kopecks" = ROUND("clinic_margin_rub" * 100)::bigint
		WHERE "clinic_margin_kopecks" = 0 AND "clinic_margin_rub" IS NOT NULL AND "clinic_margin_rub" <> 0;
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "lab_orders"
	DROP COLUMN IF EXISTS "price_rub",
	DROP COLUMN IF EXISTS "lab_cost_rub";
--> statement-breakpoint
ALTER TABLE "lab_items"
	DROP COLUMN IF EXISTS "price_rub";
--> statement-breakpoint
ALTER TABLE "referral_campaigns"
	DROP COLUMN IF EXISTS "min_first_spend_threshold_rub";
--> statement-breakpoint
ALTER TABLE "patient_referrals"
	DROP COLUMN IF EXISTS "qualifying_amount_rub";
--> statement-breakpoint
ALTER TABLE "gift_certificates"
	DROP COLUMN IF EXISTS "nominal_rub",
	DROP COLUMN IF EXISTS "initial_balance_rub",
	DROP COLUMN IF EXISTS "current_balance_rub";
--> statement-breakpoint
ALTER TABLE "pricelist_doctor_payrolls"
	DROP COLUMN IF EXISTS "price_rub",
	DROP COLUMN IF EXISTS "doctor_payroll_rub",
	DROP COLUMN IF EXISTS "clinic_margin_rub";
