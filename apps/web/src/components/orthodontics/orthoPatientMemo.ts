import { ELASTIC_SCHEMES, ELASTIC_SIZES } from "./OrthoArchwireSelector";
import { BRACKET_SYSTEMS } from "./OrthoBracketProtocolSection";

export interface OrthodonticPatientMemoParams {
	clinicName: string;
	clinicPhone?: string | undefined;
	doctorName: string;
	patientName: string;
	visitDate?: string | undefined;
	bracketSystem: string;
	archwireMaterial?: string | undefined;
	archwireSection?: string | undefined;
	targetArch?: string | undefined;
	elasticScheme?: string | undefined;
	elasticSize?: string | undefined;
	elasticWear?: string | undefined;
	isAligners?: boolean | undefined;
	currentAligner?: number | undefined;
	totalAligners?: number | undefined;
	currentAlignerUpper?: number | undefined;
	currentAlignerLower?: number | undefined;
	totalAlignersUpper?: number | undefined;
	totalAlignersLower?: number | undefined;
	notes?: string | undefined;
}

export function getRuDateString(d: Date = new Date()): string {
	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const year = d.getFullYear();
	return `${day}.${month}.${year}`;
}

export function formatOrthodonticPatientMemo(params: OrthodonticPatientMemoParams): string {
	const clinicName = params.clinicName || "Стоматологическая клиника DENTE";
	const clinicPhone = params.clinicPhone || "";
	const doctorName = params.doctorName || "Лечащий врач-ортодонт";
	const patientName = params.patientName || "Пациент";
	const visitDate = params.visitDate || getRuDateString();
	const isAligners = Boolean(params.isAligners || params.bracketSystem === "aligners");

	const systems = BRACKET_SYSTEMS;
	const systemObj = systems.find((b) => b.id === params.bracketSystem);
	const systemName = isAligners ? "Элайнеры" : (systemObj ? systemObj.label : params.bracketSystem || "Damon Q2");

	let apparatusDetails = "";
	if (isAligners) {
		if (params.currentAlignerUpper && params.currentAlignerLower) {
			const curU = params.currentAlignerUpper;
			const totalU = params.totalAlignersUpper || params.totalAligners || "—";
			const curL = params.currentAlignerLower;
			const totalL = params.totalAlignersLower || params.totalAligners || "—";
			apparatusDetails = `Текущий этап: ВЧ Каппа №${curU} из ${totalU}, НЧ Каппа №${curL} из ${totalL}\nРежим: ношение 22 часа/сутки, смена через 10-14 дней.\n`;
		} else {
			const cur = params.currentAligner || 1;
			const total = params.totalAligners || "—";
			apparatusDetails = `Текущий этап: Каппа №${cur} из ${total}\nРежим: ношение 22 часа/сутки, смена через 10-14 дней.\n`;
		}
	} else {
		const arch = params.targetArch === "upper" ? "верхняя челюсть" : params.targetArch === "lower" ? "нижняя челюсть" : "обе челюсти";
		const mat = params.archwireMaterial || "CuNiTi";
		const sec = params.archwireSection || ".016";
		apparatusDetails = `Установленная дуга: ${mat} ${sec} (${arch})\n`;
	}

	let elasticsBlock = "";
	if (params.elasticScheme && params.elasticScheme !== "none") {
		const schemeObj = ELASTIC_SCHEMES.find((e) => e.id === params.elasticScheme);
		const schemeLabel = schemeObj ? schemeObj.label : params.elasticScheme;
		const sizeObj = ELASTIC_SIZES.find((s) => s.id === params.elasticSize);
		const sizeLabel = sizeObj ? `${sizeObj.label} (${sizeObj.strength})` : (params.elasticSize || "3/16\" Medium");
		const wearMode = params.elasticWear || "22 часа/сутки";
		elasticsBlock = `Схема межчелюстных эластиков (тяг):\n- Направление: ${schemeLabel}\n- Размер/сила: ${sizeLabel}\n- Режим ношения: ${wearMode} (смена на свежие 2 раза в день)\n`;
	}

	return `Ортодонтические рекомендации после приёма (клиника «${clinicName}»):
Пациент: ${patientName}
Лечащий врач: ${doctorName}
Дата приёма: ${visitDate}
Аппаратура: ${systemName}
${apparatusDetails}${elasticsBlock}Памятка пациенту:
1. Первые 2-3 дня возможна умеренная чувствительность зубов при накусывании (физиологическая норма перемещения зубов).
2. Эластики снимаются только во время еды и чистки зубов. При обрыве эластика надеть новый из упаковки.
3. При натирании щеки или губы нанесите защитный ортодонтический воск на выступающий элемент.
4. При отклейке брекета, утере кнопки или дискомфорте от дуги немедленно свяжитесь с клиникой${clinicPhone ? `: ${clinicPhone}` : ""}.
Следующий контрольный визит: через 4–6 недель.`;
}
