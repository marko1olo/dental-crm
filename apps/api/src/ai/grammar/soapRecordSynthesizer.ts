/**
 * soapRecordSynthesizer.ts — Синтез клинического дневника 043/у по стандарту SOAP на основе диктовки
 */

import type {
	AnesthesiaResult,
	DiagnosisRule,
	Procedure804nResult,
	SoapRecordResult,
} from "./clinicalGrammarTypes.js";

export function synthesizeSoapRecord(
	rawText: string,
	teeth: number[],
	surfaces: string[],
	diagRule: DiagnosisRule | null,
	anesthesia: AnesthesiaResult | null,
	procedures: Procedure804nResult[],
): SoapRecordResult {
	const primaryTooth = teeth[0];
	const toothStr = primaryTooth ? `зуба ${primaryTooth}` : "";
	const surfaceStr = surfaces.length > 0 ? `поверхности ${surfaces.join(", ")}` : "окклюзионной поверхности";

	let complaint = "Жалоб на момент осмотра активно не предъявляет.";
	let objective = "";
	const diagnosis = diagRule?.title || "Стоматологический осмотр";
	const diagIcd10 = diagRule?.code || "K02.1";

	if (diagIcd10 === "K02.1") {
		complaint = `Жалобы на кратковременные боли от сладкого и термических раздражителей (холодного) в области ${toothStr || "зуба"}.`;
		objective = `При осмотре: на ${surfaceStr} ${toothStr || "зуба"} визуализируется кариозная полость в пределах дентина. Зондирование дна и стенок слабо болезненно, дентин пигментирован, размягчен. Перкуссия безболезненна. Термопроба положительная, боль быстро проходит после устранения раздражителя.`;
	} else if (diagIcd10 === "K02.0") {
		complaint = `Жалобы на косметический дефект эмали в области ${toothStr || "зуба"}.`;
		objective = `При осмотре: на вестибулярной поверхности ${toothStr || "зуба"} меловидное матовое пятно, зонд скользит гладко. Реакция на температурные раздражители индифферентна.`;
	} else if (diagIcd10 === "K04.0") {
		complaint = `Жалобы на самопроизвольные, приступообразные боли в области ${toothStr || "зуба"}, усиливающиеся в ночное время, иррадиирующие по ходу ветвей тройничного нерва.`;
		objective = `При осмотре: глубокая кариозная полость ${toothStr || "зуба"}, сообщающаяся с полостью зуба в одной точке. Зондирование пульпы резко болезненно, пульпа кровоточит. Перкуссия слабо чувствительна. Термопроба вызывает резкую длительную боль.`;
	} else if (diagIcd10 === "K04.5") {
		complaint = `Жалобы на дискомфорт и неприятные ощущения при накусывании на ${toothStr || "зуб"}.`;
		objective = `При осмотре: коронка ${toothStr || "зуба"} изменена в цвете, глубокая кариозная полость или старая пломба, полость зуба вскрыта, зондирование устьев безболезненно. Перкуссия слабо положительна. Пальпация по переходной складке безболезненна.`;
	} else if (diagIcd10 === "S02.5") {
		complaint = `Жалобы на откол части коронки ${toothStr || "зуба"} в результате травмы / приема твердой пищи, шероховатость.`;
		objective = `При осмотре: скол эмали режущего края / бугра ${toothStr || "зуба"}. Зондирование линии скола безболезненно. Перкуссия отрицательна.`;
	} else if (diagIcd10 === "K08.1") {
		complaint = `Жалобы на отсутствие ${toothStr || "зуба"}, нарушение жевательной функции.`;
		objective = `При осмотре: зуб ${primaryTooth || ""} отсутствует в зубном ряду, альвеолярный отросток без признаков воспаления.`;
	}

	const treatmentSteps: string[] = [];
	if (anesthesia) {
		treatmentSteps.push(`1. Анестезия: ${anesthesia.displayName}.`);
	}
	if (procedures.some((p) => p.category === "isolation")) {
		treatmentSteps.push("2. Изоляция рабочего поля коффердамом.");
	}
	if (procedures.some((p) => p.code804n === "A16.07.002")) {
		treatmentSteps.push("3. Препарирование кариозной полости, некрэктомия твердых тканей, формирование полости.");
	}
	if (procedures.some((p) => p.code804n === "A16.07.030")) {
		treatmentSteps.push("4. Механическая и медикаментозная обработка корневых каналов (эндомотор, ProTaper, 3% гипохлорит натрия, ультразвуковая активация).");
	}
	if (procedures.some((p) => p.code804n === "A16.07.008")) {
		treatmentSteps.push("5. Обтурация корневых каналов гуттаперчевыми штифтами и силером методом латеральной конденсации.");
	}
	if (procedures.some((p) => p.category === "therapy" && p.code804n === "A16.07.002.010")) {
		const shadeText = procedures.find((p) => p.shade)?.shade ? ` (оттенок ${procedures.find((p) => p.shade)?.shade})` : "";
		treatmentSteps.push(`6. Адгезивная подготовка (самопротравливающий адгезив), послойное восстановление анатомической формы зуба светоотверждаемым композитом${shadeText}.`);
		treatmentSteps.push("7. Шлифовка и полировка пломбы по окклюзии (диски, полировочные головки Enhance, паста).");
	}
	if (treatmentSteps.length === 0) {
		treatmentSteps.push("1. Проведен осмотр полости рта, инструментальное обследование.");
	}

	const recommendations =
		"Соблюдение гигиены полости рта. Воздержаться от приема красящих продуктов и напитков в течение 2 часов. Контрольный осмотр через 6 месяцев.";

	return {
		complaint,
		anamnesis: "Со слов пациента, ранее зуб не лечен, симптомы возникли недавно.",
		objectiveStatus: objective,
		diagnosis: `${diagIcd10} ${diagnosis}`,
		diagnosisIcd10: diagIcd10,
		treatmentPlan: treatmentSteps.join("\n"),
		recommendations,
	};
}
