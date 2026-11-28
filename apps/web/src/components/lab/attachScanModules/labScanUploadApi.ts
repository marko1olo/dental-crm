import { generateUuidV7 } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";

export async function uploadScanFile(
	orderId: string,
	file: File,
	detectedType: "stl" | "ply" | "photo",
): Promise<string> {
	// 1. Запрос Presigned URL из бэкенда Fastify
	const res = await fetch(`/api/lab/orders/${orderId}/scans/upload-url`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Idempotency-Key": generateUuidV7(),
			...denteClinicalMutationHeaders(),
		},
		body: JSON.stringify({ fileName: file.name, fileSizeBytes: file.size }),
	});
	if (!res.ok) {
		let errMessage = `Ошибка получения URL загрузки скана (HTTP ${res.status})`;
		try {
			const errData = (await res.json()) as { message?: string };
			if (errData?.message) errMessage = errData.message;
		} catch (parseErr) {
			clientLogger.warn("[labScanUploadApi] Failed to parse upload-url error JSON", parseErr);
		}
		throw new Error(errMessage);
	}
	const presigned = await res.json();
	const uploadUrl: string = presigned.uploadUrl;
	const downloadUrl: string = presigned.downloadUrl || uploadUrl;
	const headers: Record<string, string> = presigned.headersToInclude || {
		"Content-Type":
			file.type ||
			(detectedType === "ply"
				? "model/ply"
				: detectedType === "stl"
					? "model/stl"
					: "application/octet-stream"),
	};

	// 2. Честная прямая бинарная загрузка PUT
	const uploadRes = await fetch(uploadUrl, {
		method: "PUT",
		headers,
		body: file,
	});
	if (!uploadRes.ok) {
		let errText = "";
		try {
			errText = await uploadRes.text();
		} catch (readErr) {
			clientLogger.warn("[labScanUploadApi] Failed to read PUT upload error body", readErr);
		}
		throw new Error(
			`Ошибка загрузки файла на сервер (${uploadRes.status}): ${errText || uploadRes.statusText}`,
		);
	}

	return downloadUrl;
}
