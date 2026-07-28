/**
 * Чего не хватает договору платных медицинских услуг — весь список сразу.
 *
 * ЧТО БЫЛО. Проверка договора (validatePaidMedicalServicesContract в
 * documentValidators.ts) — это цепочка из `??`: она возвращает ПЕРВУЮ
 * незаполненную позицию и молчит про остальные. Администратор нажимал «Создать
 * выбранный документ» и получал «Заполните поле: договор, номер»; исправлял,
 * нажимал снова — «Заполните поле: договор, начало оказания услуг»; снова —
 * «Укажите ориентировочную стоимость договора»; потом четыре отказа подряд за
 * четыре отметки-подтверждения. На чистой клинике это шесть-восемь отказов по
 * одному полю за раз, и до первого нажатия на экране НИЧЕГО не помечено
 * обязательным: сами поля лежат в свёрнутом блоке «Ручная корректировка полей».
 *
 * ЧТО ЗДЕСЬ. Тот же перечень обязательного, но целиком и до нажатия. Порядок
 * позиций совпадает с порядком проверки, поэтому список читается как та же
 * последовательность отказов, только сразу вся.
 *
 * ПОЧЕМУ КОПИЯ ПРАВИЛА, А НЕ ВЫЗОВ ВАЛИДАТОРА. Валидатор физически не умеет
 * отдать больше одной позиции: `a ?? b ?? c` останавливается на первом
 * непустом. Его подпись допускает массив (`string[] | string | null`), но
 * договор возвращает строку, а переписывать 55 валидаторов — отдельная работа.
 * Расхождение сторожит тест paidContractRequiredFields.test.ts: он проверяет,
 * что при заполнении всех позиций отсюда валидатор молчит, а при обнулении
 * каждой — ругается.
 *
 * ЧТО СЮДА НЕ ВОШЛО И ПОЧЕМУ. Валидатор требует 20 позиций, здесь 18. Две
 * оставшиеся — дата договора и дата подписания: их подставляет
 * withDocumentCreationTimestamps в момент создания, требовать их от человека
 * значит просить вписать то, что программа знает сама. Если их когда-нибудь
 * уберут из списка автоподстановки, тест это заметит.
 */

/** Одна незаполненная обязательная позиция договора. */
export interface PaidContractMissingField {
	/** Ключ поля состояния: устойчив к переименованию подписи. */
	field: string;
	/** Подпись ровно как в форме ниже — человек ищет её глазами. */
	label: string;
	/** Что именно сделать. Тупиковых подсказок быть не должно. */
	hint: string;
}

export interface PaidContractRequiredFieldsInput {
	contractNumber: string;
	serviceStart: string;
	serviceEnd: string;
	/** Заказчик, вписанный руками. Пустой — подставляется пациент приёма. */
	customerFullName: string;
	patientFullName: string;
	/** Основание обращения руками. Пустое — жалоба приёма, затем общая формулировка. */
	careReason: string;
	visitComplaint: string;
	/** Состав услуг руками. Пустой — план лечения, затем заключение врача. */
	serviceScope: string;
	visitTreatmentPlan: string;
	visitDoctorSummary: string;
	/** Уже посчитанная сумма: ручная либо из принятого плана лечения. */
	totalRub: number;
	paymentTerms: string;
	priceChangeRules: string;
	freeCareNotice: string;
	recommendationWarning: string;
	refundTerms: string;
	warrantyTerms: string;
	/** Врач руками. Пустой — врач текущего приёма. */
	doctorFullName: string;
	activeDoctorFullName: string;
	clinicInfoConfirmed: boolean;
	serviceListConfirmed: boolean;
	paidBasisConfirmed: boolean;
	writtenChangesConfirmed: boolean;
}

export interface PaidContractRequiredFieldsReview {
	/** Сколько обязательных позиций у договора всего (без автоподставляемых дат). */
	requiredCount: number;
	/** Незаполненные, в том же порядке, в каком о них ругается проверка. */
	missing: PaidContractMissingField[];
}

/**
 * Формулировка, которой проверка договора закрывает пустое основание обращения.
 * Дословно повторяет paidContractCareReasonValue в useAppLogic.tsx: если там
 * когда-нибудь уберут запас, основание начнёт попадать в список само.
 */
const CARE_REASON_FALLBACK =
	"плановое стоматологическое лечение по результатам осмотра";

function filled(value: string): string {
	return String(value ?? "").trim();
}

/**
 * Разбор одного текстового условия договора, которое хранилище заполняет
 * шаблоном. Пустым оно бывает только если текст стёрли руками — подсказка
 * говорит именно это, иначе человек ищет несуществующую кнопку «вернуть».
 */
function erasedClauseHint(what: string): string {
	return `текст стёрт — впишите условие своими словами: ${what}`;
}

export function paidContractRequiredFieldsReview(
	input: PaidContractRequiredFieldsInput,
): PaidContractRequiredFieldsReview {
	const customer = filled(input.customerFullName) || filled(input.patientFullName);
	const careReason =
		filled(input.careReason) || filled(input.visitComplaint) || CARE_REASON_FALLBACK;
	const serviceScope =
		filled(input.serviceScope) ||
		filled(input.visitTreatmentPlan) ||
		filled(input.visitDoctorSummary);
	const doctor = filled(input.doctorFullName) || filled(input.activeDoctorFullName);

	/*
	 * Порядок — как в валидаторе. `ok` описывает заполненность, а не наличие
	 * текста в поле: заказчик и врач считаются заполненными подстановкой из
	 * приёма, и требовать их повторно значит врать человеку.
	 */
	const checks: Array<PaidContractMissingField & { ok: boolean }> = [
		{
			field: "paidContractNumber",
			label: "Номер договора",
			hint: "впишите номер по журналу договоров клиники, например ДПМУ-2026-001",
			ok: filled(input.contractNumber) !== "",
		},
		{
			field: "paidContractServiceStart",
			label: "Начало оказания",
			hint: "дата и время первого этапа лечения",
			ok: filled(input.serviceStart) !== "",
		},
		{
			field: "paidContractServiceEnd",
			label: "Завершение",
			hint: "дата или условие окончания, например «до подписания акта»",
			ok: filled(input.serviceEnd) !== "",
		},
		{
			field: "paidContractCustomerFullName",
			label: "Заказчик",
			hint: "пациент приёма не выбран, подставить некого — впишите ФИО заказчика",
			ok: customer !== "",
		},
		{
			field: "paidContractCareReason",
			label: "Основание обращения",
			hint: "жалоба, диагноз или плановый повод обращения",
			ok: careReason !== "",
		},
		{
			field: "paidContractServiceScope",
			label: "Состав услуг",
			hint: "в приёме нет плана лечения — перечислите согласованные платные услуги",
			ok: serviceScope !== "",
		},
		{
			field: "paidContractTotalRub",
			label: "Сумма договора",
			hint: "из принятого плана лечения сумма не посчиталась — впишите ориентировочную стоимость цифрами",
			ok: input.totalRub > 0,
		},
		{
			field: "paidContractPaymentTerms",
			label: "Порядок оплаты",
			hint: erasedClauseHint("когда и чем платит пациент, выдаётся ли чек"),
			ok: filled(input.paymentTerms) !== "",
		},
		{
			field: "paidContractPriceChangeRules",
			label: "Изменение цены и объема",
			hint: erasedClauseHint("как оформляется изменение состава услуг или стоимости"),
			ok: filled(input.priceChangeRules) !== "",
		},
		{
			field: "paidContractFreeCareNotice",
			label: "Уведомление о бесплатной помощи",
			hint: erasedClauseHint(
				"что пациенту разъяснена возможность помощи по государственным гарантиям",
			),
			ok: filled(input.freeCareNotice) !== "",
		},
		{
			field: "paidContractRecommendationWarning",
			label: "Предупреждение о рекомендациях врача",
			hint: erasedClauseHint("чем грозит несоблюдение назначений врача"),
			ok: filled(input.recommendationWarning) !== "",
		},
		{
			field: "paidContractRefundTerms",
			label: "Отказ и возврат",
			hint: erasedClauseHint("что оплачивается при отказе пациента от лечения"),
			ok: filled(input.refundTerms) !== "",
		},
		{
			field: "paidContractWarrantyTerms",
			label: "Гарантия и претензии",
			hint: erasedClauseHint("на каких условиях действует гарантия клиники"),
			ok: filled(input.warrantyTerms) !== "",
		},
		{
			field: "paidContractDoctorFullName",
			label: "Ответственный врач",
			hint: "врач приёма не определён, подставить некого — впишите ФИО лечащего врача",
			ok: doctor !== "",
		},
		{
			field: "paidContractClinicInfoConfirmed",
			label: "Сведения о клинике и лицензии переданы",
			hint: "поставьте отметку, когда пациент их получил",
			ok: input.clinicInfoConfirmed,
		},
		{
			field: "paidContractServiceListConfirmed",
			label: "Перечень услуг и стоимость переданы",
			hint: "поставьте отметку, когда пациент их получил до подписания",
			ok: input.serviceListConfirmed,
		},
		{
			field: "paidContractPaidBasisConfirmed",
			label: "Платная основа услуг понятна пациенту",
			hint: "поставьте отметку, когда объяснили пациенту платную основу лечения",
			ok: input.paidBasisConfirmed,
		},
		{
			field: "paidContractWrittenChangesConfirmed",
			label: "Изменения оформляются письменно",
			hint: "поставьте отметку, когда пациент об этом предупреждён",
			ok: input.writtenChangesConfirmed,
		},
	];

	return {
		requiredCount: checks.length,
		missing: checks
			.filter((check) => !check.ok)
			.map(({ field, label, hint }) => ({ field, label, hint })),
	};
}
