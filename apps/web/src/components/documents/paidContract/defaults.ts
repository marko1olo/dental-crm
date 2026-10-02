/**
 * defaults.ts
 *
 * Создание договоров по умолчанию и генерация номеров ДПМУ (ПП РФ № 736).
 */

import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { calculatePaidContractGrandTotalKopecks } from "./money";
import type { PaidContractData, PaidContractServiceItem } from "./types";

let paidContractSequenceCounter = 0;

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
	directorFullName?: string | undefined;
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

	let initialSeries = "";
	let initialNumber = "";
	if (params.patientPassport) {
		const clean = params.patientPassport.trim().replace(/\s+/g, " ");
		const parts = clean.split(" ");
		const p0 = parts[0] ?? "";
		const p1 = parts[1] ?? "";
		if (parts.length >= 3) {
			initialSeries = `${p0} ${p1}`.trim();
			initialNumber = parts.slice(2).join("");
		} else if (parts.length === 2) {
			initialSeries = p0;
			initialNumber = p1;
		} else if (clean.length >= 10) {
			initialSeries = `${clean.slice(0, 2)} ${clean.slice(2, 4)}`;
			initialNumber = clean.slice(4);
		} else {
			initialNumber = clean;
		}
	}

	const isDemo = isDemoShowcaseMode();
	const defaultServices: PaidContractServiceItem[] = isDemo
		? [
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
		  ]
		: [];

	const resolvedServices = params.services || defaultServices;
	const resolvedTotalAmountKopecks =
		params.totalAmountKopecks !== undefined
			? params.totalAmountKopecks
			: resolvedServices.length > 0
			? calculatePaidContractGrandTotalKopecks(resolvedServices)
			: 0;

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
			directorFullName:
				params.directorFullName ||
				(isDemo ? "Смирнов Алексей Викторович" : ""),
			actingOnBasis: "Устава",
		},
		patient: {
			fullName: params.patientFullName || "",
			birthDate: params.patientBirthDate || "",
			gender: "Мужской",
			passportSeries: initialSeries,
			passportNumber: initialNumber,
			passportIssuedBy: "",
			passportIssuedDate: "",
			passportDepartmentCode: "",
			snils: params.patientSnils || "",
			registrationAddress: params.patientAddress || "",
			actualAddress: params.patientAddress || "",
			phone: params.patientPhone || "",
			email: "",
			cardNumber: params.cardNumber || "",
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
		services: resolvedServices,
		serviceStart: params.serviceStart || formattedDate,
		serviceEndOrCondition:
			params.serviceEndOrCondition ||
			"До полного завершения согласованного объема медицинских услуг согласно Плану лечения и подписания Акта оказанных услуг.",
		totalAmountKopecks: resolvedTotalAmountKopecks,
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
		doctorFullName:
			params.doctorFullName ||
			(isDemo ? "Петров Петр Петрович" : ""),
		doctorSpecialty:
			params.doctorSpecialty ||
			(isDemo ? "Врач-стоматолог-терапевт" : ""),
		signedAt: formattedDate,
		signMethod: "paper",
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
 * Генерирует регламентный порядковый номер договора на оказание платных медицинских услуг (ДПМУ)
 * Формат клиники: ДПМУ-ГГГГ-XXXX-NNNN
 * где:
 * - ГГГГ — текущий календарный год
 * - XXXX — суффикс ID пациента или детерминированный код по ФИО (4 знака)
 * - NNNN — строгий возрастающий порядковый номер (4 знака)
 */
export function generatePaidContractNumber(
	optionsOrYear?:
		| {
				patientId?: string | null | undefined;
				patientFullName?: string | null | undefined;
				seqNumber?: number | string | null | undefined;
				year?: number | undefined;
		  }
		| number
		| null
		| undefined,
	seqNumberParam?: number | string | null | undefined,
): string {
	const options =
		typeof optionsOrYear === "number"
			? { year: optionsOrYear, seqNumber: seqNumberParam }
			: optionsOrYear || undefined;
	const currentYear = options?.year ?? new Date().getFullYear();

	let patientPart = "0001";
	if (options?.patientId && options.patientId.trim()) {
		const cleanId = options.patientId.replace(/[^a-zA-Z0-9]/g, "");
		if (cleanId.length >= 4) {
			patientPart = cleanId.slice(-4).toUpperCase();
		} else if (cleanId.length > 0) {
			patientPart = cleanId.padStart(4, "0").toUpperCase();
		}
	} else if (options?.patientFullName && options.patientFullName.trim()) {
		// Детерминированный 4-значный хэш по ФИО пациента
		let hash = 0;
		for (let i = 0; i < options.patientFullName.length; i++) {
			hash = ((hash << 5) - hash + options.patientFullName.charCodeAt(i)) | 0;
		}
		const posHash = Math.abs(hash) % 10000;
		patientPart = String(posHash).padStart(4, "0");
	}

	let seqStr: string;
	if (options?.seqNumber !== undefined && options?.seqNumber !== null && String(options.seqNumber).trim() !== "") {
		const numOnly = String(options.seqNumber).replace(/\D/g, "");
		seqStr = (numOnly || "1").padStart(4, "0").slice(-4);
	} else {
		paidContractSequenceCounter = (paidContractSequenceCounter + 1) % 10000;
		if (paidContractSequenceCounter === 0) paidContractSequenceCounter = 1;
		seqStr = String(paidContractSequenceCounter).padStart(4, "0");
	}

	return `ДПМУ-${currentYear}-${patientPart}-${seqStr}`;
}
