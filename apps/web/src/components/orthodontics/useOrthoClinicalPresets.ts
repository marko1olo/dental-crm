import React from "react";
import { showToast } from "../GlobalToast";
import { ANTERIOR_TEETH, type OrthoClinicalPresetId, type TargetArch } from "./orthoProtocolTypes";
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

	const handlePresetLeveling = () => {
		setActivePreset("leveling");
		setTargetArch("both");
		setSelectedTeeth([
			17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27,
			47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37,
		]);
		setBracketSlot("0.022");
		setBracketSystem("damon_q2");
		setArchwireMaterial("CuNiTi");
		setArchwireSection(".016x.022");
		setSelectedActions(["wire_change_leveling", "ligature_change", "elastics"]);
		setElasticScheme("class_ii");
		setElasticSize("fox_1_4");
		setElasticWear("22 часа/сутки");
		setNotes(
			"Плановое нивелирование зубных рядов. Произведена замена дуг: верхняя челюсть — NiTi .014\", нижняя челюсть — CuNiTi .016x.022\". Наложена эластическая межчелюстная тяга Class II (эластики Лиса 1/4\" 3.5 oz, ношение 22 ч/сут). Замки закрыты со щелчком, концы дуг загнуты. Гигиена удовлетворительная, болевой синдром купирован.",
		);
		showToast("Пресет: Плановое нивелирование (NiTi .014 ВЧ + CuNiTi .016x.022 НЧ + тяга Class II) применен", "info");
	};

	const handlePresetSprings = () => {
		setActivePreset("springs");
		setTargetArch("both");
		setSelectedTeeth([
			17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27,
			47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37,
		]);
		setBracketSlot("0.022");
		setBracketSystem("damon_q2");
		setArchwireMaterial("SS");
		setArchwireSection(".019x.025");
		setSelectedActions(["spring_activation", "ligature_change"]);
		setNotes(
			"Активация пружин ортодонтической аппаратуры. Установлена раскрывающая нитиноловая пружина Open-Coil Spring (сжатие на 1.5 мм для создания места в зубном ряду) / закрывающая пружина Closed-Coil Spring на жесткой стальной дуге SS .019x.025\". Фиксация лигатурами Кобаяши. Контроль окклюзии.",
		);
		showToast("Пресет: Активация пружин (Open/Closed Coil) применен", "info");
	};

	const handlePresetSeparationRings = () => {
		setActivePreset("separation");
		setTargetArch("both");
		setSelectedTeeth([16, 26, 36, 46]);
		setSelectedActions(["separation_rings"]);
		setNotes(
			"Установка межзубных эластических сепараторов (сепарационные кольца) в области первых и вторых моляров верхней и нижней челюстей (16, 26, 36, 46) для раскрытия контактов под ортодонтические кольца/бандажи. Пациент проинструктирован, выдан ортодонтический воск. Назначен контрольный визит через 5 дней.",
		);
		showToast("Пресет: Сепарация под бандажные кольца применен", "info");
	};

	// 5 Канонических 1-клик пресетов у кресла ортодонта (Высшая конституция & Мандаты 8e / 8n)
	const handlePresetNiti014Activation = () => {
		setActivePreset("niti_014_activation");
		setTargetArch("both");
		setSelectedTeeth([
			17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27,
			47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37,
		]);
		setBracketSlot("0.022");
		setBracketSystem("damon_q2");
		setArchwireMaterial("NiTi");
		setArchwireSection(".014");
		setSelectedActions(["niti_014_activation", "ligature_change"]);
		setElasticScheme("none");
		setNotes(
			"Плановый этап нивелирования: произведена активация и установка первичных эластичных никель-титановых дуг NiTi .014\" на верхней и нижней челюстях. Замки брекетов закрыты со щелчком. Эластические лигатуры обновлены. Концы дуг отожжены, подогнуты и зашлифованы. Травмирование слизистой исключено. Расходники списаны.",
		);
		showToast("Пресет: Активация дуги 0.14 NiTi применен", "success");
	};

	const handlePresetPowerChainChange = () => {
		setActivePreset("power_chain_change");
		setTargetArch("both");
		setSelectedTeeth([
			16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26,
			46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36,
		]);
		setArchwireMaterial("SS");
		setArchwireSection(".019x.025");
		setSelectedActions(["power_chain_change", "ligature_change"]);
		setNotes(
			"Этап консолидации и закрытия промежутков: выполнена замена эластических цепочек (power chain) с коротким шагом на жестких стальных дугах SS .019x.025\". Произведен контроль торка фронтальных зубов и стабильности окклюзионных контактов. Натяжение равномерное, фиксация надежная.",
		);
		showToast("Пресет: Смена эластических цепочек (power chain) применен", "success");
	};

	const handlePresetBondingBothMbt = () => {
		setActivePreset("bonding_both_mbt");
		setTargetArch("both");
		setSelectedTeeth([
			17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27,
			47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37,
		]);
		setBracketSlot("0.022");
		setBracketSystem("empower");
		setArchwireMaterial("NiTi");
		setArchwireSection(".014");
		setSelectedActions(["bonding_both_mbt"]);
		setElasticScheme("none");
		setNotes(
			"Первичная прямая фиксация вестибулярной брекет-системы верх/низ Roth/MBT .022\" на обе челюсти (17-27, 47-37). Кислотное протравливание эмали 37% H3PO4 (30 сек), тщательное промывание, высушивание. Адгезивный протокол, позиционирование брекетов по высоте с фотополимеризацией. Установлены первичные нивелирующие дуги NiTi .014\" ВЧ/НЧ. Выдан защитный воск, пациент проинструктирован.",
		);
		showToast("Пресет: Фиксация брекет-системы верх/низ Roth/MBT .022 применен", "success");
	};

	const handlePresetAlignerScan = () => {
		setActivePreset("aligner_scan");
		setTargetArch("both");
		setBracketSystem("aligners");
		setSelectedActions(["aligner_scan"]);
		const orderNumber = `ЗТЛ-СКАН-${Date.now().toString().slice(-6)}`;
		const labPayload = {
			orderNumber,
			createdAt: new Date().toISOString(),
			teeth: ["17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "37", "36", "35", "34", "33", "32", "31", "41", "42", "43", "44", "45", "46", "47"],
			jawScope: "both",
			constructionType: "aligner_nightguard",
			prostheticTypeId: "orthodontic_aligners_set",
			material: "aligner_polyurethane_duran",
			doctorNotes: `3D интраоральное сканирование верхнего и нижнего зубных рядов для элайнеров. Пациент: ${patientName}. Регистрат прикуса в центральном соотношении.`,
			overrideActive: true,
			overrideReason: "Снятие слепков / 3D-сканирование под элайнеры",
		};
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente-lab-order-created", { detail: labPayload }));
		}
		setNotes(
			`Снятие высокоточных оптических слепков / 3D-сканирование зубных рядов верхней и нижней челюстей под комплект элайнеров. Оцифровка окклюзии в центральном соотношении. Сформирован наряд ЗТЛ №${orderNumber} на виртуальный 3D-сетап и печать элайнеров.`,
		);
		showToast("Пресет: Снятие слепков / 3D-сканирование под элайнеры применен", "success");
	};

	const handlePresetAlignerTrays1To4 = () => {
		setActivePreset("aligner_trays_1_4");
		setTargetArch("both");
		setBracketSystem("aligners");
		setSelectedActions(["aligner_trays_1_4"]);
		setSelectedTeeth([15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45]);
		setNotes(
			"Клинический этап сдачи элайнеров: выполнена выдача капп 1-4 + фиксация композитных аттачментов на клыки и премоляры (15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45) по переносной матрице. Адаптация каппы №1 плотная, ретенция надежная. Пациент обучен правилам ношения (22 ч/сутки, смена каждые 14 дней) и использованию чувисов.",
		);
		showToast("Пресет: Выдача капп 1-4 + аттачменты применен", "success");
	};

	const handlePresetAlignerTrays5To8 = () => {
		setActivePreset("aligner_trays_5_8");
		setTargetArch("both");
		setBracketSystem("aligners");
		setSelectedActions(["aligner_trays_5_8"]);
		setNotes(
			"Контрольный осмотр и прогресс элайнеров: трекинг зубов на каппах 1-4 полный, нестыковок и зазоров между режущим краем и каппой нет, аттачменты сохранны. Выдан следующий сет капп 5-8 (режим 22 ч/сутки, смена каждые 14 дней). Назначен следующий контрольный осмотр.",
		);
		showToast("Пресет: Выдача капп 5-8 элайнеров применен", "success");
	};

	const handlePresetRebracket = () => {
		setActivePreset("rebracket");
		if (!selectedActions.includes("rebracket")) {
			setSelectedActions([...selectedActions, "rebracket"]);
		}
		setNotes(
			"Жалоба на отклейку брекета во время еды. Объективно: отрыв брекета без повреждения эмали. Проведена ультразвуковая очистка эмали зуба от остатков адгезива, протравливание 37% ортофосфорной кислотой 20 сек, смывание, высушивание, нанесение праймера Transbond XT, позиционирование нового брекета, фотополимеризация 20 сек. Дуга установлена в паз, подвязана эластической лигатурой. Окклюзионных контактов с замком нет.",
		);
		showToast("Пресет: Повторная фиксация брекета применен (добавлена услуга в смету)", "success");
	};

	return {
		handlePresetActivation,
		handlePresetWireChange,
		handlePresetBonding,
		handlePresetDebonding,
		handlePresetLeveling,
		handlePresetSprings,
		handlePresetSeparationRings,
		handlePresetAlignerLabOrder,
		handlePresetRetainerLabOrder,
		handlePresetPlateLabOrder,
		handlePresetSplintLabOrder,
		handlePresetNiti014Activation,
		handlePresetPowerChainChange,
		handlePresetBondingBothMbt,
		handlePresetAlignerScan,
		handlePresetAlignerTrays1To4,
		handlePresetAlignerTrays5To8,
		handlePresetRebracket,
	};
}
