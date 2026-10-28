/**
 * Misch Bone Density Clinical Guidance & Insertion Torque Protocols
 * Clinical standards: Misch CE (2008), ITI Consensus, Buser.
 * Mandate 8b (<= 200 lines).
 */

import type { BoneClass } from "@dental/shared";

export interface MischClinicalGuidance {
	readonly boneClass: BoneClass | "D5" | "unmeasured";
	readonly huRange: string;
	readonly boneTypeRu: string;
	readonly anatomicalLocationRu: string;
	readonly recommendedTorqueNcm: string;
	readonly torqueMinNcm: number;
	readonly torqueMaxNcm: number;
	readonly drillingProtocolRu: string;
	readonly riskWarningRu: string;
	readonly isUnderdrillingAllowed: boolean;
	readonly isCondensationRequired: boolean;
}

/**
 * Returns clinical Misch bone density profile with exact insertion torque guidelines and risks.
 * Clinical Standards:
 * - D1 (> 1250 HU): 35-45 N*cm (risk of bone overheating, underdrilling excluded, copious irrigation 4°C).
 * - D2 (850..1250 HU): 35-45 N*cm (risk of bone overheating, underdrilling excluded, copious irrigation).
 * - D3 (350..850 HU): 25-35 N*cm (standard / mild condensation).
 * - D4 (150..350 HU): 25-35 N*cm (bone condensation protocol, risk of insufficient primary stability).
 */
export function getMischClinicalGuidance(
	boneClassOrHU: BoneClass | string | number | null | undefined,
): MischClinicalGuidance {
	let cls = "unmeasured";

	if (typeof boneClassOrHU === "number") {
		if (boneClassOrHU > 1250) cls = "D1";
		else if (boneClassOrHU >= 850) cls = "D2";
		else if (boneClassOrHU >= 350) cls = "D3";
		else if (boneClassOrHU >= 150) cls = "D4";
		else cls = "D5";
	} else if (typeof boneClassOrHU === "string") {
		cls = boneClassOrHU.trim().toUpperCase();
	}

	switch (cls) {
		case "D1":
			return {
				boneClass: "D1",
				huRange: "> 1250 HU",
				boneTypeRu: "Плотная кортикальная кость",
				anatomicalLocationRu: "Передний отдел нижней челюсти (симфиз)",
				recommendedTorqueNcm: "35–45 Н·см",
				torqueMinNcm: 35,
				torqueMaxNcm: 45,
				drillingProtocolRu: "Протокол недопрепарирования исключен, нарезание резьбы метчиком на всю глубину, обильная ирригация стерильным физраствором 4°C",
				riskWarningRu: "Риск перегрева кости (термонекроз при сверлении), протокол недопрепарирования исключен, обильная ирригация",
				isUnderdrillingAllowed: false,
				isCondensationRequired: false,
			};
		case "D2":
			return {
				boneClass: "D2",
				huRange: "850–1250 HU",
				boneTypeRu: "Плотная пористая кость (губчатая + кортикальная)",
				anatomicalLocationRu: "Нижняя челюсть, боковые отделы; передний отдел верхней челюсти",
				recommendedTorqueNcm: "35–45 Н·см",
				torqueMinNcm: 35,
				torqueMaxNcm: 45,
				drillingProtocolRu: "Стандартный хирургический протокол, протокол недопрепарирования исключен, обильная ирригация",
				riskWarningRu: "Риск перегрева кости, протокол недопрепарирования исключен, обильная ирригация",
				isUnderdrillingAllowed: false,
				isCondensationRequired: false,
			};
		case "D3":
			return {
				boneClass: "D3",
				huRange: "350–850 HU",
				boneTypeRu: "Тонкая пористая кость",
				anatomicalLocationRu: "Верхняя челюсть; боковые отделы нижней челюсти",
				recommendedTorqueNcm: "25–35 Н·см",
				torqueMinNcm: 25,
				torqueMaxNcm: 35,
				drillingProtocolRu: "Щадящее препарирование без кортикального метчика, умеренная компрессия кости",
				riskWarningRu: "Умеренная первичная стабильность",
				isUnderdrillingAllowed: true,
				isCondensationRequired: false,
			};
		case "D4":
			return {
				boneClass: "D4",
				huRange: "150–350 HU",
				boneTypeRu: "Мягкая губчатая кость",
				anatomicalLocationRu: "Бугры верхней челюсти",
				recommendedTorqueNcm: "25–35 Н·см",
				torqueMinNcm: 25,
				torqueMaxNcm: 35,
				drillingProtocolRu: "Протокол конденсации кости (остеотомы / биконденсация), недопрепарирование ложа (under-drilling)",
				riskWarningRu: "Протокол конденсации кости, риск недостаточной первичной стабильности",
				isUnderdrillingAllowed: true,
				isCondensationRequired: true,
			};
		case "D5":
			return {
				boneClass: "D5",
				huRange: "< 150 HU",
				boneTypeRu: "Экстремально мягкая кость / дефицит минерализации",
				anatomicalLocationRu: "Зоны недавней экстракции, выраженная атрофия",
				recommendedTorqueNcm: "< 15 Н·см",
				torqueMinNcm: 5,
				torqueMaxNcm: 15,
				drillingProtocolRu: "Прямая имплантация противопоказана без предварительной остеопластики (GBR)",
				riskWarningRu: "Высокий риск дезинтеграции, первичная стабильность не гарантирована",
				isUnderdrillingAllowed: true,
				isCondensationRequired: true,
			};
		case "unmeasured":
		default:
			return {
				boneClass: "unmeasured",
				huRange: "Не измерялась",
				boneTypeRu: "Не определено (требуется КЛКТ)",
				anatomicalLocationRu: "Требуется исследование КЛКТ",
				recommendedTorqueNcm: "—",
				torqueMinNcm: 0,
				torqueMaxNcm: 0,
				drillingProtocolRu: "Стандартный хирургический протокол (ожидает данных КЛКТ)",
				riskWarningRu: "Параметры плотности кости не измерены",
				isUnderdrillingAllowed: false,
				isCondensationRequired: false,
			};
	}
}
