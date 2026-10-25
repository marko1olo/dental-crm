import React from "react";
import { showToast } from "../../GlobalToast";
import type { OrthoClinicalPresetId, TargetArch } from "../orthoProtocolTypes";

export interface AlignerPresetActions {
	patientName: string;
	setActivePreset: (preset: OrthoClinicalPresetId | null) => void;
	setTargetArch: (arch: TargetArch) => void;
	setBracketSystem: (system: string) => void;
	setSelectedActions: React.Dispatch<React.SetStateAction<string[]>>;
	setSelectedTeeth: React.Dispatch<React.SetStateAction<number[]>>;
	setNotes: React.Dispatch<React.SetStateAction<string>>;
}

export function useAlignerPresets(actions: AlignerPresetActions) {
	const handlePresetAlignerScan = () => {
		actions.setActivePreset("aligner_scan");
		actions.setTargetArch("both");
		actions.setBracketSystem("aligners");
		actions.setSelectedActions(["aligner_scan"]);
		const orderNumber = `ЗТЛ-СКАН-${Date.now().toString().slice(-6)}`;
		const labPayload = {
			orderNumber,
			createdAt: new Date().toISOString(),
			teeth: ["17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "37", "36", "35", "34", "33", "32", "31", "41", "42", "43", "44", "45", "46", "47"],
			jawScope: "both",
			constructionType: "aligner_nightguard",
			prostheticTypeId: "orthodontic_aligners_set",
			material: "aligner_polyurethane_duran",
			doctorNotes: `3D интраоральное сканирование для элайнеров. Пациент: ${actions.patientName}.`,
			overrideActive: true,
			overrideReason: "Снятие слепков / 3D-сканирование под элайнеры",
		};
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente-lab-order-created", { detail: labPayload }));
		}
		actions.setNotes(`Снятие 3D-сканов под комплект элайнеров. Наряд ЗТЛ №${orderNumber}.`);
		showToast("Пресет: Снятие слепков / 3D-сканирование под элайнеры применен", "success");
	};

	const handlePresetAlignerTrays1To4 = () => {
		actions.setActivePreset("aligner_trays_1_4");
		actions.setTargetArch("both");
		actions.setBracketSystem("aligners");
		actions.setSelectedActions(["aligner_trays_1_4"]);
		actions.setSelectedTeeth([15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45]);
		actions.setNotes(
			"Клинический этап сдачи элайнеров: выполнена выдача капп 1-4 + фиксация композитных аттачментов на клыки и премоляры (15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45) по переносной матрице. Адаптация каппы №1 плотная, ретенция надежная. Пациент обучен правилам ношения (22 ч/сутки, смена каждые 14 дней) и использованию чувисов.",
		);
		showToast("Пресет: Выдача капп 1-4 + аттачменты применен", "success");
	};

	const handlePresetAlignerTrays5To8 = () => {
		actions.setActivePreset("aligner_trays_5_8");
		actions.setTargetArch("both");
		actions.setBracketSystem("aligners");
		actions.setSelectedActions(["aligner_trays_5_8"]);
		actions.setNotes(
			"Контрольный осмотр и прогресс элайнеров: трекинг зубов на каппах 1-4 полный, нестыковок и зазоров между режущим краем и каппой нет, аттачменты сохранны. Выдан следующий сет капп 5-8 (режим 22 ч/сутки, смена каждые 14 дней). Назначен следующий контрольный осмотр.",
		);
		showToast("Пресет: Выдача капп 5-8 элайнеров применен", "success");
	};

	return {
		handlePresetAlignerScan,
		handlePresetAlignerTrays1To4,
		handlePresetAlignerTrays5To8,
	};
}
