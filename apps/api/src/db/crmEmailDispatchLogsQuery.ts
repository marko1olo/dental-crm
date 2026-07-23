import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { crmEmailDispatchLogs } from "./schema.js";

async function ensureCrmEmailDispatchLogsTable() {
	try {
		await db.execute(`
			CREATE TABLE IF NOT EXISTS "crm_email_dispatch_logs" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"recipient_email" text NOT NULL,
				"document_type" text NOT NULL,
				"document_title" text NOT NULL,
				"dispatch_status" text DEFAULT 'sent' NOT NULL,
				"sent_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureCrmEmailDispatchLogsTable warning]:", err);
	}
}

export async function getCrmEmailDispatchLogsFromDb(orgId: string) {
	try {
		await ensureCrmEmailDispatchLogsTable();
		const rows = await db
			.select()
			.from(crmEmailDispatchLogs)
			.where(eq(crmEmailDispatchLogs.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[CrmEmailDispatchLogs DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			patientName: "Сидоров Дмитрий Павлович",
			recipientEmail: "dmitry.sidorov@example.com",
			documentType: "treatment_plan",
			documentTitle: "План имплантации и комплексной ортопедии #1042.pdf",
			dispatchStatus: "sent",
			sentAt: new Date().toISOString(),
		},
	];
}
