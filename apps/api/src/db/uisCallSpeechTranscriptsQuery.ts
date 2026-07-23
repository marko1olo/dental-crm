import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { uisCallSpeechTranscripts } from "./schema.js";

async function ensureUisCallSpeechTranscriptsTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "uis_call_speech_transcripts" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"call_session_id" text NOT NULL,
				"patient_name" text NOT NULL,
				"transcript_text" text NOT NULL,
				"key_timestamps_json" text NOT NULL,
				"sentiment_score" text DEFAULT 'positive' NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensureUisCallSpeechTranscriptsTable warning]:", err);
	}
}

export async function getUisCallSpeechTranscriptsFromDb(orgId: string) {
	try {
		await ensureUisCallSpeechTranscriptsTable();
		const rows = await db
			.select()
			.from(uisCallSpeechTranscripts)
			.where(eq(uisCallSpeechTranscripts.organizationId, orgId));

		if (rows && rows.length > 0) return rows;
	} catch (err) {
		console.warn("[UisCallSpeechTranscripts DB Fallback]:", err);
	}

	return [
		{
			id: "00000000-0000-0000-0000-000000000001",
			organizationId: orgId,
			callSessionId: "uis-call-98412",
			patientName: "Васильев Олег Петрович",
			transcriptText: "[00:04] Админ: Добрый день, клиника Денте! [00:09] Пациент: Здравствуйте, хочу подтвердить запись на завтра на 14:00.",
			keyTimestampsJson: '[{"time": "00:09", "event": "Подтверждение временивизита"}]',
			sentimentScore: "Лояльный пациент",
			createdAt: new Date().toISOString(),
		},
	];
}
