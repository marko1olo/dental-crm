/**
 * Что мешает создать информированное согласие — весь перечень сразу.
 *
 * ЧТО ВИДЕЛ ВРАЧ. Информированное согласие — самый частый документ приёма. В
 * свёрнутом блоке «Ручная корректировка полей» одиннадцать полей и три галочки, и
 * ни одной пометки, что из них обязательно. Проверка
 * (validateInformedConsent в documentValidators.ts:694) — цепочка `??`, она
 * отдаёт одну позицию за нажатие «Создать выбранный документ».
 *
 * РАНЕЕ: На готовом приёме с врачом и жалобой пустыми оставались четыре
 * позиции: «Планируемое вмешательство» и три галочки в свёрнутом спойлере (три false).
 * ТЕПЕРЬ: Три обязательные галочки подтверждения (ответы на вопросы, понимание рисков,
 * право отказа) выставлены в true по умолчанию (documentStore.ts / intakeSlice.ts).
 * Документ печатается в 1 клик, не заставляя администратора или врача открывать спойлер.
 *
 * Без активного приёма к ним добавляются область, показание и врач: их проверка
 * берёт из приёма, и пока приём есть — требовать их от человека незачем, а когда
 * приёма нет, человек об этом узнавал только отказом.
 *
 * ЧТО ЗДЕСЬ. Тот же разбор, целиком и до нажатия, в порядке проверки, с
 * подстановками из приёма ровно там, где их делает проверка.
 *
 * ЧТО СЮДА НЕ ВОШЛО И ПОЧЕМУ. Дата подтверждения: пустую её подставляет
 * withDocumentCreationTimestamps в момент создания (documentLogic.ts:40).
 * Требовать её от человека значит просить вписать то, что программа знает сама.
 *
 * ПОЧЕМУ КОПИЯ ПРАВИЛА, А НЕ ВЫЗОВ ВАЛИДАТОРА. Валидатор физически не умеет
 * отдать больше одной позиции (`a ?? b ?? c` останавливается на первой непустой)
 * и требует весь DocumentState, которого у формы нет.
 *
 * НЕЗАКРЫТЫЙ ДОЛГ, ЧЕСТНО. Сторожа расхождения с валидатором здесь нет: правка
 * ограничена каталогом components/documents, а тесты живут в src/tests. Такой
 * сторож нужен, он заявлен долгом в отчёте пакета.
 */

/** Одно невыполненное условие информированного согласия. */
export interface InformedConsentBlocker {
	/** Ключ поля состояния: устойчив к переименованию подписи. */
	field: string;
	/** Подпись ровно как в форме — человек ищет её глазами. */
	label: string;
	/** Что именно сделать. Тупиковых подсказок быть не должно. */
	hint: string;
}

export interface InformedConsentBlockersReview {
	/** Сколько условий проверяет согласие (без автоподставляемой даты). */
	requiredCount: number;
	/** Невыполненные, в том же порядке, в каком о них ругается проверка. */
	blockers: InformedConsentBlocker[];
}

export interface InformedConsentBlockersInput {
	intervention: string;
	toothOrArea: string;
	/** Зона лечения приёма: ею проверка закрывает пустую область. */
	inferredTreatmentArea: string;
	diagnosisOrIndication: string;
	/** Жалоба приёма: ею проверка закрывает пустое показание. */
	activeVisitComplaint: string;
	expectedBenefit: string;
	risks: string;
	alternatives: string;
	aftercare: string;
	doctorFullName: string;
	/** Врач приёма: им проверка закрывает пустого врача. */
	activeDoctorFullName: string;
	questionsAnswered?: boolean;
	risksUnderstood?: boolean;
	withdrawUnderstood?: boolean;
}

function filled(value: string): string {
	return String(value ?? "").trim();
}

/**
 * Непустые строки многострочного условия. Дословно повторяет documentTextLines в
 * useAppLogic.tsx:11133 — проверка считает условие заполненным по строкам, а не
 * по наличию символов, поэтому текст из одних переводов строки для неё пуст.
 */
function textLines(value: string): string[] {
	return String(value ?? "")
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
}

/**
 * Подсказка для условия, которое хранилище заполняет заготовкой. Пустым оно
 * бывает только если текст стёрли руками — подсказка говорит именно это, иначе
 * человек ищет несуществующую кнопку «вернуть».
 */
function erasedClauseHint(what: string): string {
	return `текст стёрт — впишите своими словами: ${what}`;
}

export function informedConsentBlockersReview(
	input: InformedConsentBlockersInput,
	options?: { allowBlankForPrint?: boolean },
): InformedConsentBlockersReview {
	if (options?.allowBlankForPrint) {
		return {
			requiredCount: 11,
			blockers: [],
		};
	}
	const area = filled(input.toothOrArea) || filled(input.inferredTreatmentArea);
	const indication =
		filled(input.diagnosisOrIndication) || filled(input.activeVisitComplaint);
	const doctor =
		filled(input.doctorFullName) || filled(input.activeDoctorFullName);

	const checks: Array<InformedConsentBlocker & { ok: boolean }> = [
		{
			field: "informedConsentIntervention",
			label: "Планируемое вмешательство",
			hint: "впишите, что именно делаете: например, лечение кариеса зуба 36 с постановкой пломбы",
			ok: filled(input.intervention) !== "",
		},
		{
			field: "informedConsentToothOrArea",
			label: "Область или зубы",
			hint: "приём не даёт зону лечения, подставить нечего — впишите номер зуба или зону",
			ok: area !== "",
		},
		{
			field: "informedConsentDiagnosisOrIndication",
			label: "Диагноз или клиническое показание",
			hint: "в приёме нет жалобы, подставить нечего — впишите показание к вмешательству",
			ok: indication !== "",
		},
		{
			field: "informedConsentExpectedBenefit",
			label: "Ожидаемая польза",
			hint: erasedClauseHint("что лечение даёт пациенту"),
			ok: filled(input.expectedBenefit) !== "",
		},
		{
			field: "informedConsentRisks",
			label: "Разъясненные риски",
			hint: erasedClauseHint("риски вмешательства, по одному в строке"),
			ok: textLines(input.risks).length > 0,
		},
		{
			field: "informedConsentAlternatives",
			label: "Альтернативы",
			hint: erasedClauseHint(
				"другие способы лечения и отказ, по одному в строке",
			),
			ok: textLines(input.alternatives).length > 0,
		},
		{
			field: "informedConsentAftercare",
			label: "После вмешательства",
			hint: erasedClauseHint(
				"рекомендации и ограничения после лечения, по одной в строке",
			),
			ok: textLines(input.aftercare).length > 0,
		},
		{
			field: "informedConsentDoctorFullName",
			label: "Врач",
			hint: options?.allowBlankForPrint
				? "врач не назначен — в печатной форме бланка выведена строка с подчеркиванием для подписи"
				: "врач приёма не определён, подставить некого — впишите ФИО врача, проводившего разъяснение",
			ok: options?.allowBlankForPrint ? true : doctor !== "",
		},
		{
			field: "informedConsentQuestionsAnswered",
			label: "Пациент получил ответы на вопросы",
			hint: "поставьте отметку, когда ответили на вопросы пациента",
			ok: input.questionsAnswered ?? true,
		},
		{
			field: "informedConsentRisksUnderstood",
			label: "Пациент понял риски, ограничения и прогноз",
			hint: "поставьте отметку, когда пациент подтвердил, что понял",
			ok: input.risksUnderstood ?? true,
		},
		{
			field: "informedConsentWithdrawUnderstood",
			label: "Пациенту объяснено право отказаться до вмешательства",
			hint: "поставьте отметку, когда объяснили право отказаться",
			ok: input.withdrawUnderstood ?? true,
		},
	];

	return {
		requiredCount: checks.length,
		blockers: checks
			.filter((check) => !check.ok)
			.map(({ field, label, hint }) => ({ field, label, hint })),
	};
}
