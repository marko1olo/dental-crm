/**
 * perioSideEffectsEngine.ts — Распространение протоколов в дневник визита, смету и склад.
 * Архитектурный слой Layer 2: Side-effects Engine (Мандат 8b, <= 120 строк).
 */

import {
	generateComprehensivePerio043Text,
	type PerioChartSummary,
	type PerioToothRecord,
	type ToothClinicalServicePayload,
} from "@dental/shared";
import { useVisitStore } from "../../../store/visitStore";
import { showToast } from "../../GlobalToast";
import { deductPeriodontalConsumablesSoftOverdraft } from "./perioConsumables";
import type { PresetApplyResult } from "./perioPresetTypes";

export function dispatchPresetSideEffects(
	result: PresetApplyResult,
	onInsertToProtocol?: (text: string) => void,
): void {
	const { protocolText, service } = result;

	useVisitStore.getState().setVisitNoteForm((prev) => ({
		...prev,
		objectiveStatus: prev.objectiveStatus ? `${prev.objectiveStatus}\n\n${protocolText}` : protocolText,
	}));

	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: { soap: protocolText, mode: "smart_append" },
			}),
		);
		if (service) {
			window.dispatchEvent(
				new CustomEvent("dente-add-estimate-service", { detail: service }),
			);
		}
		if (result.title.toLowerCase().includes("гигиен")) {
			void deductPeriodontalConsumablesSoftOverdraft("hygiene");
		} else if (
			result.title.toLowerCase().includes("тяжел") ||
			result.title.toLowerCase().includes("средн") ||
			result.title.toLowerCase().includes("пародонтит")
		) {
			void deductPeriodontalConsumablesSoftOverdraft("curettage");
		}
	}

	if (onInsertToProtocol) onInsertToProtocol(protocolText);
	if (typeof navigator !== "undefined" && navigator.clipboard) {
		void navigator.clipboard.writeText(protocolText);
	}

	showToast(`Статус зафиксирован: «${result.title}». Протокол перенесён в дневник приёма.`, "success", 4500);
}

export function generatePerioProtocolText(
	teeth: readonly PerioToothRecord[],
	summary: PerioChartSummary,
	doctorName?: string,
	customNotes?: string,
): string {
	return generateComprehensivePerio043Text(teeth, summary, {
		doctorName: doctorName ?? undefined,
		patientAgeYears: 45,
		customNotes: customNotes ?? undefined,
	});
}

export function buildPeriodontalTreatmentPlanJustification(affectedTeeth: PerioToothRecord[]): {
	planText: string;
	prophyService: ToothClinicalServicePayload;
	curettageServices: ToothClinicalServicePayload[];
} {
	const teethLabels = affectedTeeth.map((t) => `#${t.toothNumber}`).join(", ");
	const planText =
		`• План пародонтологического лечения:\n` +
		`1. Комплексная профессиональная гигиена полости рта (A16.07.051): ультразвуковое удаление зубных отложений, воздушно-абразивная обработка Air-Flow, полировка абразивной пастой, глубокое фторирование эмали.\n` +
		`2. Закрытый кюретаж пародонтальных карманов (A16.07.011) в области зубов: ${teethLabels}.\n` +
		`3. Обучение индивидуальной гигиене полости рта, подбор ершиков, контрольное зондирование через 4-6 недель.`;

	const prophyService: ToothClinicalServicePayload = {
		serviceId: "hygiene_prophy_804n",
		code804n: "A16.07.051",
		code: "A16.07.051",
		name: "Профессиональная гигиена полости рта и зубов",
		priceRub: 5500, price: 5500, priceKopecks: 550000, quantity: 1, category: "hygiene",
	};

	const curettageServices: ToothClinicalServicePayload[] = affectedTeeth.map((tooth) => ({
		serviceId: `curettage_tooth_${tooth.toothNumber}`,
		code804n: "A16.07.011",
		code: "A16.07.011",
		toothNumber: tooth.toothNumber,
		toothCode: String(tooth.toothNumber),
		name: `Закрытый кюретаж пародонтального кармана (зуб #${tooth.toothNumber})`,
		priceRub: 1800, price: 1800, priceKopecks: 180000, quantity: 1, category: "parodontology",
	}));

	return { planText, prophyService, curettageServices };
}
