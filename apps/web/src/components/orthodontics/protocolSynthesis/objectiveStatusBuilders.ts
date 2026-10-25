import {
	ANB_CLASS_OPTIONS,
	ANGLE_CLASS_OPTIONS,
	type AnbClass,
	type AngleClass,
	type SagittalAnomaly,
	type VerticalAnomaly,
	type TransversalAnomaly,
	type TmjStatus,
} from "@dental/shared";

export function buildOcclusionStatusText(params: {
	angleClass: AngleClass;
	anbClass: AnbClass;
	anbAngle: number;
	sagittalAnomaly: SagittalAnomaly;
	sagittalGapMm: number;
	verticalAnomaly: VerticalAnomaly;
	transversalAnomaly: TransversalAnomaly;
	tmjStatus: TmjStatus;
}): string {
	const angleObj = ANGLE_CLASS_OPTIONS.find((a) => a.id === params.angleClass);
	const angleText = angleObj
		? `• Прикус (классификация Энгля): ${angleObj.label}.\n`
		: "• Прикус (классификация Энгля): I класс по Энглю (нейтральный прикус).\n";

	const anbObj = ANB_CLASS_OPTIONS.find((a) => a.id === params.anbClass);
	const anbText = anbObj
		? `• Скелетный класс (Steiner ANB): ${anbObj.label} (угол ANB: ${params.anbAngle.toFixed(1)}°).\n`
		: `• Скелетный класс (Steiner ANB): I класс (норма, угол ANB: ${params.anbAngle.toFixed(1)}°).\n`;

	let sagittalText = "";
	if (params.sagittalAnomaly === "overjet") {
		sagittalText = `• Сагиттальная щель (оверджет): ${params.sagittalGapMm} мм (выраженная сагиттальная щель).\n`;
	} else if (params.sagittalAnomaly === "reverse") {
		sagittalText = "• Сагиттальное соотношение: обратная резцовая окклюзия (мезиальное перекрытие).\n";
	} else if (params.sagittalAnomaly === "norm") {
		sagittalText = "• Сагиттальное соотношение резцов: норма (физиологический контакт 1–2 мм).\n";
	}

	let verticalText = "";
	if (params.verticalAnomaly === "deep") {
		verticalText = "• Вертикальное перекрытие: глубокий резцовый прикус (>1/2 высоты коронки).\n";
	} else if (params.verticalAnomaly === "open") {
		verticalText = "• Вертикальное соотношение: открытый прикус (вертикальная дизокклюзия во фронтальном отделе).\n";
	} else if (params.verticalAnomaly === "norm") {
		verticalText = "• Вертикальное перекрытие: норма (1/3 высоты коронки, физиологическое).\n";
	}

	let transversalText = "";
	if (params.transversalAnomaly === "crossbite") {
		transversalText = "• Трансверзальное соотношение: перекрестный прикус (буккальная/лингвальная дизокклюзия).\n";
	} else if (params.transversalAnomaly === "norm") {
		transversalText = "• Трансверзальное соотношение: норма (правильное щечно-небное перекрытие).\n";
	}

	let tmjText = "";
	if (params.tmjStatus === "clicking") {
		tmjText = "• ВНЧС и гнатология: суставной щелчок при открывании рта, умеренная дискоординация движений.\n";
	} else if (params.tmjStatus === "pain") {
		tmjText = "• ВНЧС и гнатология: болезненность при пальпации латеральных крыловидных мышц и суставных головок.\n";
	} else if (params.tmjStatus === "deviation") {
		tmjText = "• ВНЧС и гнатология: девиация нижней челюсти при максимальном открывании рта.\n";
	} else if (params.tmjStatus === "splint") {
		tmjText = "• ВНЧС и гнатология: проводится сплинт-терапия (окклюзионная шина в центральном соотношении).\n";
	} else if (params.tmjStatus === "norm") {
		tmjText = "• ВНЧС и гнатология: пальпация суставов безболезненная, девиации нет, суставной шум отсутствует (норма).\n";
	}

	return `${angleText}${anbText}${sagittalText}${verticalText}${transversalText}${tmjText}`;
}
