import pg from "pg";

const client = new pg.Client({
	connectionString: process.env.DATABASE_URL || "postgres://dental:dental@127.0.0.1:5432/dental_crm",
});

async function main() {
	await client.connect();

	console.log("Ensuring patient_recalls and portal_budget_tokens/budgets tables...");

	await client.query(`
		CREATE TABLE IF NOT EXISTS patient_recalls (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			organization_id UUID NOT NULL REFERENCES organizations(id),
			patient_id UUID NOT NULL REFERENCES patients(id),
			doctor_id UUID REFERENCES users(id),
			appointment_id UUID REFERENCES appointments(id),
			scheduled_appointment_id UUID REFERENCES appointments(id),
			reason TEXT NOT NULL DEFAULT 'Плановый профилактический осмотр и гигиена',
			cohort_type TEXT NOT NULL DEFAULT 'hygiene_therapy',
			status VARCHAR(32) NOT NULL DEFAULT 'pending',
			due_date TIMESTAMPTZ NOT NULL,
			completed_at TIMESTAMPTZ,
			channel TEXT,
			notes TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_patient_recalls_org_patient ON patient_recalls(organization_id, patient_id);
		CREATE INDEX IF NOT EXISTS idx_patient_recalls_status ON patient_recalls(organization_id, status);
		CREATE INDEX IF NOT EXISTS idx_patient_recalls_due_date ON patient_recalls(organization_id, due_date);

		CREATE TABLE IF NOT EXISTS portal_budget_tokens (
			token VARCHAR(128) PRIMARY KEY,
			plan_id UUID,
			organization_id UUID NOT NULL REFERENCES organizations(id),
			patient_id UUID NOT NULL REFERENCES patients(id),
			doctor_id UUID REFERENCES users(id),
			status VARCHAR(32) NOT NULL DEFAULT 'sent',
			clinic_name TEXT NOT NULL,
			clinic_phone TEXT,
			clinic_address TEXT,
			doctor_name TEXT NOT NULL,
			patient_first_name TEXT NOT NULL,
			patient_phone TEXT,
			patient_birth_date TEXT,
			auth_method VARCHAR(32) NOT NULL DEFAULT 'phone_last4',
			verbal_pin_hash TEXT,
			items JSONB NOT NULL DEFAULT '[]'::jsonb,
			total_price_rub NUMERIC(12, 2) NOT NULL DEFAULT 0,
			discount_rub NUMERIC(12, 2) NOT NULL DEFAULT 0,
			net_total_rub NUMERIC(12, 2) NOT NULL DEFAULT 0,
			currency VARCHAR(8) NOT NULL DEFAULT 'RUB',
			failed_attempts INTEGER NOT NULL DEFAULT 0,
			total_failures INTEGER NOT NULL DEFAULT 0,
			is_locked BOOLEAN NOT NULL DEFAULT FALSE,
			locked_until TIMESTAMPTZ,
			viewed_at TIMESTAMPTZ,
			signed_at TIMESTAMPTZ,
			signer_name TEXT,
			document_hash TEXT,
			signature JSONB,
			valid_until TIMESTAMPTZ,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_portal_budget_tokens_plan_id ON portal_budget_tokens(plan_id);
		CREATE INDEX IF NOT EXISTS idx_portal_budget_tokens_patient_id ON portal_budget_tokens(patient_id);
		CREATE INDEX IF NOT EXISTS idx_portal_budget_tokens_org_id ON portal_budget_tokens(organization_id);
	`);

	const res = await client.query(`
		SELECT table_name FROM information_schema.tables 
		WHERE table_schema = 'public' 
		AND table_name IN ('treatment_plans', 'patient_recalls', 'portal_budget_tokens');
	`);
	console.log("Verified database tables:", res.rows.map((r: { table_name: string }) => r.table_name));

	await client.end();
}

main().catch((err) => {
	console.error("Migration error:", err);
	process.exit(1);
});
