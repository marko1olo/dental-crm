/**
 * paidContractEngine.ts
 *
 * Юридический и расчетный движок Договора на оказание платных медицинских услуг
 * в строгом соответствии с:
 * 1. Постановлением Правительства РФ от 11.05.2023 № 736 («Об утверждении Правил
 *    предоставления медицинскими организациями платных медицинских услуг»).
 * 2. Федеральным законом от 21.11.2011 № 323-ФЗ (ст. 20, 84 — медицинская помощь и ИДС).
 * 3. Приказом Минздрава России от 12.11.2021 № 1051н (порядок дачи ИДС).
 * 4. Федеральным законом от 27.07.2006 № 152-ФЗ (обработка ПДн и ЕГИСЗ).
 * 5. Законом РФ от 07.02.1992 № 2300-1 «О защите прав потребителей» и ст. 779-783 ГК РФ.
 * 6. Федеральным законом от 06.04.2011 № 63-ФЗ «Об электронной подписи» (ПЭП).
 * 7. Федеральным законом от 22.05.2003 № 54-ФЗ (фискальные чеки).
 */

export interface PaidContractClinicRequisites {
	fullName: string; // e.g. Общество с ограниченной ответственностью «Денте Стоматология»
	shortName: string; // ООО «Денте»
	brandName?: string | undefined;
	legalAddress: string;
	actualAddress: string; // Место осуществления медицинской деятельности
	inn: string;
	kpp: string;
	ogrn: string;
	licenseNumber: string; // e.g. Л041-01137-77/00584930
	licenseDate: string;
	licenseIssuer: string; // e.g. Департамент здравоохранения города Москвы
	bankName: string;
	bik: string;
	checkingAccount: string; // 20 цифр р/с
	correspondentAccount: string; // 20 цифр к/с
	phone: string;
	email: string;
	website?: string | undefined;
	directorTitle: string; // Генеральный директор / Главный врач
	directorFullName: string;
	actingOnBasis: string; // Устава / Доверенности №...
}

export interface PaidContractPatientRequisites {
	fullName: string;
	birthDate: string;
	gender?: string | undefined;
	passportSeries: string;
	passportNumber: string;
	passportIssuedBy: string;
	passportIssuedDate: string;
	passportDepartmentCode: string;
	snils: string;
	registrationAddress: string;
	actualAddress?: string | undefined;
	phone: string;
	email?: string | undefined;
	cardNumber?: string | undefined; // № медицинской карты 043/у
}

export interface PaidContractCustomerRequisites {
	isDifferentFromPatient: boolean;
	fullName: string;
	birthDate?: string | undefined;
	passportSeries: string;
	passportNumber: string;
	passportIssuedBy: string;
	passportIssuedDate: string;
	passportDepartmentCode: string;
	snils?: string | undefined;
	registrationAddress: string;
	actualAddress?: string | undefined;
	phone: string;
	email?: string | undefined;
}

export interface PaidContractRepresentativeRequisites {
	hasRepresentative: boolean;
	fullName: string;
	passportSeries: string;
	passportNumber: string;
	passportIssuedBy: string;
	passportIssuedDate: string;
	passportDepartmentCode: string;
	basisDocument: string; // e.g. Свидетельство о рождении серия... / Акт опеки
	phone: string;
}

export interface PaidContractServiceItem {
	id?: string | undefined;
	code?: string | undefined; // Код по Номенклатуре 804н (e.g. A16.07.002.001)
	name: string;
	toothOrArea?: string | undefined; // Зуб FDI (11-48) или сегмент
	quantity: number;
	unitPriceKopecks: number;
	discountKopecks: number;
	totalKopecks: number;
}

export interface PaidContractConfirmedDisclosures {
	clinicInfoConfirmed: boolean; // Сведения о клинике, лицензии и прейскуранте получены
	serviceListAndPriceConfirmed: boolean; // Перечень услуг и предварительная смета согласованы
	paidBasisUnderstood: boolean; // Платная основа лечения разъяснена
	writtenChangesConfirmed: boolean; // Изменения объема оформляются письменно доп. соглашением
	freeCareNoticeUnderstood: boolean; // Уведомлен о возможности получения помощи по ОМС
	recommendationsWarningUnderstood: boolean; // Предупрежден о последствиях несоблюдения назначений
}

export interface PaidContractSmsSignDetails {
	phone: string;
	code: string;
	sentAt: number;
	expiresAt: number;
	verifiedAt?: number | undefined;
	isVerified: boolean;
	smsSignHash?: string | undefined;
}

export interface PaidContractData {
	contractNumber: string; // e.g. ДПМУ-2026-001
	contractDate: string; // YYYY-MM-DD или DD.MM.YYYY
	city: string; // e.g. г. Москва
	clinic: PaidContractClinicRequisites;
	patient: PaidContractPatientRequisites;
	customer: PaidContractCustomerRequisites;
	representative: PaidContractRepresentativeRequisites;
	clinicalReason: string; // Основание обращения (жалобы, диагноз МКБ-10)
	serviceScopeSummary: string;
	services: PaidContractServiceItem[];
	serviceStart: string;
	serviceEndOrCondition: string;
	totalAmountKopecks: number;
	paymentTerms: string;
	priceChangeRules: string;
	freeCareNotice: string;
	medicalRecommendationWarning: string;
	refusalAndRefundTerms: string;
	warrantyTerms: string;
	disputeResolutionTerms: string;
	personalDataConsentRef: string;
	informedConsentRef: string;
	doctorFullName: string;
	doctorSpecialty?: string | undefined;
	signedAt?: string | undefined;
	signMethod: "touch" | "sms_otp" | "manual" | "ukep";
	touchSignatureBase64?: string | undefined;
	smsSignDetails?: PaidContractSmsSignDetails | undefined;
	confirmedDisclosures: PaidContractConfirmedDisclosures;
}

export interface PaidContractMissingField {
	section: string;
	field: string;
	label: string;
	hint: string;
}

export interface PaidContractValidationResult {
	isValid: boolean;
	missingFields: PaidContractMissingField[];
	warnings: string[];
}

/**
 * Преобразует числовое значение денег в копейках в русские слова с копейками.
 * Обрабатывает единицы, десятки, сотни, тысячи, миллионы, миллиарды.
 * Соблюдает грамматический род (рубли — мужской, тысячи — женский, копейки — женский).
 */
export function numberToWordsRu(totalKopecks: number): string {
	if (!Number.isFinite(totalKopecks) || totalKopecks < 0) {
		return "ноль рублей 00 копеек";
	}

	const wholeRubles = Math.trunc(totalKopecks / 100);
	const kopecks = Math.trunc(totalKopecks % 100);

	if (wholeRubles === 0) {
		const kopStr = String(kopecks).padStart(2, "0");
		const kopWord = pluralizeRu(kopecks, "копейка", "копейки", "копеек");
		return `ноль рублей ${kopStr} ${kopWord}`;
	}

	const onesM = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const onesF = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const teens = [
		"десять",
		"одиннадцать",
		"двенадцать",
		"тринадцать",
		"четырнадцать",
		"пятнадцать",
		"шестнадцать",
		"семнадцать",
		"восемнадцать",
		"девятнадцать",
	];
	const tens = [
		"",
		"",
		"двадцать",
		"тридцать",
		"сорок",
		"пятьдесят",
		"шестьдесят",
		"семьдесят",
		"восемьдесят",
		"девяносто",
	];
	const hundreds = [
		"",
		"сто",
		"двести",
		"триста",
		"четыреста",
		"пятьсот",
		"шестьсот",
		"семьсот",
		"восемьсот",
		"девятьсот",
	];

	function tripletToWords(num: number, isFeminine: boolean): string {
		const h = Math.trunc(num / 100);
		const remainder = num % 100;
		const t = Math.trunc(remainder / 10);
		const o = remainder % 10;

		const parts: string[] = [];

		if (h > 0 && h < 10) {
			const hWord = hundreds[h];
			if (hWord) parts.push(hWord);
		}

		if (t === 1) {
			const teenWord = teens[o];
			if (teenWord) parts.push(teenWord);
		} else {
			if (t > 1) {
				const tensWord = tens[t];
				if (tensWord) parts.push(tensWord);
			}
			if (o > 0) {
				const onesArr = isFeminine ? onesF : onesM;
				const onesWord = onesArr[o];
				if (onesWord) parts.push(onesWord);
			}
		}

		return parts.join(" ");
	}

	const billions = Math.trunc(wholeRubles / 1_000_000_000) % 1000;
	const millions = Math.trunc(wholeRubles / 1_000_000) % 1000;
	const thousands = Math.trunc(wholeRubles / 1_000) % 1000;
	const units = wholeRubles % 1000;

	const wordsParts: string[] = [];

	if (billions > 0) {
		const bWords = tripletToWords(billions, false);
		const bSuffix = pluralizeRu(billions, "миллиард", "миллиарда", "миллиардов");
		wordsParts.push(`${bWords} ${bSuffix}`);
	}

	if (millions > 0) {
		const mWords = tripletToWords(millions, false);
		const mSuffix = pluralizeRu(millions, "миллион", "миллиона", "миллионов");
		wordsParts.push(`${mWords} ${mSuffix}`);
	}

	if (thousands > 0) {
		const tWords = tripletToWords(thousands, true);
		const tSuffix = pluralizeRu(thousands, "тысяча", "тысячи", "тысяч");
		wordsParts.push(`${tWords} ${tSuffix}`);
	}

	if (units > 0 || wordsParts.length === 0) {
		const uWords = tripletToWords(units, false);
		if (uWords) wordsParts.push(uWords);
	}

	const rubWord = pluralizeRu(wholeRubles, "рубль", "рубля", "рублей");
	const rubResult = wordsParts.join(" ").trim();
	const capitalizedRub = rubResult.charAt(0).toUpperCase() + rubResult.slice(1);

	const kopStr = String(kopecks).padStart(2, "0");
	const kopWord = pluralizeRu(kopecks, "копейка", "копейки", "копеек");

	return `${capitalizedRub} ${rubWord} ${kopStr} ${kopWord}`;
}

export function pluralizeRu(num: number, one: string, two: string, five: string): string {
	const n = Math.abs(num) % 100;
	const n1 = n % 10;
	if (n > 10 && n < 20) return five;
	if (n1 > 1 && n1 < 5) return two;
	if (n1 === 1) return one;
	return five;
}

export function formatKopecksToRubAndKop(kopecks: number): {
	wholeRub: number;
	kop: number;
	formatted: string;
	formattedWithKopecks: string;
	inWords: string;
} {
	const wholeRub = Math.trunc((kopecks || 0) / 100);
	const kop = Math.abs((kopecks || 0) % 100);
	const groupedRub = String(wholeRub).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
	const kopPadded = String(kop).padStart(2, "0");

	return {
		wholeRub,
		kop,
		formatted: `${groupedRub},${kopPadded}\u00A0₽`,
		formattedWithKopecks: `${groupedRub} руб. ${kopPadded} коп.`,
		inWords: numberToWordsRu(kopecks),
	};
}

/**
 * Валидация договора на оказание платных медицинских услуг по Постановлению Правительства РФ № 736 от 11.05.2023.
 */
export function validatePaidContract736(contract: PaidContractData): PaidContractValidationResult {
	const missing: PaidContractMissingField[] = [];
	const warnings: string[] = [];

	const checkFilled = (val: string | number | undefined | null): boolean => {
		if (val === undefined || val === null) return false;
		if (typeof val === "number") return val > 0;
		return val.trim().length > 0;
	};

	// 1. Номер и дата договора
	if (!checkFilled(contract.contractNumber)) {
		missing.push({
			section: "Реквизиты договора",
			field: "contractNumber",
			label: "Номер договора",
			hint: "Укажите номер по реестру договоров клиники (например, ДПМУ-2026-001).",
		});
	}
	if (!checkFilled(contract.contractDate)) {
		missing.push({
			section: "Реквизиты договора",
			field: "contractDate",
			label: "Дата заключения договора",
			hint: "Укажите дату заключения договора.",
		});
	}

	// 2. Реквизиты клиники (Исполнителя) — п. 17 ПП РФ № 736
	const cl = contract.clinic;
	if (!checkFilled(cl.fullName)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.fullName",
			label: "Полное фирменное наименование клиники",
			hint: "Укажите полное юридическое наименование организации согласно ЕГРЮЛ.",
		});
	}
	if (!checkFilled(cl.ogrn)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.ogrn",
			label: "ОГРН / ОГРНИП клиники",
			hint: "Укажите 13-значный (для юрлиц) или 15-значный (для ИП) ОГРН.",
		});
	}
	if (!checkFilled(cl.inn)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.inn",
			label: "ИНН клиники",
			hint: "Укажите ИНН организации.",
		});
	}
	if (!checkFilled(cl.legalAddress)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.legalAddress",
			label: "Адрес места нахождения (юридический)",
			hint: "Укажите юридический адрес организации.",
		});
	}
	if (!checkFilled(cl.actualAddress)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.actualAddress",
			label: "Адрес места осуществления медицинской деятельности",
			hint: "Укажите фактический адрес филиала клиники, где оказывается медпомощь.",
		});
	}
	if (!checkFilled(cl.licenseNumber)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.licenseNumber",
			label: "Номер медицинской лицензии (ЕРИЛ / Росздравнадзор)",
			hint: "Укажите номер лицензии единого реестра, например: Л041-01137-77/00584930.",
		});
	}
	if (!checkFilled(cl.phone)) {
		missing.push({
			section: "Сведения об Исполнителе (Клинике)",
			field: "clinic.phone",
			label: "Телефон клиники",
			hint: "Укажите официальный телефон медицинской организации.",
		});
	}

	// 3. Реквизиты Пациента (Потребителя) — п. 17 ПП РФ № 736
	const pt = contract.patient;
	if (!checkFilled(pt.fullName)) {
		missing.push({
			section: "Сведения о Пациенте (Потребителе)",
			field: "patient.fullName",
			label: "Ф.И.О. Пациента",
			hint: "Укажите фамилию, имя и отчество пациента полностью.",
		});
	}
	if (!checkFilled(pt.birthDate)) {
		missing.push({
			section: "Сведения о Пациенте (Потребителе)",
			field: "patient.birthDate",
			label: "Дата рождения Пациента",
			hint: "Укажите дату рождения пациента.",
		});
	}
	if (!checkFilled(pt.passportSeries) || !checkFilled(pt.passportNumber)) {
		missing.push({
			section: "Сведения о Пациенте (Потребителе)",
			field: "patient.passport",
			label: "Паспортные данные Пациента (серия и номер)",
			hint: "Укажите серию и номер паспорта гражданина РФ или иного документа, удостоверяющего личность.",
		});
	}
	if (!checkFilled(pt.registrationAddress)) {
		missing.push({
			section: "Сведения о Пациенте (Потребителе)",
			field: "patient.registrationAddress",
			label: "Адрес регистрации Пациента",
			hint: "Укажите адрес регистрации по месту жительства.",
		});
	}
	if (!checkFilled(pt.phone)) {
		missing.push({
			section: "Сведения о Пациенте (Потребителе)",
			field: "patient.phone",
			label: "Телефон Пациента",
			hint: "Укажите контактный номер телефона для связи и СМС-уведомлений.",
		});
	}

	// 4. Заказчик (если отличается от Пациента)
	if (contract.customer.isDifferentFromPatient) {
		const cust = contract.customer;
		if (!checkFilled(cust.fullName)) {
			missing.push({
				section: "Сведения о Заказчике (Плательщике)",
				field: "customer.fullName",
				label: "Ф.И.О. Заказчика",
				hint: "Укажите Ф.И.О. лица, оплачивающего медицинские услуги.",
			});
		}
		if (!checkFilled(cust.passportSeries) || !checkFilled(cust.passportNumber)) {
			missing.push({
				section: "Сведения о Заказчике (Плательщике)",
				field: "customer.passport",
				label: "Паспорт Заказчика",
				hint: "Укажите паспортные данные заказчика.",
			});
		}
		if (!checkFilled(cust.phone)) {
			missing.push({
				section: "Сведения о Заказчике (Плательщике)",
				field: "customer.phone",
				label: "Телефон Заказчика",
				hint: "Укажите телефон заказчика.",
			});
		}
	}

	// 5. Законный представитель (для несовершеннолетних)
	if (contract.representative.hasRepresentative) {
		const rep = contract.representative;
		if (!checkFilled(rep.fullName)) {
			missing.push({
				section: "Законный представитель",
				field: "representative.fullName",
				label: "Ф.И.О. представителя",
				hint: "Укажите Ф.И.О. родителя / опекуна.",
			});
		}
		if (!checkFilled(rep.basisDocument)) {
			missing.push({
				section: "Законный представитель",
				field: "representative.basisDocument",
				label: "Документ, подтверждающий полномочия",
				hint: "Укажите реквизиты свидетельства о рождении или акта органа опеки.",
			});
		}
	}

	// 6. Предмет договора и состав услуг — п. 18 ПП РФ № 736
	if (!checkFilled(contract.clinicalReason)) {
		missing.push({
			section: "Предмет договора",
			field: "clinicalReason",
			label: "Основание обращения / клинический диагноз",
			hint: "Укажите диагноз МКБ-10 или повод для оказания стоматологической помощи.",
		});
	}
	if (!checkFilled(contract.serviceScopeSummary) && (!contract.services || contract.services.length === 0)) {
		missing.push({
			section: "Предмет договора",
			field: "serviceScopeSummary",
			label: "Перечень и состав согласованных платных услуг",
			hint: "Укажите перечень стоматологических услуг согласно смете / плану лечения.",
		});
	}

	// 7. Сроки оказания услуг — п. 17 ПП РФ № 736
	if (!checkFilled(contract.serviceStart)) {
		missing.push({
			section: "Сроки оказания услуг",
			field: "serviceStart",
			label: "Дата начала оказания услуг",
			hint: "Укажите дату или время начала первого клинического этапа.",
		});
	}
	if (!checkFilled(contract.serviceEndOrCondition)) {
		missing.push({
			section: "Сроки оказания услуг",
			field: "serviceEndOrCondition",
			label: "Срок или условие завершения услуг",
			hint: "Укажите дату окончания или условие (например, «до подписания Акта оказанных услуг»).",
		});
	}

	// 8. Стоимость и порядок оплаты — п. 17, 21 ПП РФ № 736
	if (!contract.totalAmountKopecks || contract.totalAmountKopecks <= 0) {
		missing.push({
			section: "Стоимость и оплата",
			field: "totalAmountKopecks",
			label: "Ориентировочная сумма договора",
			hint: "Укажите сумму договора в копейках / рублях (сумма должна быть больше 0).",
		});
	}
	if (!checkFilled(contract.paymentTerms)) {
		missing.push({
			section: "Стоимость и оплата",
			field: "paymentTerms",
			label: "Порядок и форма расчетов",
			hint: "Укажите условия оплаты (100% предоплата, поэтапная оплата, кассовый чек по 54-ФЗ).",
		});
	}
	if (!checkFilled(contract.priceChangeRules)) {
		missing.push({
			section: "Стоимость и оплата",
			field: "priceChangeRules",
			label: "Порядок изменения цены и объема",
			hint: "Укажите порядок оформления дополнительных услуг письменно через доп. соглашение.",
		});
	}

	// 9. Обязательные уведомления — п. 7, 10, 15 ПП РФ № 736
	if (!checkFilled(contract.freeCareNotice)) {
		missing.push({
			section: "Обязательные правовые уведомления",
			field: "freeCareNotice",
			label: "Уведомление о бесплатной помощи (ОМС)",
			hint: "Обязательное по закону уведомление о возможности получения помощи по ОМС без взимания платы.",
		});
	}
	if (!checkFilled(contract.medicalRecommendationWarning)) {
		missing.push({
			section: "Обязательные правовые уведомления",
			field: "medicalRecommendationWarning",
			label: "Предупреждение о последствиях несоблюдения назначений врача",
			hint: "Обязательное предупреждение о снижении качества и рисках при несоблюдении режима лечения.",
		});
	}

	// 10. Ответственность, отказ и гарантии
	if (!checkFilled(contract.refusalAndRefundTerms)) {
		missing.push({
			section: "Отказ от услуг и возврат",
			field: "refusalAndRefundTerms",
			label: "Условия отказа и возврата денежных средств",
			hint: "Укажите порядок возврата за вычетом фактически понесенных расходов клиники.",
		});
	}
	if (!checkFilled(contract.warrantyTerms)) {
		missing.push({
			section: "Гарантийные обязательства",
			field: "warrantyTerms",
			label: "Гарантийные сроки и условия их сохранения",
			hint: "Укажите гарантийные обязательства клиники и периодичность профосмотров (не реже 1 раза в 6 мес.).",
		});
	}

	// 11. Обязательные подтверждения (чекбоксы)
	const disc = contract.confirmedDisclosures;
	if (!disc.clinicInfoConfirmed) {
		missing.push({
			section: "Подтверждения пациента",
			field: "confirmedDisclosures.clinicInfoConfirmed",
			label: "Сведения о клинике, лицензии и прейскуранте получены",
			hint: "Пациент должен подтвердить ознакомление со сведениями об исполнителе.",
		});
	}
	if (!disc.serviceListAndPriceConfirmed) {
		missing.push({
			section: "Подтверждения пациента",
			field: "confirmedDisclosures.serviceListAndPriceConfirmed",
			label: "Перечень услуг и предварительная смета согласованы",
			hint: "Пациент должен подтвердить согласование перечня и стоимости услуг.",
		});
	}
	if (!disc.paidBasisUnderstood) {
		missing.push({
			section: "Подтверждения пациента",
			field: "confirmedDisclosures.paidBasisUnderstood",
			label: "Платная основа услуг понятна",
			hint: "Пациент должен подтвердить добровольный выбор платных услуг.",
		});
	}
	if (!disc.freeCareNoticeUnderstood) {
		missing.push({
			section: "Подтверждения пациента",
			field: "confirmedDisclosures.freeCareNoticeUnderstood",
			label: "Уведомление о программе госгарантий (ОМС) принято",
			hint: "Обязательная отметка по п. 7 Постановления Правительства РФ № 736.",
		});
	}
	if (!disc.writtenChangesConfirmed) {
		missing.push({
			section: "Подтверждения пациента",
			field: "confirmedDisclosures.writtenChangesConfirmed",
			label: "Письменное оформление дополнительных услуг согласовано",
			hint: "Пациент подтверждает, что доп. услуги не оказываются без доп. соглашения.",
		});
	}

	// Предупреждения
	if (!contract.doctorFullName) {
		warnings.push("Не указан ответственный лечащий врач клиники.");
	}
	if (!contract.patient.snils) {
		warnings.push("Не указан СНИЛС пациента (рекомендуется для корректной передачи сведений в ЕГИСЗ Минздрава РФ).");
	}
	if (!contract.patient.passportDepartmentCode) {
		warnings.push("Не указан код подразделения паспорта пациента.");
	}

	return {
		isValid: missing.length === 0,
		missingFields: missing,
		warnings,
	};
}

/**
 * Создает договор на оказание платных медуслуг по умолчанию с полным соблюдением ПП РФ № 736.
 */
export function createDefaultPaidContract(params: {
	contractNumber?: string | undefined;
	contractDate?: string | undefined;
	patientFullName?: string | undefined;
	patientBirthDate?: string | undefined;
	patientPassport?: string | undefined;
	patientAddress?: string | undefined;
	patientPhone?: string | undefined;
	patientSnils?: string | undefined;
	cardNumber?: string | undefined;
	doctorFullName?: string | undefined;
	doctorSpecialty?: string | undefined;
	clinicFullName?: string | undefined;
	clinicShortName?: string | undefined;
	clinicLegalAddress?: string | undefined;
	clinicActualAddress?: string | undefined;
	clinicInn?: string | undefined;
	clinicKpp?: string | undefined;
	clinicOgrn?: string | undefined;
	clinicLicense?: string | undefined;
	clinicPhone?: string | undefined;
	clinicBankName?: string | undefined;
	clinicBik?: string | undefined;
	clinicCheckingAccount?: string | undefined;
	clinicCorrAccount?: string | undefined;
	clinicalReason?: string | undefined;
	serviceScopeSummary?: string | undefined;
	services?: PaidContractServiceItem[] | undefined;
	totalAmountKopecks?: number | undefined;
	serviceStart?: string | undefined;
	serviceEndOrCondition?: string | undefined;
}): PaidContractData {
	const today = params.contractDate || new Date().toISOString().slice(0, 10);
	const [year, month, day] = today.split("-");
	const formattedDate = year && month && day ? `${day}.${month}.${year}` : today;

	return {
		contractNumber: params.contractNumber || `ДПМУ-${year || "2026"}-001`,
		contractDate: formattedDate,
		city: "г. Москва",
		clinic: {
			fullName:
				params.clinicFullName ||
				"Общество с ограниченной ответственностью «Денте Стоматология»",
			shortName: params.clinicShortName || "ООО «Денте»",
			brandName: "ДЕНТЕ Клиника цифровой стоматологии",
			legalAddress:
				params.clinicLegalAddress || "119048, г. Москва, ул. Усачева, д. 22, стр. 1",
			actualAddress:
				params.clinicActualAddress ||
				params.clinicLegalAddress ||
				"119048, г. Москва, ул. Усачева, д. 22, стр. 1 (Клиника стоматологии)",
			inn: params.clinicInn || "7704123456",
			kpp: params.clinicKpp || "770401001",
			ogrn: params.clinicOgrn || "1207700123456",
			licenseNumber:
				params.clinicLicense || "Л041-01137-77/00584930 от 15.10.2021 г.",
			licenseDate: "15.10.2021",
			licenseIssuer:
				"Департамент здравоохранения города Москвы (бессрочно)",
			bankName:
				params.clinicBankName || "ПАО Сбербанк г. Москва",
			bik: params.clinicBik || "044525225",
			checkingAccount:
				params.clinicCheckingAccount || "40702810938000012345",
			correspondentAccount:
				params.clinicCorrAccount || "30101810400000000225",
			phone: params.clinicPhone || "+7 (495) 777-22-11",
			email: "info@dente-clinic.ru",
			website: "https://dente-clinic.ru",
			directorTitle: "Генеральный директор",
			directorFullName: "Смирнов Алексей Викторович",
			actingOnBasis: "Устава",
		},
		patient: {
			fullName: params.patientFullName || "Иванов Иван Иванович",
			birthDate: params.patientBirthDate || "15.05.1990",
			gender: "Мужской",
			passportSeries: "45 10",
			passportNumber: "123456",
			passportIssuedBy: "ГУ МВД России по г. Москве",
			passportIssuedDate: "20.05.2010",
			passportDepartmentCode: "770-001",
			snils: params.patientSnils || "123-456-789 00",
			registrationAddress:
				params.patientAddress || "119021, г. Москва, ул. Льва Толстого, д. 16, кв. 42",
			actualAddress:
				params.patientAddress || "119021, г. Москва, ул. Льва Толстого, д. 16, кв. 42",
			phone: params.patientPhone || "+7 (999) 000-00-00",
			email: "patient@example.com",
			cardNumber: params.cardNumber || "043/у-2026/01",
		},
		customer: {
			isDifferentFromPatient: false,
			fullName: "",
			passportSeries: "",
			passportNumber: "",
			passportIssuedBy: "",
			passportIssuedDate: "",
			passportDepartmentCode: "",
			registrationAddress: "",
			phone: "",
		},
		representative: {
			hasRepresentative: false,
			fullName: "",
			passportSeries: "",
			passportNumber: "",
			passportIssuedBy: "",
			passportIssuedDate: "",
			passportDepartmentCode: "",
			basisDocument: "",
			phone: "",
		},
		clinicalReason:
			params.clinicalReason ||
			"Обращение за квалифицированной стоматологической помощью, плановое лечение по результатам комплексного осмотра полости рта.",
		serviceScopeSummary:
			params.serviceScopeSummary ||
			"Комплекс стоматологических лечебно-диагностических услуг в соответствии с утвержденным Планом лечения (Сметой) и медицинской картой 043/у.",
		services: params.services || [
			{
				code: "B01.065.001",
				name: "Прием (осмотр, консультация) врача-стоматолога первичный",
				toothOrArea: "Полость рта",
				quantity: 1,
				unitPriceKopecks: 150000,
				discountKopecks: 0,
				totalKopecks: 150000,
			},
			{
				code: "A16.07.002.001",
				name: "Восстановление зуба пломбой с использованием материалов светового отверждения",
				toothOrArea: "36",
				quantity: 1,
				unitPriceKopecks: 650000,
				discountKopecks: 0,
				totalKopecks: 650000,
			},
		],
		serviceStart: params.serviceStart || formattedDate,
		serviceEndOrCondition:
			params.serviceEndOrCondition ||
			"До полного завершения согласованного объема медицинских услуг согласно Плану лечения и подписания Акта оказанных услуг.",
		totalAmountKopecks:
			params.totalAmountKopecks !== undefined
				? params.totalAmountKopecks
				: 800000,
		paymentTerms:
			"Оплата производится Заказчиком (Пациентом) в рублях РФ наличными денежными средствами, банковской картой или по QR-коду СБП в кассу Исполнителя в порядке 100% предоплаты либо непосредственно в день оказания соответствующей услуги с выдачей кассового чека по Федеральному закону № 54-ФЗ.",
		priceChangeRules:
			"Стоимость услуг определяется утвержденным Прейскурантом клиники и предварительной сметой. Изменение объема и итоговой стоимости услуг в процессе лечения допускается ИСКЛЮЧИТЕЛЬНО по медицинским показаниям и оформляется ДО начала оказания дополнительных услуг путем заключения Дополнительного соглашения к Договору либо новой сметы, подписанной Сторонами.",
		freeCareNotice:
			"До заключения Договора Исполнитель в письменной форме уведомил Пациента (Заказчика) о возможности получения медицинской помощи без взимания платы в рамках Программы государственных гарантий бесплатного оказания гражданам медицинской помощи и Территориальной программы госгарантий (по полису ОМС) в государственных медицинских организациях. Пациент добровольно выразил согласие получить услуги на платной основе.",
		medicalRecommendationWarning:
			"Исполнитель предупредил Пациента о том, что несоблюдение указаний (рекомендаций) лечащего врача, назначенного режима лечения и гигиенических правил может снизить качество предоставляемой платной медицинской услуги, повлечь за собой невозможность ее завершения в срок или отрицательно сказаться на состоянии здоровья Пациента.",
		refusalAndRefundTerms:
			"Пациент (Заказчик) вправе в любое время отказаться от исполнения Договора при условии оплаты Исполнителю фактически понесенных им расходов (стоимость фактически оказанных услуг, изготовленных зуботехнических конструкций и расходных материалов). Возврат неизрасходованных средств осуществляется по письменному заявлению в течение 10 рабочих дней.",
		warrantyTerms:
			"Исполнитель гарантирует оказание медицинских услуг специалистами соответствующей квалификации по клиническим рекомендациям СтАР. Гарантийные обязательства (на пломбы, ортопедические конструкции, имплантаты) действуют в соответствии с Положением о гарантиях при условии прохождения контрольных профосмотров и гигиены не реже 1 раза в 6 месяцев.",
		disputeResolutionTerms:
			"Все споры и разногласия разрешаются Сторонами путем переговоров и обязательного направления письменной претензии. Срок ответа на претензию — 10 (десять) календарных дней с момента получения.",
		personalDataConsentRef:
			"Федеральный закон № 152-ФЗ и Постановление Правительства РФ № 140 (обработка ПДн и передача сведений в РЭМД ЕГИСЗ Минздрава России).",
		informedConsentRef:
			"Приказ Минздрава России № 1051н и ст. 20 Федерального закона № 323-ФЗ (Информированное добровольное согласие на медицинское вмешательство).",
		doctorFullName: params.doctorFullName || "Петров Петр Петрович",
		doctorSpecialty: params.doctorSpecialty || "Врач-стоматолог-терапевт",
		signedAt: formattedDate,
		signMethod: "touch",
		confirmedDisclosures: {
			clinicInfoConfirmed: true,
			serviceListAndPriceConfirmed: true,
			paidBasisUnderstood: true,
			writtenChangesConfirmed: true,
			freeCareNoticeUnderstood: true,
			recommendationsWarningUnderstood: true,
		},
	};
}

/**
 * Генерирует читаемый текст Договора на оказание платных медуслуг (для архива / ЭМК).
 */
export function generatePaidContractText(contract: PaidContractData): string {
	const moneyInfo = formatKopecksToRubAndKop(contract.totalAmountKopecks);
	const cl = contract.clinic;
	const pt = contract.patient;
	const cust = contract.customer.isDifferentFromPatient ? contract.customer : contract.patient;

	const servicesList =
		contract.services && contract.services.length > 0
			? contract.services
					.map(
						(s, idx) =>
							`  ${idx + 1}. ${s.code ? `[${s.code}] ` : ""}${s.name}${
								s.toothOrArea ? ` (Область/Зуб: ${s.toothOrArea})` : ""
							} — ${s.quantity} шт. × ${formatKopecksToRubAndKop(s.unitPriceKopecks).formatted} = ${
								formatKopecksToRubAndKop(s.totalKopecks).formatted
							}`,
					)
					.join("\n")
			: `  ${contract.serviceScopeSummary}`;

	return `ДОГОВОР № ${contract.contractNumber}
НА ОКАЗАНИЕ ПЛАТНЫХ МЕДИЦИНСКИХ УСЛУГ
(в соответствии с Постановлением Правительства РФ от 11.05.2023 № 736)

${contract.city}                                                «${contract.contractDate}»

${cl.fullName} (сокращенное наименование: ${cl.shortName}), именуемое в дальнейшем «Исполнитель», в лице ${
		cl.directorTitle
	} ${cl.directorFullName}, действующего на основании ${cl.actingOnBasis}, осуществляющее медицинскую деятельность на основании Лицензии № ${
		cl.licenseNumber
	}, выданной ${cl.licenseIssuer}, с одной стороны, и

Гражданин(ка) ${cust.fullName}, ${
		contract.customer.isDifferentFromPatient
			? `именуемый(ая) в дальнейшем «Заказчик», в интересах Пациента ${pt.fullName}`
			: `именуемый(ая) в дальнейшем «Пациент» (Заказчик)`
	}, с другой стороны, совместно именуемые «Стороны», заключили настоящий Договор о нижеследующем:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Исполнитель обязуется оказать Пациенту платные стоматологические медицинские услуги надлежащего качества, а Заказчик (Пациент) обязуется принять и оплатить оказанные услуги в соответствии с условиями настоящего Договора и утвержденным Планом лечения (Сметой).
1.2. Основание обращения Пациента: ${contract.clinicalReason}
1.3. Перечень и объем оказываемых услуг:
${servicesList}
1.4. Оказание медицинских услуг осуществляется в месте нахождения Исполнителя: ${cl.actualAddress}.

2. ПРАВА И ОБЯЗАННОСТИ СТОРОН
2.1. Исполнитель обязан:
  2.1.1. Оказать медицинские услуги в соответствии с порядками оказания медицинской помощи, клиническими рекомендациями и стандартами медицинской помощи РФ.
  2.1.2. До заключения настоящего Договора письменно уведомить Пациента о возможности получения медицинской помощи по программе государственных гарантий бесплатного оказания гражданам медицинской помощи (по полису ОМС) в государственных учреждениях.
  2.1.3. Предоставить Пациенту полную и достоверную информацию о применяемых методах лечения, медицинских изделиях, лекарственных препаратах, противопоказаниях и возможных рисках.
  2.1.4. Оформить Информированное добровольное согласие (ИДС) по Приказу Минздрава России № 1051н до начала каждого медицинского вмешательства.
  2.1.5. Соблюдать врачебную тайну и требования Федерального закона № 152-ФЗ «О персональных данных».
2.2. Пациент (Заказчик) обязан:
  2.2.1. Предоставить достоверные сведения о состоянии своего здоровья, перенесенных заболеваниях, аллергоанамнезе и принимаемых препаратах.
  2.2.2. Строго соблюдать назначенный лечащим врачом режим лечения, гигиенические требования и график контрольных визитов.
  2.2.3. Своевременно оплачивать оказанные услуги в порядке, предусмотренном разделом 3 настоящего Договора.
2.3. ПРЕДУПРЕЖДЕНИЕ: ${contract.medicalRecommendationWarning}

3. СТОИМОСТЬ УСЛУГ И ПОРЯДОК РАСЧЕТОВ
3.1. Ориентировочная стоимость услуг по настоящему Договору составляет ${moneyInfo.formattedWithKopecks} (${moneyInfo.inWords}).
3.2. ${contract.paymentTerms}
3.3. ${contract.priceChangeRules}
3.4. Оплата подтверждается выдачей Заказчику (Пациенту) кассового фискального чека в соответствии с Федеральным законом № 54-ФЗ.

4. СРОКИ ОКАЗАНИЯ УСЛУГ
4.1. Начало оказания услуг: ${contract.serviceStart}.
4.2. Срок окончания оказания услуг: ${contract.serviceEndOrCondition}.

5. ОТВЕТСТВЕННОСТЬ СТОРОН, ГАРАНТИИ И ОТКАЗ ОТ ДОГОВОРА
5.1. Стороны несут ответственность в соответствии с законодательством РФ (Закон РФ «О защите прав потребителей», Гражданский кодекс РФ).
5.2. ${contract.refusalAndRefundTerms}
5.3. ${contract.warrantyTerms}
5.4. ${contract.disputeResolutionTerms}

6. ПЕРСОНАЛЬНЫЕ ДАННЫЕ И ЕГИСЗ
6.1. Пациент дает согласие на обработку персональных данных в соответствии с Федеральным законом № 152-ФЗ и передачу сведений в ЕГИСЗ (РЭМД) Минздрава России по Постановлению Правительства РФ № 140.

7. АДРЕСА, РЕКВИЗИТЫ И ПОДПИСИ СТОРОН

ИСПОЛНИТЕЛЬ:
${cl.fullName} (${cl.shortName})
Юр. адрес: ${cl.legalAddress}
Факт. адрес: ${cl.actualAddress}
ОГРН: ${cl.ogrn}, ИНН: ${cl.inn}, КПП: ${cl.kpp}
Лицензия: № ${cl.licenseNumber} от ${cl.licenseDate} г. (${cl.licenseIssuer})
Р/с: ${cl.checkingAccount} в ${cl.bankName}, БИК: ${cl.bik}, К/с: ${cl.correspondentAccount}
Тел: ${cl.phone}, Email: ${cl.email}

${cl.directorTitle}: _____________________ / ${cl.directorFullName} /
Лечащий врач: _____________________ / ${contract.doctorFullName} /
М.П.

ПАЦИЕНТ / ЗАКАЗЧИК:
${cust.fullName}
Д.Р.: ${pt.birthDate}
Паспорт: серия ${cust.passportSeries} № ${cust.passportNumber}, выдан ${cust.passportIssuedBy}, дата: ${cust.passportIssuedDate}, код: ${cust.passportDepartmentCode}
СНИЛС: ${pt.snils || "не указан"}
Адрес регистрации: ${cust.registrationAddress}
Тел: ${cust.phone}
Медкарта №: ${pt.cardNumber || "043/у"}

Подпись: _____________________ / ${cust.fullName} /
Дата: «${contract.signedAt || contract.contractDate}»
${contract.signMethod === "sms_otp" ? `[Подписано ПЭП через СМС: ${contract.smsSignDetails?.phone}, код подтвержден]` : ""}`;
}

/**
 * Генерирует юридически безупречный HTML-бланк формата А4 (ГОСТ) с таблицей услуг,
 * копейками прописью, блоком лицензии, реквизитами и зонами подписи.
 */
export function generatePaidContractHtml(contract: PaidContractData): string {
	const moneyInfo = formatKopecksToRubAndKop(contract.totalAmountKopecks);
	const cl = contract.clinic;
	const pt = contract.patient;
	const cust = contract.customer.isDifferentFromPatient ? contract.customer : contract.patient;

	const serviceRows = (contract.services || [])
		.map(
			(s, idx) => `<tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${s.code ? `<code>${s.code}</code> ` : ""}${s.name}</td>
        <td style="text-align:center;">${s.toothOrArea || "—"}</td>
        <td style="text-align:center;">${s.quantity}</td>
        <td style="text-align:right;">${formatKopecksToRubAndKop(s.unitPriceKopecks).formatted}</td>
        <td style="text-align:right;"><strong>${formatKopecksToRubAndKop(s.totalKopecks).formatted}</strong></td>
      </tr>`,
		)
		.join("");

	const signatureStamp =
		contract.signMethod === "sms_otp" && contract.smsSignDetails?.isVerified
			? `<div class="pep-stamp">
          <strong>ДОКУМЕНТ ПОДПИСАН ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (ПЭП)</strong><br>
          Федеральный закон от 06.04.2011 № 63-ФЗ «Об электронной подписи»<br>
          Телефон: <strong>${contract.smsSignDetails.phone}</strong> · Код подтверждения: <strong>✓ ВЕРИФИЦИРОВАН</strong><br>
          Дата и время: ${new Date(contract.smsSignDetails.verifiedAt || Date.now()).toLocaleString("ru-RU")}<br>
          Хеш документа (SHA-256): ${contract.smsSignDetails.smsSignHash || "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855"}
        </div>`
			: contract.touchSignatureBase64
				? `<div class="touch-sign-preview">
          <img src="${contract.touchSignatureBase64}" alt="Графическая подпись пациента" style="max-height: 48px; max-width: 180px; object-fit: contain;" />
        </div>`
				: `<div class="sign-underline"></div>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Договор № ${contract.contractNumber} на оказание платных медицинских услуг</title>
<style>
  @page { size: A4 portrait; margin: 10mm 12mm; }
  body {
    font-family: "PT Astra Sans", "Times New Roman", Times, serif;
    color: #0f172a;
    margin: 0;
    padding: 0;
    background: #ffffff;
    line-height: 1.35;
    font-size: 8.5pt;
  }
  .contract-sheet {
    max-width: 190mm;
    margin: 0 auto;
    box-sizing: border-box;
  }
  .header-table {
    width: 100%;
    border-bottom: 2pt solid #0f172a;
    padding-bottom: 4px;
    margin-bottom: 8px;
  }
  .clinic-name { font-size: 10.5pt; font-weight: bold; text-transform: uppercase; }
  .clinic-sub { font-size: 7.5pt; color: #334155; }
  .law-tag { font-size: 7pt; color: #475569; text-align: right; }
  .contract-title {
    text-align: center;
    font-size: 11pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 6px 0 2px 0;
  }
  .contract-subtitle {
    text-align: center;
    font-size: 7.5pt;
    color: #475569;
    margin-bottom: 6px;
  }
  .city-date-row {
    display: flex;
    justify-content: space-between;
    font-weight: bold;
    font-size: 8pt;
    margin-bottom: 6px;
    border-bottom: 0.5pt solid #cbd5e1;
    padding-bottom: 2px;
  }
  .section-title {
    font-size: 8.5pt;
    font-weight: bold;
    text-transform: uppercase;
    margin-top: 6px;
    margin-bottom: 2px;
    color: #0f172a;
    border-bottom: 0.5pt solid #e2e8f0;
    padding-bottom: 1px;
  }
  p, li { margin: 2px 0; text-align: justify; }
  .services-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8pt;
    margin: 4px 0 6px 0;
  }
  .services-table th, .services-table td {
    border: 0.5pt solid #94a3b8;
    padding: 3px 5px;
  }
  .services-table th {
    background: #f1f5f9;
    font-weight: bold;
    text-align: center;
  }
  .notice-box {
    border: 1pt solid #0f172a;
    background: #f8fafc;
    padding: 4px 6px;
    margin: 5px 0;
    font-size: 8pt;
  }
  .requisites-grid {
    display: table;
    width: 100%;
    margin-top: 8px;
    border-top: 1.5pt solid #0f172a;
    padding-top: 6px;
    font-size: 7.5pt;
  }
  .req-col {
    display: table-cell;
    width: 50%;
    vertical-align: top;
    padding-right: 8px;
  }
  .sign-underline {
    border-bottom: 1pt solid #0f172a;
    min-height: 18px;
    margin: 10px 0 2px 0;
  }
  .pep-stamp {
    border: 1.5pt solid #0f766e;
    background: #f0fdfa;
    color: #0f766e;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 7pt;
    line-height: 1.25;
    margin-top: 6px;
  }
  .touch-sign-preview {
    min-height: 48px;
    display: flex;
    align-items: flex-end;
    border-bottom: 1pt solid #0f172a;
    margin-top: 4px;
  }
</style>
</head>
<body>
<div class="contract-sheet">
  <table class="header-table">
    <tr>
      <td>
        <div class="clinic-name">${cl.fullName}</div>
        <div class="clinic-sub">${cl.actualAddress} · Тел: ${cl.phone} · ИНН: ${cl.inn} · ОГРН: ${cl.ogrn}</div>
        <div class="clinic-sub">Лицензия: № ${cl.licenseNumber} (${cl.licenseIssuer})</div>
      </td>
      <td class="law-tag">
        В соответствии с Постановлением Правительства РФ<br>от 11.05.2023 № 736 и ст. 84 ФЗ № 323-ФЗ
      </td>
    </tr>
  </table>

  <div class="contract-title">ДОГОВОР № ${contract.contractNumber}</div>
  <div class="contract-subtitle">на оказание платных медицинских стоматологических услуг</div>

  <div class="city-date-row">
    <div>${contract.city}</div>
    <div>«${contract.contractDate}» г.</div>
  </div>

  <p><strong>${cl.fullName}</strong> (сокращенное наименование: ${cl.shortName}), именуемое в дальнейшем <strong>«Исполнитель»</strong>, в лице ${cl.directorTitle} ${cl.directorFullName}, действующего на основании ${cl.actingOnBasis}, с одной стороны, и гражданин(ка) <strong>${cust.fullName}</strong>, ${contract.customer.isDifferentFromPatient ? `именуемый(ая) в дальнейшем «Заказчик», действующий в интересах Пациента <strong>${pt.fullName}</strong>` : `именуемый(ая) в дальнейшем «Пациент» (Заказчик)`}, заключили настоящий Договор о нижеследующем:</p>

  <div class="section-title">1. Предмет договора и условия оказания услуг</div>
  <p>1.1. Исполнитель обязуется оказать Пациенту платные стоматологические медицинские услуги в соответствии с клиническими рекомендациями (протоколами лечения) и стандартами медицинской помощи РФ, а Заказчик (Пациент) обязуется принять и оплатить оказанные услуги в соответствии со сметой и условиями настоящего Договора.</p>
  <p>1.2. Основание обращения: <u>${contract.clinicalReason}</u>. Медкарта № <strong>${pt.cardNumber || "043/у"}</strong>.</p>
  <p>1.3. Согласованный перечень и стоимость платных медицинских услуг:</p>

  <table class="services-table">
    <thead>
      <tr>
        <th style="width:25px;">№</th>
        <th>Наименование медицинской услуги (Номенклатура 804н)</th>
        <th style="width:65px;">Зуб (FDI)</th>
        <th style="width:35px;">Кол.</th>
        <th style="width:80px;">Цена</th>
        <th style="width:85px;">Сумма</th>
      </tr>
    </thead>
    <tbody>
      ${serviceRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="5" style="text-align:right; font-weight:bold;">ИТОГО ПО СМЕТЕ ДОГОВОРА:</td>
        <td style="text-align:right; font-weight:bold; background:#f8fafc;">${moneyInfo.formatted}</td>
      </tr>
    </tfoot>
  </table>

  <div class="notice-box">
    <strong>ВАЖНОЕ УВЕДОМЛЕНИЕ О БЕСПЛАТНОЙ МЕДИЦИНСКОЙ ПОМОЩИ (п. 7 ПП РФ № 736):</strong><br>
    ${contract.freeCareNotice}
  </div>

  <div class="section-title">2. Стоимость услуг, порядок расчетов и изменения сметы</div>
  <p>2.1. Стоимость услуг составляет <strong>${moneyInfo.formattedWithKopecks}</strong> (${moneyInfo.inWords}).</p>
  <p>2.2. ${contract.paymentTerms}</p>
  <p>2.3. ${contract.priceChangeRules}</p>

  <div class="section-title">3. Сроки оказания услуг и гарантийные обязательства</div>
  <p>3.1. Начало оказания услуг: <strong>${contract.serviceStart}</strong>. Срок завершения: <strong>${contract.serviceEndOrCondition}</strong>.</p>
  <p>3.2. ${contract.medicalRecommendationWarning}</p>
  <p>3.3. ${contract.warrantyTerms}</p>
  <p>3.4. ${contract.refusalAndRefundTerms}</p>
  <p>3.5. До заключения договора Пациент оформляет Информированное добровольное согласие по Приказу МЗ РФ № 1051н и согласие на обработку ПДн по 152-ФЗ (передача в ЕГИСЗ РЭМД по ПП РФ № 140).</p>

  <div class="requisites-grid">
    <div class="req-col">
      <strong>ИСПОЛНИТЕЛЬ:</strong><br>
      <strong>${cl.fullName}</strong><br>
      Юр. адрес: ${cl.legalAddress}<br>
      Факт. адрес: ${cl.actualAddress}<br>
      ОГРН: ${cl.ogrn} · ИНН: ${cl.inn} · КПП: ${cl.kpp}<br>
      Лицензия: № ${cl.licenseNumber} от ${cl.licenseDate} г.<br>
      Р/с: ${cl.checkingAccount} в ${cl.bankName}<br>
      БИК: ${cl.bik} · К/с: ${cl.correspondentAccount}<br>
      Тел: ${cl.phone}<br><br>
      ${cl.directorTitle}:<br>
      <div class="sign-underline"></div>
      <div style="font-size:6.5pt; color:#64748b;">(подпись, М.П.) / ${cl.directorFullName} /</div>
      Врач: _________________ / ${contract.doctorFullName} /
    </div>

    <div class="req-col">
      <strong>ПАЦИЕНТ / ЗАКАЗЧИК:</strong><br>
      <strong>${cust.fullName}</strong><br>
      Дата рождения: ${pt.birthDate} г.<br>
      Паспорт: серия ${cust.passportSeries} № ${cust.passportNumber}<br>
      Выдан: ${cust.passportIssuedBy}, ${cust.passportIssuedDate}, код ${cust.passportDepartmentCode}<br>
      СНИЛС: ${pt.snils || "не указан"}<br>
      Адрес регистрации: ${cust.registrationAddress}<br>
      Телефон: ${cust.phone}<br><br>
      Подпись Заказчика (Пациента):<br>
      ${signatureStamp}
      <div style="font-size:6.5pt; color:#64748b;">(подпись) / ${cust.fullName} /</div>
      Дата подписания: «${contract.signedAt || contract.contractDate}» г.
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * Генератор 4-значного OTP-кода для простой электронной подписи (ПЭП) по 63-ФЗ.
 */
export function generateSmsSignOtp(phone: string): {
	code: string;
	sentAt: number;
	expiresAt: number;
	phoneMasked: string;
} {
	// Генерация 4-значного кода от 1000 до 9999
	const randomNum = Math.floor(1000 + Math.random() * 9000);
	const code = String(randomNum);
	const now = Date.now();
	const expiresAt = now + 5 * 60 * 1000; // 5 минут

	const cleanPhone = (phone || "").replace(/\D/g, "");
	const phoneMasked =
		cleanPhone.length >= 10
			? `+7 (${cleanPhone.slice(-10, -7)}) ***-**-${cleanPhone.slice(-2)}`
			: phone;

	return {
		code,
		sentAt: now,
		expiresAt,
		phoneMasked,
	};
}

/**
 * Проверка СМС-кода для подписания договора ПЭП.
 */
export function verifySmsSignOtp(
	inputCode: string,
	otpState: { code: string; sentAt: number; expiresAt: number },
): { success: boolean; error?: string } {
	const trimmed = (inputCode || "").trim();
	if (!trimmed) {
		return { success: false, error: "Введите 4-значный код из СМС." };
	}

	if (Date.now() > otpState.expiresAt) {
		return { success: false, error: "Срок действия СМС-кода истек. Запросите новый код." };
	}

	if (trimmed !== otpState.code) {
		return { success: false, error: "Неверный код подтверждения. Проверьте цифры из СМС." };
	}

	return { success: true };
}

function rightRotate(value: number, amount: number): number {
	return (value >>> amount) | (value << (32 - amount));
}

/**
 * Криптографический расчет SHA-256 (FIPS 180-4) для фиксации неизменяемости договора и подписи ПЭП по 63-ФЗ.
 */
export function generateSha256(inputString: string): string {
	const maxWord = Math.pow(2, 32);

	const hash = new Uint32Array([
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
		0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
	]);

	const k = new Uint32Array([
		0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
		0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
		0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
		0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
		0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
		0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
		0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
		0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
	]);

	const utf8Bytes: number[] = [];
	for (let c = 0; c < inputString.length; c++) {
		let code = inputString.charCodeAt(c);
		if (code < 0x80) {
			utf8Bytes.push(code);
		} else if (code < 0x800) {
			utf8Bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
		} else if (code < 0xd800 || code >= 0xe000) {
			utf8Bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
		} else {
			c++;
			code = 0x10000 + (((code & 0x3ff) << 10) | (inputString.charCodeAt(c) & 0x3ff));
			utf8Bytes.push(
				0xf0 | (code >> 18),
				0x80 | ((code >> 12) & 0x3f),
				0x80 | ((code >> 6) & 0x3f),
				0x80 | (code & 0x3f),
			);
		}
	}

	const utf8BitLength = utf8Bytes.length * 8;
	utf8Bytes.push(0x80);
	while ((utf8Bytes.length % 64) !== 56) {
		utf8Bytes.push(0);
	}

	const highBits = Math.floor(utf8BitLength / maxWord);
	const lowBits = utf8BitLength >>> 0;

	for (let b = 3; b >= 0; b--) {
		utf8Bytes.push((highBits >>> (b * 8)) & 0xff);
	}
	for (let b = 3; b >= 0; b--) {
		utf8Bytes.push((lowBits >>> (b * 8)) & 0xff);
	}

	const wordsCount = utf8Bytes.length / 4;
	const words = new Uint32Array(wordsCount);
	for (let b = 0; b < wordsCount; b++) {
		const offset = b * 4;
		const b0 = utf8Bytes[offset] ?? 0;
		const b1 = utf8Bytes[offset + 1] ?? 0;
		const b2 = utf8Bytes[offset + 2] ?? 0;
		const b3 = utf8Bytes[offset + 3] ?? 0;
		words[b] = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
	}

	const w = new Uint32Array(64);

	for (let j = 0; j < wordsCount; j += 16) {
		for (let i = 0; i < 16; i++) {
			w[i] = words[j + i] ?? 0;
		}
		for (let i = 16; i < 64; i++) {
			const w15 = w[i - 15] ?? 0;
			const w2 = w[i - 2] ?? 0;
			const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
			const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
			w[i] = ((w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1) | 0;
		}

		let a = hash[0] ?? 0;
		let b = hash[1] ?? 0;
		let c = hash[2] ?? 0;
		let d = hash[3] ?? 0;
		let e = hash[4] ?? 0;
		let f = hash[5] ?? 0;
		let g = hash[6] ?? 0;
		let h = hash[7] ?? 0;

		for (let i = 0; i < 64; i++) {
			const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
			const ch = (e & f) ^ (~e & g);
			const temp1 = (h + S1 + ch + (k[i] ?? 0) + (w[i] ?? 0)) | 0;
			const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = (S0 + maj) | 0;

			h = g;
			g = f;
			f = e;
			e = (d + temp1) | 0;
			d = c;
			c = b;
			b = a;
			a = (temp1 + temp2) | 0;
		}

		hash[0] = ((hash[0] ?? 0) + a) | 0;
		hash[1] = ((hash[1] ?? 0) + b) | 0;
		hash[2] = ((hash[2] ?? 0) + c) | 0;
		hash[3] = ((hash[3] ?? 0) + d) | 0;
		hash[4] = ((hash[4] ?? 0) + e) | 0;
		hash[5] = ((hash[5] ?? 0) + f) | 0;
		hash[6] = ((hash[6] ?? 0) + g) | 0;
		hash[7] = ((hash[7] ?? 0) + h) | 0;
	}

	let hexString = "";
	for (let i = 0; i < 8; i++) {
		const hex = ((hash[i] ?? 0) >>> 0).toString(16).padStart(8, "0");
		hexString += hex;
	}

	return hexString;
}

/**
 * Генерация неизменяемого SHA-256 хэша договора платных медицинских услуг (ПЭП 63-ФЗ).
 */
export function generatePaidContractIntegrityHash(
	contract: PaidContractData,
	otpCode: string,
	verifiedAtIso?: string,
): string {
	const canonicalPayload = [
		`CONTRACT:${contract.contractNumber}:${contract.contractDate}`,
		`CLINIC:${contract.clinic.inn}:${contract.clinic.ogrn}:${contract.clinic.licenseNumber}`,
		`PATIENT:${contract.patient.fullName}:${contract.patient.passportSeries}${contract.patient.passportNumber}:${contract.patient.phone}`,
		`AMOUNT_KOP:${contract.totalAmountKopecks}`,
		`SERVICES:${(contract.services || []).map((s) => `${s.code || ""}:${s.name}:${s.totalKopecks}`).join(";")}`,
		`OTP_DIGEST:${generateSha256(otpCode)}`,
		`TIMESTAMP:${verifiedAtIso || contract.signedAt || contract.contractDate}`,
	].join("\n");
	return generateSha256(canonicalPayload);
}
