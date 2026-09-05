/**
 * DENTE CRM — Standard Radiology Protocols for Outpatient Form 043/y (Mandate 8e, 8i, 8k, 8n)
 *
 * Provides instantaneous 1-click clinical radiology conclusions:
 * 1. Рентген-норма
 * 2. Периодонтит (периапикальный очаг)
 * 3. Контроль обтурации каналов
 * 4. Маргинальная резорбция кости (пародонтит)
 *
 * Features:
 * - Immediate insertion into Form 043/y visit diary via CustomEvent "dente-apply-soap-protocol"
 * - Automatic update of visit note form state in visitStore
 * - Direct clipboard write for legacy or desktop external EHRs
 * - Support for FDI tooth scope formatting without altering the canonical protocol text
 */

import { showToast } from "../GlobalToast.js";
import { useVisitStore } from "../../store/visitStore.js";

export interface RadiologyProtocolPreset {
	readonly id: string;
	readonly titleRu: string;
	readonly shortLabel: string;
	readonly text: string;
	readonly category: "norma" | "periodontitis" | "endo_control" | "resorption";
}

/**
 * 4 канонических стандарта рентгенологического протокола (Мандат 8e п. 11, 8i, 8k)
 */
export const RADIOLOGY_STANDARD_PROTOCOLS: readonly RadiologyProtocolPreset[] = [
	{
		id: "norma",
		titleRu: "Рентген-норма",
		shortLabel: "Норма",
		text: "Рентген-норма: периапикальные ткани без патологических изменений, кортикальная пластинка интактна, периодонтальная щель равномерная, деструкции костной ткани нет",
		category: "norma",
	},
	{
		id: "periodontitis",
		titleRu: "Периодонтит (периапикальный очаг)",
		shortLabel: "Периодонтит",
		text: "Периодонтит (периапикальный очаг): деструкция костной ткани с нечеткими контурами у верхушки корня (разрежение кости), расширение периодонтальной щели",
		category: "periodontitis",
	},
	{
		id: "endo_control",
		titleRu: "Контроль обтурации каналов",
		shortLabel: "Контроль обтурации",
		text: "Контроль обтурации каналов: корневой канал запломбирован плотно гомогенно на всем протяжении до физиологического апекса, выведения материала за верхушку нет",
		category: "endo_control",
	},
	{
		id: "resorption",
		titleRu: "Маргинальная резорбция кости (пародонтит)",
		shortLabel: "Резорбция кости",
		text: "Маргинальная резорбция кости (пародонтит): горизонтальная/вертикальная резорбция межальвеолярных перегородок на 1/3 или 1/2 длины корня",
		category: "resorption",
	},
] as const;

export interface FormatRadiologyProtocolOptions {
	toothFdi?: string | number | undefined;
	teethFdi?: readonly (string | number)[] | undefined;
	modalityLabel?: string | undefined;
}

/**
 * Форматирует протокол с учетом зубов и модальности
 */
export function formatRadiologyProtocolStatement(
	protocol: RadiologyProtocolPreset | string,
	options?: FormatRadiologyProtocolOptions,
): string {
	const baseText = typeof protocol === "string" ? protocol : protocol.text;
	const teeth =
		options?.teethFdi && options.teethFdi.length > 0
			? options.teethFdi.map(String).join(", ")
			: options?.toothFdi
				? String(options.toothFdi).trim()
				: "";
	const modality = options?.modalityLabel?.trim();

	const prefixParts: string[] = [];
	if (modality) {
		prefixParts.push(modality);
	}
	if (teeth) {
		prefixParts.push(`область зубов: ${teeth}`);
	}

	if (prefixParts.length === 0) {
		return baseText;
	}

	return `[${prefixParts.join(" · ")}] ${baseText}`;
}

export interface ApplyRadiologyProtocolParams {
	protocol: RadiologyProtocolPreset | string;
	options?: FormatRadiologyProtocolOptions;
	onInsertToProtocol?: ((text: string) => void) | undefined;
	copyToClipboard?: boolean;
	showNotification?: boolean;
}

/**
 * 1-клик вставка стандартного рентген-протокола в дневник Формы 043/у (Мандат 8e п. 11)
 * Не требует всплывающих модалок, сохраняет автономию врача и скорость работы.
 */
export function applyRadiologyProtocolToForm043(
	params: ApplyRadiologyProtocolParams,
): string {
	const statement = formatRadiologyProtocolStatement(
		params.protocol,
		params.options,
	);

	// 1. Диспетчеризация глобального события для useVisitDiaryLogic
	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							statusLocalis: statement,
							treatmentDescription: statement,
						},
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
		} catch {
			// ignore in testing environments without CustomEvent
		}
	}

	// 2. Обновление формы визита в visitStore
	try {
		useVisitStore.getState().setVisitNoteForm((prev) => {
			const current = prev.objectiveStatus || "";
			const updated = current.trim()
				? `${current.trim()}\n${statement}`
				: statement;
			return { ...prev, objectiveStatus: updated };
		});
	} catch {
		// outside visit store context
	}

	// 3. Вызов коллбека родительского компонента, если передан
	if (params.onInsertToProtocol) {
		try {
			params.onInsertToProtocol(statement);
		} catch {
			// ignore
		}
	}

	// 4. Копирование в буфер обмена для внешних МИС
	if (
		params.copyToClipboard !== false &&
		typeof navigator !== "undefined" &&
		navigator.clipboard?.writeText
	) {
		navigator.clipboard.writeText(statement).catch(() => {});
	}

	// 5. Тактильное уведомление врача
	if (params.showNotification !== false) {
		const label =
			typeof params.protocol === "string"
				? "Протокол рентгенодиагностики"
				: `«${params.protocol.titleRu}»`;
		showToast(`${label} внесен в дневник 043/у`, "success", 3500);
	}

	return statement;
}
