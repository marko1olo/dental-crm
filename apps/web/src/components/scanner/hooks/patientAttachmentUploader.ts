/**
 * patientAttachmentUploader.ts
 *
 * Dedicated helper for uploading patient document attachments to Fastify API.
 */

import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";

export async function uploadPatientAttachment(
	patientId: string,
	blob: Blob,
	presetTitle: string,
): Promise<void> {
	const ext = blob.type === "application/pdf" ? "pdf" : "jpg";
	const nowIso = new Date().toISOString().slice(0, 10);
	const fileName = `${presetTitle}_${nowIso}.${ext}`;
	const formData = new FormData();
	formData.append("file", blob, fileName);

	const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/attachments`, {
		method: "POST",
		headers: denteAdminSecretRequestHeaders(),
		body: formData,
	});

	if (!res.ok) {
		throw new Error(`Ошибка загрузки: ${res.status}`);
	}
}
