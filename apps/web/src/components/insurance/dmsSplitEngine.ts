/**
 * ============================================================================
 * GUARANTEE LETTER & CO-PAYMENT SPLIT ENGINE (РАСЧЕТ СООПЛАТЫ ДМС)
 * Математическое ядро расчета разделения счетов между страховой компанией и пациентом
 * с копеечной точностью, защитой от ошибок IEEE-754 и формированием реестра ЕГИСЗ.
 * ============================================================================
 */

import {
	type DmsInsurerDefinition,
	type DmsPolicy,
	type DmsProgramType,
	getDmsInsurerById,
	isServiceExcludedByDmsRules,
} from "./insuranceCatalogs.js";

export interface DmsGuaranteeLetter {
	readonly id: string;
	readonly letterNumber: string;
	readonly issueDate: string;
	readonly validUntil: string;
	readonly maxApprovedAmountKopecks: number;
	readonly insurerId: string;
	readonly patientFullName: string;
	readonly patientPolicyNumber?: string | undefined;
	readonly approvedTeethFdi: readonly string[];
	readonly approvedServiceCodes804n: readonly string[];
	readonly diagnosisIcd10?: string | undefined;
	readonly curatorFullName?: string | undefined;
	readonly curatorPhone?: string | undefined;
	readonly notes?: string | undefined;
}

export interface DmsBillableLineItem {
	readonly id: string;
	readonly serviceCode: string;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly discountPercent?: number | undefined;
}

export interface DmsSplitLineResult {
	readonly lineItemId: string;
	readonly serviceCode: string;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly totalKopecks: number;
	readonly insuranceCoveredKopecks: number;
	readonly patientOutOfPocketKopecks: number;
	readonly insuranceCoveredRubles: number;
	readonly patientOutOfPocketRubles: number;
	readonly status: "full_dms" | "co_payment" | "patient_full";
	readonly splitReason: string;
	readonly isApprovedByLetter: boolean;
	readonly isExcludedByPolicy: boolean;
	readonly franchiseDeductionKopecks: number;
}

export interface DmsSplitCalculationResult {
	readonly lineItems: readonly DmsSplitLineResult[];
	readonly totalBillKopecks: number;
	readonly totalInsuranceCoveredKopecks: number;
	readonly totalPatientOutOfPocketKopecks: number;
	readonly totalBillRubles: number;
	readonly totalInsuranceCoveredRubles: number;
	readonly totalPatientOutOfPocketRubles: number;
	readonly letterApprovedLimitKopecks: number;
	readonly letterRemainingLimitKopecks: number;
	readonly letterExcessAmountKopecks: number;
	readonly hasUnapprovedTeeth: boolean;
	readonly hasExcludedServices: boolean;
	readonly integrityInvariantHolds: boolean;
	readonly warningMessage?: string | undefined;
	readonly isEmergency?: boolean | undefined;
}

export interface DmsRegistryItem {
	readonly itemIndex: number;
	readonly serviceDate: string;
	readonly patientFullName: string;
	readonly policyNumber: string;
	readonly guaranteeLetterNumber?: string | undefined;
	readonly serviceCode: string;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly diagnosisIcd10?: string | undefined;
	readonly quantity: number;
	readonly unitPriceRubles: number;
	readonly totalAmountRubles: number;
	readonly dmsAcceptedAmountRubles: number;
	readonly patientPaidAmountRubles: number;
	readonly taxRateVat: "exempt_149_nk_rf";
}

export interface DmsReconciliationRegistry {
	readonly registryNumber: string;
	readonly registryDate: string;
	readonly insurer: DmsInsurerDefinition;
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly clinicOgrn: string;
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly items: readonly DmsRegistryItem[];
	readonly totalRegistryAmountRubles: number;
	readonly totalDmsClaimedRubles: number;
	readonly totalPatientCoPaymentRubles: number;
	readonly totalServicesCount: number;
	readonly totalPatientsCount: number;
}

/**
 * Преобразование копеек в рубли
 */
export function kopecksToRubles(kopecks: number): number {
	return Math.round(kopecks) / 100;
}

/**
 * Преобразование рублей в копейки (целочисленное округление)
 */
export function rublesToKopecks(rubles: number): number {
	return Math.round(rubles * 100);
}

/**
 * Форматирование суммы в рублях с копейками (например: "1 250,00 ₽")
 */
export function formatCurrencyRub(rublesOrKopecks: number, isKopecks = false): string {
	const rub = isKopecks ? kopecksToRubles(rublesOrKopecks) : rublesOrKopecks;
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(rub);
}

/**
 * Нормализация номера зуба (FDI: 11..48, 51..85)
 */
export function normalizeToothFdi(tooth: string | undefined): string | undefined {
	if (!tooth) return undefined;
	const cleaned = tooth.replace(/[^0-9]/g, "");
	return cleaned.length >= 2 ? cleaned : tooth.trim();
}

/**
 * Проверка согласованности зуба по гарантийному письму
 */
export function isToothApprovedByLetter(
	tooth: string | undefined,
	letter: DmsGuaranteeLetter | undefined,
): boolean {
	if (!letter) return true; // Без ГП ограничение по зубам не накладывается
	if (!letter.approvedTeethFdi || letter.approvedTeethFdi.length === 0) return true; // Разрешены все зубы
	if (!tooth) return true; // Услуга общего характера (консультация, рентген)

	const cleanTooth = normalizeToothFdi(tooth);
	return letter.approvedTeethFdi.some((t) => normalizeToothFdi(t) === cleanTooth);
}

/**
 * Проверка согласованности кода номенклатуры 804н по гарантийному письму
 */
export function isServiceCodeApprovedByLetter(
	serviceCode: string,
	letter: DmsGuaranteeLetter | undefined,
): boolean {
	if (!letter) return true;
	if (!letter.approvedServiceCodes804n || letter.approvedServiceCodes804n.length === 0) return true;

	const cleanCode = serviceCode.trim().toUpperCase();
	return letter.approvedServiceCodes804n.some((c) => {
		const approved = c.trim().toUpperCase();
		return cleanCode === approved || cleanCode.startsWith(approved);
	});
}

/**
 * РАСЧЕТ РАЗДЕЛЕНИЯ СТОИМОСТИ УСЛУГ (CO-PAYMENT SPLIT CALCULATOR)
 * Строгое соблюдение инварианта: dmsCovered + patientPaid === totalLineAmount
 */
export function calculateDmsCoPaymentSplit(
	lineItems: readonly DmsBillableLineItem[],
	options: {
		policy?: DmsPolicy | undefined;
		guaranteeLetter?: DmsGuaranteeLetter | undefined;
		previouslyUsedLetterAmountKopecks?: number | undefined;
		visitDate?: string | undefined;
		lastHygieneDate?: string | undefined;
		isEmergency?: boolean | undefined;
		hasAcutePain?: boolean | undefined;
	} = {},
): DmsSplitCalculationResult {
	const { policy, guaranteeLetter } = options;
	const previouslyUsed = options.previouslyUsedLetterAmountKopecks ?? 0;
	const isUrgentCare = Boolean(options.isEmergency || options.hasAcutePain);

	let availableLetterLimitKopecks = guaranteeLetter
		? Math.max(0, guaranteeLetter.maxApprovedAmountKopecks - previouslyUsed)
		: Number.POSITIVE_INFINITY;

	const splitResults: DmsSplitLineResult[] = [];
	let hasUnapprovedTeeth = false;
	let hasExcludedServices = false;

	for (const item of lineItems) {
		const qty = Math.max(1, item.quantity);
		const discount = Math.min(100, Math.max(0, item.discountPercent ?? 0));
		const rawLineTotalKopecks = Math.round(item.unitPriceKopecks * qty * (1 - discount / 100));

		// 1. Проверка на исключения программы полиса ДМС
		let isExcluded = false;
		let exclusionReason = "";

		if (policy) {
			const exclCheck = isServiceExcludedByDmsRules(
				item.serviceCode,
				item.serviceName,
				policy.program,
				{
					lastHygieneDate: options.lastHygieneDate,
					currentVisitDate: options.visitDate,
				},
			);
			if (exclCheck.isExcluded) {
				isExcluded = true;
				hasExcludedServices = true;
				exclusionReason = exclCheck.reason || "Исключение программы страхования";
			}
		}

		// 2. Проверка согласования зуба по гарантийному письму
		const toothApproved = isToothApprovedByLetter(item.toothNumber, guaranteeLetter);
		if (!toothApproved) {
			hasUnapprovedTeeth = true;
		}

		// 3. Проверка согласования кода услуги по гарантийному письму
		const codeApproved = isServiceCodeApprovedByLetter(item.serviceCode, guaranteeLetter);

		// Если услуга исключена или не согласована — 100% сооплата пациентом (кроме острой боли)
		if (isExcluded || !toothApproved || !codeApproved) {
			if (isUrgentCare) {
				// Мандат 8e: оказание помощи при острой боли не блокируется
				splitResults.push({
					lineItemId: item.id,
					serviceCode: item.serviceCode,
					serviceName: item.serviceName,
					toothNumber: item.toothNumber,
					quantity: qty,
					unitPriceKopecks: item.unitPriceKopecks,
					totalKopecks: rawLineTotalKopecks,
					insuranceCoveredKopecks: rawLineTotalKopecks,
					patientOutOfPocketKopecks: 0,
					insuranceCoveredRubles: kopecksToRubles(rawLineTotalKopecks),
					patientOutOfPocketRubles: 0,
					status: "full_dms",
					splitReason: "Экстренная помощь (острая боль). Требуется досылка гарантийного письма ДМС",
					isApprovedByLetter: true,
					isExcludedByPolicy: isExcluded,
					franchiseDeductionKopecks: 0,
				});
				continue;
			}

			let reason = exclusionReason;
			if (!toothApproved) {
				reason = `Зуб ${item.toothNumber} не входит в согласованный перечень гарантийного письма № ${guaranteeLetter?.letterNumber || ""}.`;
			} else if (!codeApproved) {
				reason = `Код услуги ${item.serviceCode} не согласован гарантийным письмом № ${guaranteeLetter?.letterNumber || ""}.`;
			}

			splitResults.push({
				lineItemId: item.id,
				serviceCode: item.serviceCode,
				serviceName: item.serviceName,
				toothNumber: item.toothNumber,
				quantity: qty,
				unitPriceKopecks: item.unitPriceKopecks,
				totalKopecks: rawLineTotalKopecks,
				insuranceCoveredKopecks: 0,
				patientOutOfPocketKopecks: rawLineTotalKopecks,
				insuranceCoveredRubles: 0,
				patientOutOfPocketRubles: kopecksToRubles(rawLineTotalKopecks),
				status: "patient_full",
				splitReason: reason,
				isApprovedByLetter: toothApproved && codeApproved,
				isExcludedByPolicy: isExcluded,
				franchiseDeductionKopecks: 0,
			});
			continue;
		}

		// 4. Расчет франшизы (если задана в полисе)
		let franchiseDeductionKopecks = 0;
		if (policy) {
			if (policy.franchiseType === "percent" && policy.franchisePercent) {
				franchiseDeductionKopecks = Math.round(rawLineTotalKopecks * (policy.franchisePercent / 100));
			} else if (policy.franchiseType === "fixed" && policy.franchiseFixedKopecks) {
				franchiseDeductionKopecks = Math.min(rawLineTotalKopecks, policy.franchiseFixedKopecks);
			}
		}

		// Сумма, претендующая на покрытие ДМС после франшизы
		const potentialDmsCoveredKopecks = Math.max(0, rawLineTotalKopecks - franchiseDeductionKopecks);

		// 5. Ограничение лимитом гарантийного письма
		let actualDmsCoveredKopecks = 0;
		let status: "full_dms" | "co_payment" | "patient_full" = "full_dms";
		let splitReason = "100% покрыто по программе ДМС";

		if (availableLetterLimitKopecks >= potentialDmsCoveredKopecks) {
			actualDmsCoveredKopecks = potentialDmsCoveredKopecks;
			availableLetterLimitKopecks -= potentialDmsCoveredKopecks;

			if (franchiseDeductionKopecks > 0) {
				status = "co_payment";
				splitReason = `Сооплата пациентом франшизы ${policy?.franchisePercent || ""}% (${formatCurrencyRub(franchiseDeductionKopecks, true)})`;
			}
		} else if (availableLetterLimitKopecks > 0) {
			// Частичное покрытие (исчерпание лимита ГП)
			if (isUrgentCare) {
				actualDmsCoveredKopecks = potentialDmsCoveredKopecks;
				availableLetterLimitKopecks = 0;
				status = "full_dms";
				splitReason = `Экстренная помощь (острая боль) сверх лимита ГП. Требуется досылка гарантийного письма ДМС`;
			} else {
				actualDmsCoveredKopecks = availableLetterLimitKopecks;
				availableLetterLimitKopecks = 0;
				status = "co_payment";
				splitReason = `Превышен лимит гарантийного письма на ${formatCurrencyRub(potentialDmsCoveredKopecks - actualDmsCoveredKopecks, true)}. Остаток доплачивает пациент.`;
			}
		} else {
			// Лимит исчерпан полностью
			if (isUrgentCare) {
				actualDmsCoveredKopecks = potentialDmsCoveredKopecks;
				status = "full_dms";
				splitReason = "Экстренная помощь (острая боль) сверх лимита ГП. Требуется досылка гарантийного письма ДМС";
			} else {
				actualDmsCoveredKopecks = 0;
				status = "patient_full";
				splitReason = "Лимит гарантийного письма полностью исчерпан. Оплата пациентом.";
			}
		}

		// Пациент доплачивает разницу: железный баланс
		const patientPaidKopecks = rawLineTotalKopecks - actualDmsCoveredKopecks;

		splitResults.push({
			lineItemId: item.id,
			serviceCode: item.serviceCode,
			serviceName: item.serviceName,
			toothNumber: item.toothNumber,
			quantity: qty,
			unitPriceKopecks: item.unitPriceKopecks,
			totalKopecks: rawLineTotalKopecks,
			insuranceCoveredKopecks: actualDmsCoveredKopecks,
			patientOutOfPocketKopecks: patientPaidKopecks,
			insuranceCoveredRubles: kopecksToRubles(actualDmsCoveredKopecks),
			patientOutOfPocketRubles: kopecksToRubles(patientPaidKopecks),
			status,
			splitReason,
			isApprovedByLetter: true,
			isExcludedByPolicy: false,
			franchiseDeductionKopecks,
		});
	}

	// Итоговые агрегаты
	const totalBillKopecks = splitResults.reduce((acc, item) => acc + item.totalKopecks, 0);
	const totalInsuranceCoveredKopecks = splitResults.reduce((acc, item) => acc + item.insuranceCoveredKopecks, 0);
	const totalPatientOutOfPocketKopecks = splitResults.reduce((acc, item) => acc + item.patientOutOfPocketKopecks, 0);

	const letterApprovedLimitKopecks = guaranteeLetter ? guaranteeLetter.maxApprovedAmountKopecks : 0;
	const letterRemainingLimitKopecks = Number.isFinite(availableLetterLimitKopecks)
		? availableLetterLimitKopecks
		: 0;

	const letterExcessAmountKopecks = guaranteeLetter
		? Math.max(0, totalBillKopecks - guaranteeLetter.maxApprovedAmountKopecks)
		: 0;

	// Математический инвариант целостности
	const integrityInvariantHolds =
		totalInsuranceCoveredKopecks + totalPatientOutOfPocketKopecks === totalBillKopecks;

	let warningMessage: string | undefined = undefined;
	if (isUrgentCare || hasUnapprovedTeeth || hasExcludedServices || !guaranteeLetter) {
		warningMessage = "Требуется досылка гарантийного письма ДМС";
	}

	return {
		lineItems: splitResults,
		totalBillKopecks,
		totalInsuranceCoveredKopecks,
		totalPatientOutOfPocketKopecks,
		totalBillRubles: kopecksToRubles(totalBillKopecks),
		totalInsuranceCoveredRubles: kopecksToRubles(totalInsuranceCoveredKopecks),
		totalPatientOutOfPocketRubles: kopecksToRubles(totalPatientOutOfPocketKopecks),
		letterApprovedLimitKopecks,
		letterRemainingLimitKopecks,
		letterExcessAmountKopecks,
		hasUnapprovedTeeth,
		hasExcludedServices,
		integrityInvariantHolds,
		warningMessage,
		isEmergency: isUrgentCare,
	};
}

/**
 * Создание реестра оказанных услуг по ДМС (для отправки в страховую компанию)
 */
export function buildDmsReconciliationRegistry(params: {
	registryNumber: string;
	registryDate?: string | undefined;
	insurerId: string;
	clinicName?: string | undefined;
	clinicInn?: string | undefined;
	clinicOgrn?: string | undefined;
	periodStart: string;
	periodEnd: string;
	splitResults: readonly {
		patientFullName: string;
		policyNumber: string;
		guaranteeLetterNumber?: string | undefined;
		serviceDate: string;
		diagnosisIcd10?: string | undefined;
		lineItem: DmsSplitLineResult;
	}[];
}): DmsReconciliationRegistry {
	const insurer = getDmsInsurerById(params.insurerId) || {
		id: params.insurerId,
		key: params.insurerId,
		shortName: "Страховая компания ДМС",
		fullName: "Страховая компания",
		inn: "0000000000",
		ogrn: "0000000000000",
		phone: "8 (800) 000-00-00",
		email: "dms@insurance.ru",
		portalUrl: "https://insurance.ru",
		defaultClaimSlaHours: 24,
		supportedPrograms: ["base", "extended", "vip"] as const,
		standardTerms: "Стандартные условия",
	};

	const items: DmsRegistryItem[] = params.splitResults.map((r, index) => {
		const unitRub = kopecksToRubles(r.lineItem.unitPriceKopecks);
		return {
			itemIndex: index + 1,
			serviceDate: r.serviceDate,
			patientFullName: r.patientFullName,
			policyNumber: r.policyNumber,
			guaranteeLetterNumber: r.guaranteeLetterNumber,
			serviceCode: r.lineItem.serviceCode,
			serviceName: r.lineItem.serviceName,
			toothNumber: r.lineItem.toothNumber,
			diagnosisIcd10: r.diagnosisIcd10 || "K02.1",
			quantity: r.lineItem.quantity,
			unitPriceRubles: unitRub,
			totalAmountRubles: r.lineItem.totalKopecks / 100,
			dmsAcceptedAmountRubles: r.lineItem.insuranceCoveredKopecks / 100,
			patientPaidAmountRubles: r.lineItem.patientOutOfPocketKopecks / 100,
			taxRateVat: "exempt_149_nk_rf",
		};
	});

	const totalRegistryAmountRubles = items.reduce((acc, i) => acc + i.totalAmountRubles, 0);
	const totalDmsClaimedRubles = items.reduce((acc, i) => acc + i.dmsAcceptedAmountRubles, 0);
	const totalPatientCoPaymentRubles = items.reduce((acc, i) => acc + i.patientPaidAmountRubles, 0);

	const uniquePatients = new Set(items.map((i) => i.patientFullName)).size;

	return {
		registryNumber: params.registryNumber,
		registryDate: params.registryDate || new Date().toISOString().slice(0, 10),
		insurer,
		clinicName: params.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»",
		clinicInn: params.clinicInn || "7701234567",
		clinicOgrn: params.clinicOgrn || "1027700123456",
		periodStart: params.periodStart,
		periodEnd: params.periodEnd,
		items,
		totalRegistryAmountRubles: Math.round(totalRegistryAmountRubles * 100) / 100,
		totalDmsClaimedRubles: Math.round(totalDmsClaimedRubles * 100) / 100,
		totalPatientCoPaymentRubles: Math.round(totalPatientCoPaymentRubles * 100) / 100,
		totalServicesCount: items.length,
		totalPatientsCount: uniquePatients,
	};
}

/**
 * Экспорт реестра ДМС в формат CSV (RFC 4180 с кодировкой UTF-8 BOM для Excel)
 */
export function exportDmsRegistryToCsv(registry: DmsReconciliationRegistry): string {
	const headers = [
		"№ п/п",
		"Дата услуги",
		"Ф.И.О. пациента",
		"Номер полиса ДМС",
		"Гарантийное письмо",
		"Диагноз (МКБ-10)",
		"Зуб",
		"Код услуги (804н)",
		"Наименование услуги",
		"Кол-во",
		"Цена, руб.",
		"Сумма, руб.",
		"К оплате ДМС, руб.",
		"Сооплата пациентом, руб.",
		"НДС",
	];

	const rows = registry.items.map((item) => [
		item.itemIndex.toString(),
		item.serviceDate,
		`"${item.patientFullName.replace(/"/g, '""')}"`,
		`"${item.policyNumber}"`,
		`"${item.guaranteeLetterNumber || ""}"`,
		`"${item.diagnosisIcd10 || ""}"`,
		`"${item.toothNumber || ""}"`,
		`"${item.serviceCode}"`,
		`"${item.serviceName.replace(/"/g, '""')}"`,
		item.quantity.toString(),
		item.unitPriceRubles.toFixed(2),
		item.totalAmountRubles.toFixed(2),
		item.dmsAcceptedAmountRubles.toFixed(2),
		item.patientPaidAmountRubles.toFixed(2),
		"Без НДС (пп. 2 п. 2 ст. 149 НК РФ)",
	]);

	const totalRow = [
		"ИТОГО ПО РЕЕСТРУ",
		"",
		"",
		"",
		"",
		"",
		"",
		"",
		"",
		registry.totalServicesCount.toString(),
		"",
		registry.totalRegistryAmountRubles.toFixed(2),
		registry.totalDmsClaimedRubles.toFixed(2),
		registry.totalPatientCoPaymentRubles.toFixed(2),
		"",
	];

	const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";")), totalRow.join(";")].join("\r\n");

	// UTF-8 BOM (\uFEFF) для корректного открытия в русском Excel
	return `\uFEFF${csvContent}`;
}
