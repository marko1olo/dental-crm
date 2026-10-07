import {
	ANB_CLASS_OPTIONS,
	type AnbClass,
	ANGLE_CLASS_OPTIONS,
	type AngleClass,
	type SagittalAnomaly,
	type VerticalAnomaly,
	type TransversalAnomaly,
	type TmjStatus,
} from "@dental/shared";
import {
	ARCHWIRE_MATERIALS,
	ELASTIC_SCHEMES,
	ELASTIC_SIZES,
	TORQUE_PRESETS,
	ANGULATION_PRESETS,
	type ArchwireMaterial,
	type ArchwireSection,
} from "./OrthoArchwireSelector";
import {
	BRACKET_SYSTEMS,
	ALIGNER_ATTACHMENT_PRESETS,
	type BracketSlot,
} from "./OrthoBracketProtocolSection";
import {
	CLINICAL_ACTIONS,
	type TargetArch,
} from "./orthoProtocolTypes";

export interface SynthesizeProtocolParams {
	patientName: string;
	notes: string;
	angleClass: AngleClass;
	anbClass: AnbClass;
	anbAngle: number;
	sagittalAnomaly: SagittalAnomaly;
	sagittalGapMm: number;
	verticalAnomaly: VerticalAnomaly;
	transversalAnomaly: TransversalAnomaly;
	tmjStatus: TmjStatus;
	isPhotoProtocolCompleted: boolean;
	bracketSlot: BracketSlot;
	bracketSystem: string;
	archwireMaterial: ArchwireMaterial;
	archwireSection: ArchwireSection;
	targetArch: TargetArch;
	elasticScheme: string;
	elasticSize: string;
	elasticWear: string;
	selectedActions: string[];
	selectedTeeth: number[];
	powerChainSpan: string;
	powerChainType: string;
	activePreset: string | null;
	activeAttachmentPreset: string | null;
	alignerSetIssued: { count: number; days: number } | null;
	plateActivationTurns: number;
	torquePreset: string;
	angulationPreset: string;
	isSplitArchAligners: boolean;
	alignerStep: number;
	alignerTotal: number;
	alignerStepUpper: number;
	alignerTotalUpper: number;
	alignerStepLower: number;
	alignerTotalLower: number;
	alignerProgressPercent: number;
	nextAlignerDateStr: string;
	alignerDaysPerStep: number;
}

export function synthesizeOrthodonticProtocolText(params: SynthesizeProtocolParams): string {
	const {
		patientName,
		notes,
		angleClass,
		anbClass,
		anbAngle,
		sagittalAnomaly,
		sagittalGapMm,
		verticalAnomaly,
		transversalAnomaly,
		tmjStatus,
		isPhotoProtocolCompleted,
		bracketSlot,
		bracketSystem,
		archwireMaterial,
		archwireSection,
		targetArch,
		elasticScheme,
		elasticSize,
		elasticWear,
		selectedActions,
		selectedTeeth,
		powerChainSpan,
		powerChainType,
		activePreset,
		activeAttachmentPreset,
		alignerSetIssued,
		plateActivationTurns,
		torquePreset,
		angulationPreset,
		isSplitArchAligners,
		alignerStep,
		alignerTotal,
		alignerStepUpper,
		alignerTotalUpper,
		alignerStepLower,
		alignerTotalLower,
		alignerProgressPercent,
		nextAlignerDateStr,
		alignerDaysPerStep,
	} = params;

	const dateStr = new Date().toLocaleDateString("ru-RU");
	const systemObj = BRACKET_SYSTEMS.find((b) => b.id === bracketSystem);
	const materialObj = ARCHWIRE_MATERIALS.find((m) => m.id === archwireMaterial);
	const elasticObj = ELASTIC_SCHEMES.find((e) => e.id === elasticScheme);
	const elasticSizeObj = ELASTIC_SIZES.find((s) => s.id === elasticSize);

	const archLabel =
		targetArch === "upper"
			? "Верхняя челюсть (ВЧ)"
			: targetArch === "lower"
				? "Нижняя челюсть (НЧ)"
				: "Верхняя и нижняя челюсти (ВЧ + НЧ)";

	const teethListStr =
		selectedTeeth.length > 0
			? selectedTeeth.join(", ")
			: "аппаратура не активирована";

	const actionsListStr = selectedActions
		.map((aId) => CLINICAL_ACTIONS.find((a) => a.id === aId)?.label)
		.filter(Boolean)
		.join("; ");

	const angleObj = ANGLE_CLASS_OPTIONS.find((a) => a.id === angleClass);
	const angleText = angleObj
		? `• Прикус (классификация Энгля): ${angleObj.label}.\n`
		: "• Прикус (классификация Энгля): I класс по Энглю (нейтральный прикус).\n";

	const anbObj = ANB_CLASS_OPTIONS.find((a) => a.id === anbClass);
	const anbText = anbObj
		? `• Скелетный класс (Steiner ANB): ${anbObj.label} (угол ANB: ${anbAngle.toFixed(1)}°).\n`
		: `• Скелетный класс (Steiner ANB): I класс (норма, угол ANB: ${anbAngle.toFixed(1)}°).\n`;

	let sagittalText = "";
	if (sagittalAnomaly === "overjet") {
		sagittalText = `• Сагиттальная щель (оверджет): ${sagittalGapMm} мм (выраженная сагиттальная щель).\n`;
	} else if (sagittalAnomaly === "reverse") {
		sagittalText = "• Сагиттальное соотношение: обратная резцовая окклюзия (мезиальное перекрытие).\n";
	} else if (sagittalAnomaly === "norm") {
		sagittalText = "• Сагиттальное соотношение резцов: норма (физиологический контакт 1–2 мм).\n";
	}

	let verticalText = "";
	if (verticalAnomaly === "deep") {
		verticalText = "• Вертикальное перекрытие: глубокий резцовый прикус (>1/2 высоты коронки).\n";
	} else if (verticalAnomaly === "open") {
		verticalText = "• Вертикальное соотношение: открытый прикус (вертикальная дизокклюзия во фронтальном отделе).\n";
	} else if (verticalAnomaly === "norm") {
		verticalText = "• Вертикальное перекрытие: норма (1/3 высоты коронки, физиологическое).\n";
	}

	let transversalText = "";
	if (transversalAnomaly === "crossbite") {
		transversalText = "• Трансверзальное соотношение: перекрестный прикус (буккальная/лингвальная дизокклюзия).\n";
	} else if (transversalAnomaly === "norm") {
		transversalText = "• Трансверзальное соотношение: норма (правильное щечно-небное перекрытие).\n";
	}

	let tmjText = "";
	if (tmjStatus === "clicking") {
		tmjText = "• ВНЧС и гнатология: суставной щелчок при открывании рта, умеренная дискоординация движений.\n";
	} else if (tmjStatus === "pain") {
		tmjText = "• ВНЧС и гнатология: болезненность при пальпации латеральных крыловидных мышц и суставных головок.\n";
	} else if (tmjStatus === "deviation") {
		tmjText = "• ВНЧС и гнатология: девиация нижней челюсти при максимальном открывании рта.\n";
	} else if (tmjStatus === "splint") {
		tmjText = "• ВНЧС и гнатология: проводится сплинт-терапия (окклюзионная шина в центральном соотношении).\n";
	} else if (tmjStatus === "norm") {
		tmjText = "• ВНЧС и гнатология: пальпация суставов безболезненная, девиации нет, суставной шум отсутствует (норма).\n";
	}

	let elasticsText = "Межчелюстная тяга не назначена.";
	if (elasticScheme !== "none") {
		elasticsText = `Межчелюстные эластики: ${elasticObj?.label || ""} (${elasticSizeObj?.label || ""}, ${elasticSizeObj?.strength || ""}). Режим ношения: ${elasticWear}.`;
	}

	let powerChainText = "";
	if (selectedActions.includes("power_chain")) {
		powerChainText = `\nУстановлена эластическая цепочка Power Chain (${powerChainType === "short" ? "короткий шаг" : powerChainType === "long" ? "длинный шаг" : "сплошная"}) в сегменте ${powerChainSpan}.`;
	}

	let attachmentText = "";
	const currentAttachmentObj = ALIGNER_ATTACHMENT_PRESETS.find((p) => p.id === activeAttachmentPreset);
	if (currentAttachmentObj) {
		attachmentText = `• Аттачменты элайнеров: ${currentAttachmentObj.description}`;
	}

	let alignerSetText = "";
	if (alignerSetIssued) {
		alignerSetText = `• Выдача элайнеров: выдан следующий сет капп (+${alignerSetIssued.days} дн., ${alignerSetIssued.count} каппы). Режим ношения: 22 ч/сутки.`;
	}

	let plateText = "";
	if (bracketSystem === "removable_plate") {
		plateText = `• Состояние аппарата: съемная пластинка с расширяющим винтом на ${archLabel}. Фиксация стабильна, кламмеры и вестибулярная дуга адаптированы. Раскрутка винта: ${plateActivationTurns}/4 оборота (${(plateActivationTurns * 0.25).toFixed(2)} мм).`;
	}

	let archwireText = `• Текущая дуга: ${archLabel} — ${materialObj?.badge || ""} сечением ${archwireSection}".`;
	if (bracketSystem === "aligners" || activeAttachmentPreset) {
		archwireText = "• Состояние аппаратуры: прозрачные каппы (элайнеры), фиксация на аттачментах плотная, окклюзионных помех нет.";
	} else if (bracketSystem === "removable_plate") {
		archwireText = plateText;
	} else if (selectedActions.includes("debonding")) {
		archwireText = "• Состояние аппаратуры: брекет-система снята. Зафиксирован несъемный проволочный ретейнер в сегментах 13-23 и 33-43.";
	} else if (activePreset === "wire_change" || notes.includes("верхняя челюсть .016\", нижняя челюсть .014\"")) {
		archwireText = "• Установленные дуги: ВЧ — NiTi .016\", НЧ — NiTi .014\" (круглые нивелирующие, норма).";
	} else if (activePreset === "activation") {
		archwireText = `• Текущие дуги: ${archLabel} — ${materialObj?.badge || ""} сечением ${archwireSection}" (дуги сохранены без деформаций, активация замков).`;
	}

	let torqueAngulationText = "";
	const torqueObj = TORQUE_PRESETS.find((t) => t.id === torquePreset);
	const angulationObj = ANGULATION_PRESETS.find((a) => a.id === angulationPreset);
	if (torqueObj) {
		torqueAngulationText = `• Торк и ангуляция: пропись ${torqueObj.label}, ангуляция резцов/клыков: ${angulationObj?.label || "норма"}. Контроль мезио-дистального наклона и инклинации выполнен.`;
	}

	let alignerTrackerText = "";
	if (bracketSystem === "aligners" || activeAttachmentPreset) {
		alignerTrackerText = isSplitArchAligners
			? `• Трекер элайнеров: ВЧ Каппа №${alignerStepUpper} из ${alignerTotalUpper} (${alignerTotalUpper > 0 ? Math.round((alignerStepUpper / alignerTotalUpper) * 100) : 0}%), НЧ Каппа №${alignerStepLower} из ${alignerTotalLower} (${alignerTotalLower > 0 ? Math.round((alignerStepLower / alignerTotalLower) * 100) : 0}%). Режим ношения: 22 ч/сутки. Следующая смена: ${nextAlignerDateStr} (каждые ${alignerDaysPerStep} дн.).`
			: `• Трекер элайнеров: Каппа №${alignerStep} из ${alignerTotal} (${alignerProgressPercent}% курса завершено). Режим ношения: 22 ч/сутки. Следующая смена: ${nextAlignerDateStr} (каждые ${alignerDaysPerStep} дн.).`;
	}

	let separationText = "";
	if (selectedActions.includes("separation")) {
		separationText = "\n• Сепарационные эластики: установлены эластические сепараторы в межзубные промежутки для создания межпроксимального пространства.";
	}

	return `ДНЕВНИК ОРТОДОНТИЧЕСКОГО ПРИЁМА
Дата приёма: ${dateStr}
Пациент: ${patientName}

1. ЖАЛОБЫ:
${notes || "Плановый визит по графику ортодонтического лечения. Жалоб на острую боль и отклейку аппаратуры нет."}

2. ОБЪЕКТИВНЫЙ СТАТУС:
${angleText}${anbText}${sagittalText}${verticalText}${transversalText}${tmjText}• Аппаратура: ${
	bracketSystem === "aligners"
		? "Ортодонтические элайнеры (каппы с аттачментами)"
		: bracketSystem === "removable_plate"
			? "Съемный пластиночный аппарат с расширяющим винтом"
			: `${systemObj?.label || "Брекет-система"} (паз ${bracketSlot}")`
}.
• Зона фиксации/активации (зубы): ${teethListStr}.
${attachmentText ? `${attachmentText}\n` : ""}${alignerTrackerText ? `${alignerTrackerText}\n` : ""}${alignerSetText ? `${alignerSetText}\n` : ""}${archwireText}${separationText}
${torqueAngulationText ? `${torqueAngulationText}\n` : ""}• Фиксация аппаратуры стабильна, окклюзионных контактов с замками/каппами не выявлено.
• Фотопротокол: ${isPhotoProtocolCompleted ? "выполнен (8 ракурсов ABO: анфас, профиль, улыбка, окклюзия)" : "не проводился на текущем визите"}.

3. ПРОВЕДЁННОЕ ЛЕЧЕНИЕ:
• Выполненные манипуляции: ${actionsListStr || (activeAttachmentPreset ? currentAttachmentObj?.shortLabel : "Активация аппаратуры")}.${powerChainText}
${currentAttachmentObj ? `• ${currentAttachmentObj.description}\n` : ""}${alignerSetIssued ? `• Сдан сет элайнеров на ${alignerSetIssued.days} дн. (смена капп каждые ${Math.round(alignerSetIssued.days / alignerSetIssued.count)} дней).\n` : ""}• ${elasticsText}
• Антисептическая обработка полости рта (0.05% раствор хлоргексидина).
• Коррекция элементов аппаратуры выполнена в полном объеме.

4. РЕКОМЕНДАЦИИ И НАЗНАЧЕНИЯ:
${bracketSystem === "aligners" || activeAttachmentPreset
	? `• Ношение элайнеров строго не менее 20–22 часов в сутки (снимать только во время приёма пищи и чистки зубов).
• Использование чувисов (жевательных валиков) для плотной посадки капп на зубах.
• Хранение элайнеров в специальном вентилируемом боксе, промывание прохладной водой.
• Следующий плановый приём: через ${alignerSetIssued ? `${Math.round(alignerSetIssued.days / 7)} недель` : "4–6 недель"}.`
	: bracketSystem === "removable_plate"
		? `• Ношение пластинки строго 20–22 часа в сутки (снимать во время еды и контактного спорта).
• Активация расширяющего винта ключом строго по схеме (1 раз в 7 дней на 1/4 оборота по стрелке).
• Хранение в сухом вентилируемом контейнере, ежедневная механическая чистка зубной щеткой и мылом.
• Следующий контрольный приём: через 4 недели.`
		: `• Строгое соблюдение гигиены (ортодонтическая щетка, монопучок, ершики, ирригатор).
• Использование ортодонтического защитного воска при натирании.
• Исключить из рациона твердую, волокнистую и липкую пищу.
• Следующий плановый приём: через 4–6 недель.`}`;
}
