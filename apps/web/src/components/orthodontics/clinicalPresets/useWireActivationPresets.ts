import React from "react";
import { showToast } from "../../GlobalToast";
import type { OrthoClinicalPresetId, TargetArch } from "../orthoProtocolTypes";
import type { ArchwireMaterial, ArchwireSection } from "../OrthoArchwireSelector";
import type { BracketSlot } from "../OrthoBracketProtocolSection";

export interface WireActivationPresetActions {
	setActivePreset: (preset: OrthoClinicalPresetId | null) => void;
	setTargetArch: (arch: TargetArch) => void;
	setSelectedTeeth: React.Dispatch<React.SetStateAction<number[]>>;
	setBracketSlot: (slot: BracketSlot) => void;
	setBracketSystem: (system: string) => void;
	setArchwireMaterial: (material: ArchwireMaterial) => void;
	setArchwireSection: (section: ArchwireSection) => void;
	setSelectedActions: React.Dispatch<React.SetStateAction<string[]>>;
	setElasticScheme: (scheme: string) => void;
	setElasticSize: (size: string) => void;
	setElasticWear: (wear: string) => void;
	setNotes: React.Dispatch<React.SetStateAction<string>>;
}

export const FULL_DENTITION = [
	17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27,
	47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37,
];

export function useWireActivationPresets(actions: WireActivationPresetActions) {
	const handlePresetActivation = () => {
		actions.setActivePreset("activation");
		actions.setTargetArch("both");
		actions.setSelectedTeeth(FULL_DENTITION);
		actions.setBracketSlot("0.022");
		actions.setBracketSystem("damon_q2");
		actions.setArchwireMaterial("CuNiTi");
		actions.setArchwireSection(".016");
		actions.setSelectedActions(["ligature_change"]);
		actions.setElasticScheme("class_ii");
		actions.setElasticSize("kangaroo_1_4");
		actions.setElasticWear("22 часа/сутки");
		actions.setNotes(
			"Плановый визит по графику ортодонтического лечения. Дуги сохранены без деформаций. Выполнена замена эластических лигатур, активация замков брекетов. Межчелюстная тяга скорректирована. Жалоб на острую боль и отклейку брекетов нет. Гигиена полости рта удовлетворительная.",
		);
		showToast("Пресет: Плановая активация применен", "info");
	};

	const handlePresetWireChange = () => {
		actions.setActivePreset("wire_change");
		actions.setTargetArch("both");
		actions.setSelectedTeeth(FULL_DENTITION);
		actions.setBracketSlot("0.022");
		actions.setBracketSystem("damon_q2");
		actions.setArchwireMaterial("NiTi");
		actions.setArchwireSection(".016");
		actions.setSelectedActions(["wire_change", "ligature_change"]);
		actions.setElasticScheme("none");
		actions.setNotes(
			"Плановая смена дуг на этапе нивелирования и юстировки. Установлены новые круглые никель-титановые дуги NiTi: верхняя челюсть .016\", нижняя челюсть .014\". Концы дуг подогнуты и зашлифованы, травма слизистой оболочки исключена. Замки закрыты со щелчком. Аппаратура стабильна.",
		);
		showToast("Пресет: Замена ортодонтической дуги (NiTi / ТМА / Сталь) применен", "info");
	};

	const handlePresetLeveling = () => {
		actions.setActivePreset("leveling");
		actions.setTargetArch("both");
		actions.setSelectedTeeth(FULL_DENTITION);
		actions.setBracketSlot("0.022");
		actions.setBracketSystem("damon_q2");
		actions.setArchwireMaterial("CuNiTi");
		actions.setArchwireSection(".016x.022");
		actions.setSelectedActions(["wire_change_leveling", "ligature_change", "elastics"]);
		actions.setElasticScheme("class_ii");
		actions.setElasticSize("fox_1_4");
		actions.setElasticWear("22 часа/сутки");
		actions.setNotes(
			"Плановое нивелирование зубных рядов. Произведена замена дуг: верхняя челюсть — NiTi .014\", нижняя челюсть — CuNiTi .016x.022\". Наложена эластическая межчелюстная тяга Class II (эластики Лиса 1/4\" 3.5 oz, ношение 22 ч/сут). Замки закрыты со щелчком, концы дуг загнуты. Гигиена удовлетворительная, болевой синдром купирован.",
		);
		showToast("Пресет: Плановое нивелирование (NiTi .014 ВЧ + CuNiTi .016x.022 НЧ + тяга Class II) применен", "info");
	};

	const handlePresetSprings = () => {
		actions.setActivePreset("springs");
		actions.setTargetArch("both");
		actions.setSelectedTeeth(FULL_DENTITION);
		actions.setBracketSlot("0.022");
		actions.setBracketSystem("damon_q2");
		actions.setArchwireMaterial("SS");
		actions.setArchwireSection(".019x.025");
		actions.setSelectedActions(["spring_activation", "ligature_change"]);
		actions.setNotes(
			"Активация пружин ортодонтической аппаратуры. Установлена раскрывающая нитиноловая пружина Open-Coil Spring (сжатие на 1.5 мм для создания места в зубном ряду) / закрывающая пружина Closed-Coil Spring на жесткой стальной дуге SS .019x.025\". Фиксация лигатурами Кобаяши. Контроль окклюзии.",
		);
		showToast("Пресет: Активация пружин (Open/Closed Coil) применен", "info");
	};

	const handlePresetSeparationRings = () => {
		actions.setActivePreset("separation");
		actions.setTargetArch("both");
		actions.setSelectedTeeth([16, 26, 36, 46]);
		actions.setSelectedActions(["separation_rings"]);
		actions.setNotes(
			"Установка межзубных эластических сепараторов (сепарационные кольца) в области первых и вторых моляров верхней и нижней челюстей (16, 26, 36, 46) для раскрытия контактов под ортодонтические кольца/бандажи. Пациент проинструктирован, выдан ортодонтический воск. Назначен контрольный визит через 5 дней.",
		);
		showToast("Пресет: Сепарация под бандажные кольца применен", "info");
	};

	return {
		handlePresetActivation,
		handlePresetWireChange,
		handlePresetLeveling,
		handlePresetSprings,
		handlePresetSeparationRings,
	};
}
