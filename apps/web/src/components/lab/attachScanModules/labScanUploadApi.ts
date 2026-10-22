export async function uploadScanFile(
	orderId: string,
	file: File,
	detectedType: "stl" | "ply" | "photo",
): Promise<string> {
	// 1. Запрос Presigned URL из бэкенда Fastify
	const res = await fetch(`/api/lab/orders/${orderId}/scans/upload-url`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ fileName: file.name, fileSizeBytes: file.size }),
	});
	if (!res.ok) {
		const errData = await res.json().catch(() => null);
		throw new Error(errData?.message || "Ошибка получения URL загрузки скана");
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
		const errText = await uploadRes.text().catch(() => "");
		throw new Error(
			`Ошибка загрузки файла на сервер (${uploadRes.status}): ${errText || uploadRes.statusText}`,
		);
	}

	return downloadUrl;
}
