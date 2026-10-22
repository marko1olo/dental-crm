/**
 * implantDiarySoapBuilder.ts — синтез дневника приёма (SOAP), одонтограммы и расписания из КЛКТ.
 * Mandate 8b: Модульность, строго < 150 строк.
 * Mandate 8x & 8ap: Чистый медицинский язык без советских форм ("Медицинская карта приёма").
 * Mandate 8d: Ноль мультяшных эмодзи.
 */

import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";
import {
	type CtImplantBridgeParams,
	type ImplantDiarySoapPayload,
	type QuickScheduleDraftPayload,
	getImplantBrandTitle,
} from "./implantBridgeTypes";

/**
 * 1. Формирует клинический протокол планирования и операции для медицинской карты (SOAP).
 */
export function buildImplantDiarySoapEntry(params: CtImplantBridgeParams): ImplantDiarySoapPayload {
	const brandTitle = getImplantBrandTitle(params.implantSpec.brand);
	const diameterStr = params.implantSpec.diameterMm.toFixed(1);
	const lengthStr = params.implantSpec.lengthMm.toFixed(1);
	const tiltStr = params.angulationDeg !== 0 ? `${params.angulationDeg > 0 ? "+" : ""}${params.angulationDeg}°` : "0.0°";

	const hasH = typeof params.ridgeHeightMm === "number";
	const hasW = typeof params.ridgeWidthMm === "number";
	const hasW2 = typeof params.ridgeW2Mm === "number";
	const hasW6 = typeof params.ridgeW6Mm === "number";

	const ridgeLocalis =
		hasW2 && hasW6 && hasH
			? `морфометрия альвеолярного гребня: ширина W2 (на 2 мм апикальнее вершины) = ${params.ridgeW2Mm!.toFixed(1)} мм, базальная ширина W6 (на 6 мм) = ${params.ridgeW6Mm!.toFixed(1)} мм, высота кости H = ${params.ridgeHeightMm!.toFixed(1)} мм`
			: hasH && hasW
				? `высота альвеолярного гребня ${params.ridgeHeightMm!.toFixed(1)} мм, ширина ${params.ridgeWidthMm!.toFixed(1)} мм`
				: hasH
					? `высота альвеолярного гребня ${params.ridgeHeightMm!.toFixed(1)} мм, ширина не измерялась (—)`
					: hasW
						? `высота альвеолярного гребня не измерялась (—), ширина ${params.ridgeWidthMm!.toFixed(1)} мм`
						: "замеры альвеолярного гребня штангенциркулем не проводились (—)";

	const nerveLocalis =
		params.nerveClearanceMm !== null
			? `Расстояние от апекса до нижнечелюстного канала / дна верхнечелюстного синуса: ${params.nerveClearanceMm.toFixed(1)} мм.`
			: "дистанция до нижнечелюстного канала не измерялась (—) (Канал не размечен).";

	const sinusLiftPart = params.sinusLiftRecommendation ? ` Рекомендации по костной пластике: ${params.sinusLiftRecommendation}` : "";

	const statusLocalis =
		`КЛКТ-диагностика области отсутствующего зуба #${params.toothFdi}: ` +
		`${ridgeLocalis}. Тип архитектоники костной ткани по Misch: ` +
		`${params.mischClass ?? "не измерялась"} (${params.meanHU !== null ? `${params.meanHU} HU` : "не измерялась"}). ` +
		nerveLocalis +
		sinusLiftPart;

	const treatmentDescription =
		`Протокол 3D КЛКТ-планирования дентальной имплантации (зуб #${params.toothFdi}):\n` +
		`1. Выбрана имплантационная система: ${brandTitle}.\n` +
		`2. Геометрические параметры имплантата: диаметр Ø${diameterStr} мм, длина L=${lengthStr} мм, наклон оси ${tiltStr}.\n` +
		`3. Остеотомия ложа: ${params.drillingProtocol}.\n` +
		`4. Ожидаемый торк первичной стабильности: ${params.recommendedTorqueNcm}.\n` +
		(params.sinusLiftRecommendation ? `5. Костная пластика: ${params.sinusLiftRecommendation}\n6.` : "5.") +
		` Рекомендована установка формирователя десны / винта-заглушки с последующей интеграцией 3-4 мес.`;

	return { statusLocalis, treatmentDescription, diagnosisIcd10: "K08.1", diagnosisTooth: String(params.toothFdi) };
}

/**
 * 2. Экспорт замеров и протокола КТ в дневник визита / медкарту (1-клик):
 * - Генерирует SOAP протокол
 * - Диспатчит 'dente-apply-soap-protocol' с immediate: true
 * - Обновляет объективный статус в useVisitStore
 * - Вызывает опциональный callback
 */
export function exportImplantToDiary(
	params: CtImplantBridgeParams,
	onApplyCallback?: ((diaryText: string) => void) | undefined,
): ImplantDiarySoapPayload {
	const soap = buildImplantDiarySoapEntry(params);
	const fullProtocolText = `${soap.statusLocalis}\n\n${soap.treatmentDescription}`;

	try {
		const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
		if (typeof setVisitNoteForm === "function") {
			setVisitNoteForm((prev) => {
				const prevObj = prev.objectiveStatus || "";
				return {
					...prev,
					objectiveStatus: prevObj ? `${prevObj}\n\n${fullProtocolText}` : fullProtocolText,
					diagnosis: prev.diagnosis || `K08.1 Частичная потеря зубов (зуб #${params.toothFdi})`,
					diagnosisTooth: String(params.toothFdi),
				};
			});
		}
	} catch {
		// ignore
	}

	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							statusLocalis: soap.statusLocalis,
							treatmentDescription: soap.treatmentDescription,
							diagnosisIcd10: soap.diagnosisIcd10,
							diagnosisTooth: soap.diagnosisTooth,
						},
						immediate: true,
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// ignore
		}
	}

	if (onApplyCallback) {
		onApplyCallback(fullProtocolText);
	}

	showToast(
		`КТ-протокол имплантации (зуб #${params.toothFdi}) занесен в медицинскую карту приёма!`,
		"success",
		4000,
	);

	return soap;
}

/**
 * Обратная совместимость для устаревших вызовов с суффиксом 043 (Мандат 8ap)
 */
export const exportImplantToDiary043 = exportImplantToDiary;

/**
 * 3. Обновление зубной формулы (одонтограммы):
 * Ставит статус "Planned_Implant" на выбранный зуб.
 */
export function updateOdontogramToothToPlannedImplant(toothFdi: number): void {
	if (!toothFdi) return;

	try {
		const setToothState = useVisitStore.getState().setToothState;
		if (typeof setToothState === "function") {
			setToothState(String(toothFdi), "planned");
		}
	} catch {
		// ignore
	}

	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-update-tooth-state", {
					detail: {
						toothNumber: toothFdi,
						state: "Planned_Implant",
					},
				}),
			);
		} catch {
			// ignore
		}
	}
}

/**
 * 4. Экспорт в расписание (1-клик):
 * Создает быстрый черновик записи на операцию имплантации.
 */
export function exportImplantToScheduleDraft(params: CtImplantBridgeParams): QuickScheduleDraftPayload {
	const brandTitle = getImplantBrandTitle(params.implantSpec.brand);
	const hasH = typeof params.ridgeHeightMm === "number";
	const hasW = typeof params.ridgeWidthMm === "number";
	const ridgeDraftStr =
		hasH && hasW
			? `гребень H=${params.ridgeHeightMm!.toFixed(1)} мм, W=${params.ridgeWidthMm!.toFixed(1)} мм`
			: hasH
				? `гребень H=${params.ridgeHeightMm!.toFixed(1)} мм, W: — (не измерялась)`
				: hasW
					? `гребень H: — (не измерялась), W=${params.ridgeWidthMm!.toFixed(1)} мм`
					: "гребень: — (не измерялся)";

	const draft: QuickScheduleDraftPayload = {
		toothNumber: params.toothFdi,
		title: `Имплантация #${params.toothFdi} (${brandTitle})`,
		procedureName: `Внутрикостная дентальная имплантация ${brandTitle}`,
		durationMinutes: 60,
		stageKind: "stage_2_surgery",
		notes: `КЛКТ запланировано: ${ridgeDraftStr}, плотность ${params.mischClass}.`,
	};

	if (typeof window !== "undefined") {
		try {
			window.localStorage.setItem("dente_schedule_quick_booking_draft", JSON.stringify(draft));
			window.dispatchEvent(
				new CustomEvent("dente-quick-appointment-draft", {
					detail: draft,
				}),
			);
		} catch {
			// ignore
		}
	}

	showToast(
		`Черновик операции (зуб #${params.toothFdi}, 60 мин) отправлен в расписание!`,
		"success",
		4000,
	);

	return draft;
}
