import { responseErrorMessage } from "../../../AppHelpers";
import type { PdfLoadResult } from "./types";

export async function loadIssuedPdfBase64(documentId: string): Promise<PdfLoadResult> {
	let response: Response;
	try {
		response = await fetch(`/api/documents/${documentId}/pdf`);
	} catch {
		return {
			ok: false,
			reason: "Печатная копия документа не получена: сервер клиники не отвечает. Проверьте подключение и повторите.",
		};
	}
	if (!response.ok) {
		const reason = await responseErrorMessage(response, "Печатная копия документа не получена");
		return {
			ok: false,
			reason: `${reason}. Подписать УКЭП можно только выданный документ с отметкой о подписании: сначала выдайте документ, затем повторите подписание.`,
		};
	}
	const blob = await response.blob();
	return await new Promise<PdfLoadResult>((resolve) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			const result = String(reader.result ?? "");
			const separator = result.indexOf(",");
			if (separator < 0) {
				resolve({
					ok: false,
					reason: "Печатная копия документа получена, но прочитать её не удалось. Откройте документ, проверьте, что печатная форма открывается, и повторите подписание.",
				});
				return;
			}
			resolve({ ok: true, base64: result.slice(separator + 1) });
		};
		reader.onerror = () =>
			resolve({
				ok: false,
				reason: "Печатная копия документа получена, но прочитать её не удалось. Повторите подписание, а если отказ повторится — сообщите администратору клиники.",
			});
		reader.readAsDataURL(blob);
	});
}
