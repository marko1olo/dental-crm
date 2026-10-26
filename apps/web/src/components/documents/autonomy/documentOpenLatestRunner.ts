import { showToast } from "../../GlobalToast";

export interface OpenLatestDocumentAutonomyParams {
	activeUsableDocuments?: Array<{ id: string; status?: string } | null | undefined> | null | undefined;
	typedActiveDocuments?: Array<{ id: string; status?: string } | null | undefined> | null | undefined;
	openIssuedDocumentHtml: (id: string) => void | Promise<void>;
	showToastFn?: ((message: string, type: "info" | "success" | "warning" | "error") => void) | undefined;
}

export function executeOpenLatestDocumentAutonomy(
	params: OpenLatestDocumentAutonomyParams,
): {
	executed: boolean;
	documentId?: string;
} {
	const show = params.showToastFn ?? showToast;
	const candidate =
		params.activeUsableDocuments?.[0] ||
		params.typedActiveDocuments?.find((d) => d && d.status !== "voided") ||
		params.typedActiveDocuments?.[0];

	if (candidate?.id) {
		void params.openIssuedDocumentHtml(candidate.id);
		return { executed: true, documentId: candidate.id };
	}

	show(
		"У пациента нет созданных документов. Нажмите «+ Создать документ» для выбора согласия, медкарты или договора",
		"info",
	);
	return { executed: false };
}

export function humanizeDocumentAuditText(value: string): string {
	return value
		.replace(/Официальная XSD-валидация/gi, "Официальная проверка формата ФНС")
		.replace(/XSD-валидация/gi, "проверка формата ФНС")
		.replace(/\bXSD\b/g, "формат ФНС")
		.replace(/КЭП/g, "электронная подпись")
		.replace(/ЭДО\/ТКС/g, "оператор отправки")
		.replace(/\bXML\b/g, "электронный файл");
}
