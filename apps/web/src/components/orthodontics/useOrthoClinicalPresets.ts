import React from "react";
import { showToast } from "../GlobalToast";
import { ANTERIOR_TEETH, type TargetArch } from "./orthoProtocolTypes";
import type { BracketSlot } from "./OrthoBracketProtocolSection";
import type { ArchwireMaterial, ArchwireSection } from "./OrthoArchwireSelector";

export interface UseOrthoClinicalPresetsOptions {
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
	setActivePreset: (preset: "activation" | "wire_change" | "bonding" | "debonding" | null) => void;
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

export function useOrthoClinicalPresets({
	patientName,
	selectedTeeth,
	isSplitArchAligners,
	alignerStep,
	alignerTotal,
	alignerStepUpper,
	alignerTotalUpper,
	alignerStepLower,
	alignerTotalLower,
	targetArch,
	setActivePreset,
	setTargetArch,
	setSelectedTeeth,
	setBracketSlot,
	setBracketSystem,
	setArchwireMaterial,
	setArchwireSection,
	setSelectedActions,
	setElasticScheme,
	setElasticSize,
	setElasticWear,
	setNotes,
}: UseOrthoClinicalPresetsOptions) {
	const handlePresetActivation = () => {
		setActivePreset("activation");
		setTargetArch("both");
		setSelectedTeeth([
			17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27,
			47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37,
		]);
		setBracketSlot("0.022");
		setBracketSystem("damon_q2");
		setArchwireMaterial("CuNiTi");
		setArchwireSection(".016");
		setSelectedActions(["ligature_change"]);
		setElasticScheme("class_ii");
		setElasticSize("kangaroo_1_4");
		setElasticWear("22 часа/сутки");
		setNotes(
			"Плановый визит по графику ортодонтического лечения. Дуги сохранены без деформаций. Выполнена замена эластических лигатур, активация замков брекетов. Межчелюстная тяга скорректирована. Жалоб на острую боль и отклейку брекетов нет. Гигиена полости рта удовлетворительная.",
		);
		showToast("Пресет: Плановая активация применен", "info");
	};

	const handlePresetWireChange = () => {
		setActivePreset("wire_change");
		setTargetArch("both");
		setSelectedTeeth([
			17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27,
			47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37,
		]);
		setBracketSlot("0.022");
		setBracketSystem("damon_q2");
		setArchwireMaterial("NiTi");
		setArchwireSection(".016");
		setSelectedActions(["wire_change", "ligature_change"]);
		setElasticScheme("none");
		setNotes(
			"Плановая смена дуг на этапе нивелирования и юстировки. Установлены новые круглые никель-титановые дуги NiTi: верхняя челюсть .016\", нижняя челюсть .014\". Концы дуг подогнуты и зашлифованы, травма слизистой оболочки исключена. Замки закрыты со щелчком. Аппаратура стабильна.",
		);
		showToast("Пресет: Замена ортодонтической дуги (NiTi / ТМА / Сталь) применен", "info");
	};

	const handlePresetBonding = () => {
		setActivePreset("bonding");
		setTargetArch("upper");
		setSelectedTeeth([17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27]);
		setBracketSlot("0.022");
		setBracketSystem("damon_q2");
		setArchwireMaterial("NiTi");
		setArchwireSection(".014");
		setSelectedActions(["wire_change"]);
		setElasticScheme("none");
		setNotes(
			"Первичная прямая фиксация несъемной вестибулярной брекет-системы на верхнюю челюсть (сегменты 17-27). Протравливание эмали 37% ортофосфорной кислотой (30 сек), тщательное смывание, высушивание. Нанесение праймера, позиционирование брекетов по индивидуальной высоте, фотополимеризация. Введена первичная нивелирующая дуга NiTi .014\". Концы дуг отожжены и подогнуты. Проведен подробный инструктаж по уходу за брекетами и гигиене полости рта, выдан защитный воск.",
		);
		showToast("Пресет: Фиксация брекет-системы (ВЧ) применен", "info");
	};

	const handlePresetDebonding = () => {
		setActivePreset("debonding");
		setTargetArch("both");
		setSelectedTeeth(ANTERIOR_TEETH);
		setBracketSlot("0.022");
		setBracketSystem("damon_q2");
		setSelectedActions(["debonding"]);
		setElasticScheme("none");
		setNotes(
			"Окончание активного периода ортодонтического лечения. Атравматичное снятие брекет-системы специальными щипцами. Механическое удаление остатков композита твердосплавными финирами без повреждения эмали, полировка вестибулярных поверхностей. Фиксация несъемного проволочного ретейнера (флекс-дуга 0.0175\") на текучий композит в сегментах 13-23 и 33-43. Сняты оттиски/сканы для изготовления ретенционных капп. Окклюзия стабильна.",
		);
		showToast("Пресет: Снятие брекетов + ретейнер применен", "info");
	};

	const handlePresetAlignerLabOrder = () => {
		setActivePreset(null);
		const orderNumber = `ЗТЛ-ОРТО-${Date.now().toString().slice(-6)}`;
		const teethList =
			selectedTeeth.length > 0
				? selectedTeeth.map(String)
				: ["17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "37", "36", "35", "34", "33", "32", "31", "41", "42", "43", "44", "45", "46", "47"];

		const stepInfo = isSplitArchAligners
			? `ВЧ: каппа ${alignerStepUpper} из ${alignerTotalUpper}, НЧ: каппа ${alignerStepLower} из ${alignerTotalLower}`
			: `каппа ${alignerStep} из ${alignerTotal}`;

		const labOrderPayload = {
			orderNumber,
			createdAt: new Date().toISOString(),
			teeth: teethList,
			jawScope: targetArch === "upper" ? "upper" : targetArch === "lower" ? "lower" : "both",
			constructionType: "aligner_nightguard",
			prostheticTypeId: "orthodontic_aligners_set",
			material: "aligner_polyurethane_duran",
			doctorNotes: `Наряд ЗТЛ на элайнеры (${stepInfo}). Пациент: ${patientName}. Этап: ортодонтическая коррекция. Срок: 5-7 раб. дней.`,
			overrideActive: true,
			overrideReason: "Прямое создание наряда ЗТЛ ортодонтом",
		};

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-created", {
					detail: labOrderPayload,
				}),
			);
		}

		setNotes(
			`Сняты высокоточные оптические оттиски (3D интраоральное сканирование) для изготовления комплекта ортодонтических элайнеров (${stepInfo}). Сформирован наряд ЗТЛ №${orderNumber} (материал: полиуретан Duran / Zendura). План лечения активен.`,
		);
		showToast(`Наряд ЗТЛ №${orderNumber} на комплект элайнеров (${stepInfo}) успешно отправлен!`, "success", 4000);
	};

	const handlePresetRetainerLabOrder = () => {
		setActivePreset(null);
		const orderNumber = `ЗТЛ-ОРТО-${Date.now().toString().slice(-6)}`;
		const teethList =
			selectedTeeth.length > 0
				? selectedTeeth.map(String)
				: ["13", "12", "11", "21", "22", "23", "33", "32", "31", "41", "42", "43"];

		const labOrderPayload = {
			orderNumber,
			createdAt: new Date().toISOString(),
			teeth: teethList,
			jawScope: targetArch === "upper" ? "upper" : targetArch === "lower" ? "lower" : "both",
			constructionType: "splint_nightguard",
			prostheticTypeId: "orthodontic_retention_splint",
			material: "aligner_polyurethane_duran",
			doctorNotes: `Наряд ЗТЛ на ретенционный аппарат (ретенционная каппа / несъемный проволочный ретейнер). Пациент: ${patientName}. Срочная отправка в лабораторию.`,
			overrideActive: true,
			overrideReason: "Прямое создание наряда ЗТЛ ортодонтом",
		};

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-created", {
					detail: labOrderPayload,
				}),
			);
		}

		setNotes(
			`Сняты оттиски/сканы для изготовления ретенционного аппарата (ретенционная каппа / проволочный ретейнер). Сформирован наряд ЗТЛ №${orderNumber}. Ретенционный период начат.`,
		);
		showToast(`Наряд ЗТЛ №${orderNumber} на ретенционный аппарат отправлен!`, "success", 4000);
	};

	const handlePresetPlateLabOrder = () => {
		setActivePreset(null);
		const orderNumber = `ЗТЛ-ОРТО-${Date.now().toString().slice(-6)}`;
		const teethList =
			selectedTeeth.length > 0
				? selectedTeeth.map(String)
				: ["16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26"];

		const labOrderPayload = {
			orderNumber,
			createdAt: new Date().toISOString(),
			teeth: teethList,
			jawScope: targetArch === "lower" ? "lower" : "upper",
			constructionType: "removable_plates",
			prostheticTypeId: "orthodontic_expansion_plate",
			material: "orthodontic_acrylic_leocryl",
			doctorNotes: `Наряд ЗТЛ на съемный пластиночный аппарат с расширяющим винтом Бертони/Хааса. Пациент: ${patientName}. Срочная отправка в лабораторию.`,
			overrideActive: true,
			overrideReason: "Прямое создание наряда ЗТЛ ортодонтом",
		};

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-created", {
					detail: labOrderPayload,
				}),
			);
		}

		setNotes(
			`Сняты анатомические оттиски для изготовления съемного пластиночного аппарата с расширяющим винтом. Сформирован наряд ЗТЛ №${orderNumber} (материал: акрил Leocryl). Отправка в лабораторию.`,
		);
		showToast(`Наряд ЗТЛ №${orderNumber} на расширяющую пластинку отправлен!`, "success", 4000);
	};

	const handlePresetSplintLabOrder = () => {
		setActivePreset(null);
		const orderNumber = `ЗТЛ-ОРТО-${Date.now().toString().slice(-6)}`;
		const teethList =
			selectedTeeth.length > 0
				? selectedTeeth.map(String)
				: ["17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "37", "36", "35", "34", "33", "32", "31", "41", "42", "43", "44", "45", "46", "47"];

		const labOrderPayload = {
			orderNumber,
			createdAt: new Date().toISOString(),
			teeth: teethList,
			jawScope: targetArch === "upper" ? "upper" : targetArch === "lower" ? "lower" : "both",
			constructionType: "splint_nightguard",
			prostheticTypeId: "orthodontic_tmj_splint",
			material: "aligner_polyurethane_duran",
			doctorNotes: `Наряд ЗТЛ на окклюзионный сплинт / шину ВНЧС (миорелаксирующая / стабилизирующая шина). Пациент: ${patientName}. Этап: сплинт-терапия / депрограммация ВНЧС. Срок: 3-5 раб. дней.`,
			overrideActive: true,
			overrideReason: "Прямое создание наряда ЗТЛ ортодонтом",
		};

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-created", {
					detail: labOrderPayload,
				}),
			);
		}

		setNotes(
			`Сняты высокоточные оптические сканы/оттиски и регистрат центрального соотношения для изготовления окклюзионного сплита/шины ВНЧС (миорелаксирующий депрограмматор). Сформирован наряд ЗТЛ №${orderNumber} (материал: полиуретан Duran / фрезерованный акрил). Отправка в лабораторию.`,
		);
		showToast(`Наряд ЗТЛ №${orderNumber} на окклюзионный сплинт (шина ВНЧС) успешно отправлен!`, "success", 4000);
	};

	return {
		handlePresetActivation,
		handlePresetWireChange,
		handlePresetBonding,
		handlePresetDebonding,
		handlePresetAlignerLabOrder,
		handlePresetRetainerLabOrder,
		handlePresetPlateLabOrder,
		handlePresetSplintLabOrder,
	};
}
