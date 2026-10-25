import React from "react";
import { showToast } from "../../GlobalToast";
import type { TargetArch } from "../orthoProtocolTypes";

export interface LabOrderPresetActions {
	patientName: string;
	selectedTeeth: number[];
	isSplitArchAligners: boolean;
	alignerStep: number;
	alignerTotal: number;
	alignerStepUpper: number;
	alignerTotalUpper: number;
	alignerStepLower: number;
	alignerTotalLower: number;
	targetArch: TargetArch;
	setActivePreset: (preset: null) => void;
	setNotes: React.Dispatch<React.SetStateAction<string>>;
}

function dispatchLabOrder(payload: Record<string, unknown>) {
	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent("dente-lab-order-created", { detail: payload }));
	}
}

export function useLabOrderPresets(actions: LabOrderPresetActions) {
	const handlePresetAlignerLabOrder = () => {
		actions.setActivePreset(null);
		const orderNumber = `ЗТЛ-ОРТО-${Date.now().toString().slice(-6)}`;
		const stepInfo = actions.isSplitArchAligners
			? `ВЧ: каппа ${actions.alignerStepUpper} из ${actions.alignerTotalUpper}, НЧ: каппа ${actions.alignerStepLower} из ${actions.alignerTotalLower}`
			: `каппа ${actions.alignerStep} из ${actions.alignerTotal}`;

		dispatchLabOrder({
			orderNumber,
			createdAt: new Date().toISOString(),
			teeth: actions.selectedTeeth.length > 0 ? actions.selectedTeeth.map(String) : ["17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "37", "36", "35", "34", "33", "32", "31", "41", "42", "43", "44", "45", "46", "47"],
			jawScope: actions.targetArch === "upper" ? "upper" : actions.targetArch === "lower" ? "lower" : "both",
			constructionType: "aligner_nightguard",
			prostheticTypeId: "orthodontic_aligners_set",
			material: "aligner_polyurethane_duran",
			doctorNotes: `Наряд ЗТЛ на элайнеры (${stepInfo}). Пациент: ${actions.patientName}. Срок: 5-7 раб. дней.`,
			overrideActive: true,
			overrideReason: "Прямое создание наряда ЗТЛ ортодонтом",
		});
		actions.setNotes(`Сняты оттиски (3D сканирование) для изготовления элайнеров (${stepInfo}). Сформирован наряд ЗТЛ №${orderNumber}.`);
		showToast(`Наряд ЗТЛ №${orderNumber} на элайнеры (${stepInfo}) отправлен!`, "success", 4000);
	};

	const handlePresetRetainerLabOrder = () => {
		actions.setActivePreset(null);
		const orderNumber = `ЗТЛ-ОРТО-${Date.now().toString().slice(-6)}`;
		dispatchLabOrder({
			orderNumber,
			createdAt: new Date().toISOString(),
			teeth: actions.selectedTeeth.length > 0 ? actions.selectedTeeth.map(String) : ["13", "12", "11", "21", "22", "23", "33", "32", "31", "41", "42", "43"],
			jawScope: actions.targetArch === "upper" ? "upper" : actions.targetArch === "lower" ? "lower" : "both",
			constructionType: "splint_nightguard",
			prostheticTypeId: "orthodontic_retention_splint",
			material: "aligner_polyurethane_duran",
			doctorNotes: `Наряд ЗТЛ на ретенционный аппарат. Пациент: ${actions.patientName}.`,
			overrideActive: true,
			overrideReason: "Прямое создание наряда ЗТЛ ортодонтом",
		});
		actions.setNotes(`Сняты сканы для ретенционного аппарата. Сформирован наряд ЗТЛ №${orderNumber}.`);
		showToast(`Наряд ЗТЛ №${orderNumber} на ретенционный аппарат отправлен!`, "success", 4000);
	};

	const handlePresetPlateLabOrder = () => {
		actions.setActivePreset(null);
		const orderNumber = `ЗТЛ-ОРТО-${Date.now().toString().slice(-6)}`;
		dispatchLabOrder({
			orderNumber,
			createdAt: new Date().toISOString(),
			teeth: actions.selectedTeeth.length > 0 ? actions.selectedTeeth.map(String) : ["16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26"],
			jawScope: actions.targetArch === "lower" ? "lower" : "upper",
			constructionType: "removable_plates",
			prostheticTypeId: "orthodontic_expansion_plate",
			material: "orthodontic_acrylic_leocryl",
			doctorNotes: `Наряд ЗТЛ на пластинку с расширяющим винтом. Пациент: ${actions.patientName}.`,
			overrideActive: true,
			overrideReason: "Прямое создание наряда ЗТЛ ортодонтом",
		});
		actions.setNotes(`Сняты оттиски для съемной пластинки с расширяющим винтом. Наряд ЗТЛ №${orderNumber}.`);
		showToast(`Наряд ЗТЛ №${orderNumber} на расширяющую пластинку отправлен!`, "success", 4000);
	};

	const handlePresetSplintLabOrder = () => {
		actions.setActivePreset(null);
		const orderNumber = `ЗТЛ-ОРТО-${Date.now().toString().slice(-6)}`;
		dispatchLabOrder({
			orderNumber,
			createdAt: new Date().toISOString(),
			teeth: actions.selectedTeeth.length > 0 ? actions.selectedTeeth.map(String) : ["17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "37", "36", "35", "34", "33", "32", "31", "41", "42", "43", "44", "45", "46", "47"],
			jawScope: actions.targetArch === "upper" ? "upper" : actions.targetArch === "lower" ? "lower" : "both",
			constructionType: "splint_nightguard",
			prostheticTypeId: "orthodontic_tmj_splint",
			material: "aligner_polyurethane_duran",
			doctorNotes: `Наряд ЗТЛ на шину ВНЧС (депрограмматор). Пациент: ${actions.patientName}.`,
			overrideActive: true,
			overrideReason: "Прямое создание наряда ЗТЛ ортодонтом",
		});
		actions.setNotes(`Сняты оптические сканы для изготовления окклюзионного сплита/шины ВНЧС. Сформирован наряд ЗТЛ №${orderNumber}.`);
		showToast(`Наряд ЗТЛ №${orderNumber} на шину ВНЧС отправлен!`, "success", 4000);
	};

	return {
		handlePresetAlignerLabOrder,
		handlePresetRetainerLabOrder,
		handlePresetPlateLabOrder,
		handlePresetSplintLabOrder,
	};
}
