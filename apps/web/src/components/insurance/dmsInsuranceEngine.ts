/**
 * ============================================================================
 * DMS PRE-AUTHORIZATION & STATUTORY INSURANCE BILLING ENGINE
 * Финансово-математическое ядро проверки гарантийных писем, сплит-расчета счетов,
 * формирования запросов на согласование и реестров/актов по Приказу № 804н.
 *
 * ИНВАРИАНТЫ:
 * 1. Копеечная точность: все расчеты производятся в целочисленных копейках (без дрейфа IEEE-754).
 * 2. Железный баланс: TotalBillKopecks === DmsCoveredKopecks + PatientCoPayKopecks.
 * 3. 100% строгая типизация TypeScript без 'any'.
 * ============================================================================
 */

import {
	type DmsGuaranteeLetterRecord,
	type DmsInsurerId,
	type DmsInsurerMetadata,
	type DmsPreAuthApprovalStatus,
	type DmsProgramKey,
	getNomenclature804nByCode,
	getStatutoryInsurerById,
	getStatutoryProgramByKey,
	STATUTORY_DMS_EXCLUSION_RULES,
} from "./dmsInsurancePresets";

export type { DmsPreAuthApprovalStatus };

/** Конвертация рублей в копейки с защитой от дробных хвостов */
export function rubToKopecks(rub: number): number {
	if (!Number.isFinite(rub) || Number.isNaN(rub)) return 0;
	return Math.round(rub * 100);
}

/** Конвертация копеек в рубли */
export function kopecksToRub(kopecks: number): number {
	if (!Number.isFinite(kopecks) || Number.isNaN(kopecks)) return 0;
	return kopecks / 100;
}

/** Форматирование копеек в читаемую строку рублей */
export function formatKopecks(kopecks: number): string {
	const rub = kopecksToRub(kopecks);
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(rub);
}

/** Входная позиция счета */
export interface DmsBillItemInput {
	readonly id: string;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
}

/** Результат верификации отдельной услуги */
export interface DmsVerificationResult {
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly status: DmsPreAuthApprovalStatus;
	readonly statusLabel: string;
	readonly isCovered: boolean;
	readonly dmsPayableKopecks: number;
	readonly patientPayableKopecks: number;
	readonly reason: string;
	readonly exclusionRuleId?: string | undefined;
	readonly isExcludedByRule: boolean;
	readonly approvedByGuaranteeLetter: boolean;
}

/** Опции разделения счета */
export interface DmsSplitOptions {
	readonly franchisePercent?: number | undefined; // 0..100%
	readonly franchiseFixedKopecks?: number | undefined; // Фиксированная сумма сооплаты за визит
	readonly currentVisitDate?: string | undefined; // YYYY-MM-DD
	readonly isEmergency?: boolean | undefined;
	readonly hasAcutePain?: boolean | undefined;
}

/** Строка детализации сплит-расчета */
export interface DmsSplitLineBreakdown {
	readonly itemId: string;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly lineTotalKopecks: number;
	readonly dmsCoveredKopecks: number;
	readonly patientCoPayKopecks: number;
	readonly status: DmsPreAuthApprovalStatus;
	readonly statusLabel: string;
	readonly statusDescription: string;
	readonly franchiseDeductionKopecks: number;
}

/** Итоговый результат сплит-расчета визита */
export interface DmsSplitInvoiceSummary {
	readonly lineItems: readonly DmsSplitLineBreakdown[];
	readonly totalBillKopecks: number;
	readonly totalDmsCoveredKopecks: number;
	readonly totalPatientCoPayKopecks: number;
	readonly letterInitialLimitKopecks: number;
	readonly letterUsedAmountKopecks: number;
	readonly letterRemainingLimitKopecks: number;
	readonly letterExcessKopecks: number;
	readonly isFullyCoveredByDms: boolean;
	readonly hasPatientCoPay: boolean;
	readonly balanceInvariantHolds: boolean;
	readonly warningMessage?: string | undefined;
	readonly isEmergency?: boolean | undefined;
}

/** Данные клиники для официальных документов */
export interface ClinicLegalInfo {
	readonly legalName: string;
	readonly brandName: string;
	readonly inn: string;
	readonly ogrn: string;
	readonly kpp: string;
	readonly address: string;
	readonly phone: string;
	readonly licenseNumber: string;
	readonly licenseDate: string;
	readonly chiefDoctorFullName: string;
}

export const DEFAULT_CLINIC_LEGAL_INFO: ClinicLegalInfo = {
	legalName: "ООО «Дента-Премиум Клиник»",
	brandName: "DENTE Клиника Стоматологии",
	inn: "7704123456",
	ogrn: "1037704012345",
	kpp: "770401001",
	address: "г. Москва, ул. Стоматологическая, д. 12, стр. 1",
	phone: "",
	licenseNumber: "ЛО41-01137-77/00589123",
	licenseDate: "15.03.2021",
	chiefDoctorFullName: "Д-р Смирнов Константин Владимирович",
};

// ----------------------------------------------------------------------------
// 1. ВЕРИФИКАЦИЯ УСЛУГИ НА ПОКРЫТИЕ ДМС
// ----------------------------------------------------------------------------

export function verifyServiceForDms(params: {
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly programKey: DmsProgramKey;
	readonly guaranteeLetter?: DmsGuaranteeLetterRecord | null | undefined;
	readonly requestedPriceKopecks: number;
	readonly currentVisitDate?: string | undefined;
	readonly isEmergency?: boolean | undefined;
	readonly hasAcutePain?: boolean | undefined;
}): DmsVerificationResult {
	const {
		serviceCode804n,
		serviceName,
		toothNumber,
		programKey,
		guaranteeLetter,
		requestedPriceKopecks,
		currentVisitDate,
		isEmergency,
		hasAcutePain,
	} = params;

	const program = getStatutoryProgramByKey(programKey);
	const nomenclature = getNomenclature804nByCode(serviceCode804n);

	// Проверка на правила исключений
	const matchedExclusion = STATUTORY_DMS_EXCLUSION_RULES.find((rule) => {
		if (rule.matchingNomenclatureCodes.includes(serviceCode804n)) return true;
		const lowerName = serviceName.toLowerCase();
		return rule.matchingKeywords.some((kw) => lowerName.includes(kw));
	});

	const isExcludedByProgramRule =
		matchedExclusion !== undefined &&
		matchedExclusion.excludedInPrograms.includes(programKey);

	// 0. Мандат 8e: оказание помощи при острой боли не блокируется
	if (isEmergency || hasAcutePain) {
		return {
			serviceCode804n,
			serviceName,
			toothNumber,
			status: "approved",
			statusLabel: "Экстренно (острая боль)",
			isCovered: true,
			dmsPayableKopecks: requestedPriceKopecks,
			patientPayableKopecks: 0,
			reason: "Экстренная помощь (острая боль): лечение разрешено, требуется досылка гарантийного письма ДМС.",
			exclusionRuleId: matchedExclusion?.ruleId,
			isExcludedByRule: Boolean(isExcludedByProgramRule),
			approvedByGuaranteeLetter: true,
		};
	}

	// Проверка наличия прямого согласования в гарантийном письме
	const isLetterActive =
		guaranteeLetter !== null &&
		guaranteeLetter !== undefined &&
		guaranteeLetter.status === "active" &&
		(!currentVisitDate || guaranteeLetter.validUntil >= currentVisitDate);

	const isCodeApprovedInLetter =
		Boolean(isLetterActive &&
		guaranteeLetter?.approvedNomenclatureCodes.includes(serviceCode804n));

	const isToothApprovedInLetter =
		Boolean(isLetterActive &&
		(!toothNumber ||
			guaranteeLetter?.approvedTeeth.length === 0 ||
			(toothNumber && guaranteeLetter?.approvedTeeth.includes(toothNumber))));

	const isExplicitlyApprovedByLetter =
		isLetterActive && isCodeApprovedInLetter && isToothApprovedInLetter;

	// Случай 1: Услуга является исключением и не согласована письмом
	if (isExcludedByProgramRule && !isExplicitlyApprovedByLetter) {
		return {
			serviceCode804n,
			serviceName,
			toothNumber,
			status: "rejected_exclusion",
			statusLabel: "Отказ страховой",
			isCovered: false,
			dmsPayableKopecks: 0,
			patientPayableKopecks: requestedPriceKopecks,
			reason: `Услуга входит в список исключений программы «${program.title}»: ${matchedExclusion?.reasonDescription ?? "Исключение из ДМС"}`,
			exclusionRuleId: matchedExclusion?.ruleId,
			isExcludedByRule: true,
			approvedByGuaranteeLetter: false,
		};
	}

	// Случай 2: Гарантийное письмо предоставлено, но просрочено
	if (
		guaranteeLetter &&
		(guaranteeLetter.status === "expired" ||
			(currentVisitDate && guaranteeLetter.validUntil < currentVisitDate))
	) {
		return {
			serviceCode804n,
			serviceName,
			toothNumber,
			status: "requires_letter",
			statusLabel: "Требуется гарантийное письмо",
			isCovered: false,
			dmsPayableKopecks: 0,
			patientPayableKopecks: requestedPriceKopecks,
			reason: `Срок действия гарантийного письма № ${guaranteeLetter.letterNumber} истек (${guaranteeLetter.validUntil}). Требуется продление.`,
			isExcludedByRule: false,
			approvedByGuaranteeLetter: false,
		};
	}

	// Случай 3: Гарантийное письмо активно и прямо одобряет позицию
	if (isExplicitlyApprovedByLetter && guaranteeLetter) {
		const remainingLimit = Math.max(
			0,
			guaranteeLetter.totalLimitKopecks - guaranteeLetter.usedAmountKopecks,
		);

		if (remainingLimit <= 0) {
			return {
				serviceCode804n,
				serviceName,
				toothNumber,
				status: "limit_exceeded",
				statusLabel: "Превышен лимит",
				isCovered: false,
				dmsPayableKopecks: 0,
				patientPayableKopecks: requestedPriceKopecks,
				reason: `Лимит гарантийного письма № ${guaranteeLetter.letterNumber} исчерпан (${formatKopecks(guaranteeLetter.totalLimitKopecks)}). Оплата пациентом.`,
				isExcludedByRule: false,
				approvedByGuaranteeLetter: true,
			};
		}

		if (remainingLimit < requestedPriceKopecks) {
			return {
				serviceCode804n,
				serviceName,
				toothNumber,
				status: "limit_exceeded",
				statusLabel: "Превышен лимит",
				isCovered: true,
				dmsPayableKopecks: remainingLimit,
				patientPayableKopecks: requestedPriceKopecks - remainingLimit,
				reason: `Частичное покрытие: остаток по ГП составляет ${formatKopecks(remainingLimit)}. Доплата пациента ${formatKopecks(requestedPriceKopecks - remainingLimit)}.`,
				isExcludedByRule: false,
				approvedByGuaranteeLetter: true,
			};
		}

		return {
			serviceCode804n,
			serviceName,
			toothNumber,
			status: "approved",
			statusLabel: "Согласовано",
			isCovered: true,
			dmsPayableKopecks: requestedPriceKopecks,
			patientPayableKopecks: 0,
			reason: `Согласовано гарантийным письмом № ${guaranteeLetter.letterNumber}.`,
			isExcludedByRule: false,
			approvedByGuaranteeLetter: true,
		};
	}

	// Случай 4: Базовая терапевтическая услуга без гарантийного письма
	if (nomenclature?.isBaseDmsCovered) {
		return {
			serviceCode804n,
			serviceName,
			toothNumber,
			status: "approved",
			statusLabel: "Согласовано",
			isCovered: true,
			dmsPayableKopecks: requestedPriceKopecks,
			patientPayableKopecks: 0,
			reason: `Базовое покрытие полисом ДМС по программе «${program.title}».`,
			isExcludedByRule: false,
			approvedByGuaranteeLetter: false,
		};
	}

	// Случай 5: Услуга требует отдельного согласования/ГП (КТ, сложная хирургия, ортопедия)
	return {
		serviceCode804n,
		serviceName,
		toothNumber,
		status: "pending_preauth",
		statusLabel: "На рассмотрении",
		isCovered: false,
		dmsPayableKopecks: 0,
		patientPayableKopecks: requestedPriceKopecks,
		reason: `Услуга ${serviceCode804n} не входит в стандартный объем без предварительного согласования с куратором ДМС.`,
		isExcludedByRule: false,
		approvedByGuaranteeLetter: false,
	};
}

// ----------------------------------------------------------------------------
// 2. СПЛИТ-РАСЧЕТ СЧЕТА (DMS COVERED VS PATIENT COPAY)
// ----------------------------------------------------------------------------

export function calculateDmsSplitInvoice(
	items: readonly DmsBillItemInput[],
	programKey: DmsProgramKey = "standard_therapy",
	guaranteeLetter?: DmsGuaranteeLetterRecord | null | undefined,
	options: DmsSplitOptions = {},
): DmsSplitInvoiceSummary {
	const { franchisePercent = 0, franchiseFixedKopecks = 0, currentVisitDate } = options;

	let currentRemainingLetterKopecks = guaranteeLetter
		? Math.max(0, guaranteeLetter.totalLimitKopecks - guaranteeLetter.usedAmountKopecks)
		: 0;

	let remainingFixedFranchiseKopecks = Math.max(0, franchiseFixedKopecks);

	const breakdowns: DmsSplitLineBreakdown[] = [];
	let totalBillKopecks = 0;
	let totalDmsCoveredKopecks = 0;
	let totalPatientCoPayKopecks = 0;

	for (const item of items) {
		const lineTotalKopecks = item.unitPriceKopecks * Math.max(1, item.quantity);
		totalBillKopecks += lineTotalKopecks;

		const verification = verifyServiceForDms({
			serviceCode804n: item.serviceCode804n,
			serviceName: item.serviceName,
			toothNumber: item.toothNumber,
			programKey,
			guaranteeLetter: guaranteeLetter
				? {
						...guaranteeLetter,
						usedAmountKopecks:
							guaranteeLetter.totalLimitKopecks - currentRemainingLetterKopecks,
					}
				: null,
			requestedPriceKopecks: lineTotalKopecks,
			currentVisitDate,
			isEmergency: options.isEmergency,
			hasAcutePain: options.hasAcutePain,
		});

		let dmsLineCoveredKopecks = 0;
		let patientLineCoPayKopecks = lineTotalKopecks;
		let franchiseDeductionKopecks = 0;

		if (verification.isCovered) {
			let rawDmsCovered = verification.dmsPayableKopecks;

			// Если используется ГП, списываем из лимита
			if (guaranteeLetter && verification.approvedByGuaranteeLetter) {
				const applicableFromLimit = Math.min(rawDmsCovered, currentRemainingLetterKopecks);
				if (options.isEmergency || options.hasAcutePain) {
					// При острой боли покрытие не блокируется исчерпанием лимита
					rawDmsCovered = rawDmsCovered;
					currentRemainingLetterKopecks = Math.max(0, currentRemainingLetterKopecks - applicableFromLimit);
				} else {
					rawDmsCovered = applicableFromLimit;
					currentRemainingLetterKopecks -= applicableFromLimit;
				}
			}

			// 1. Процентная франшиза (софинансирование пациента)
			if (franchisePercent > 0 && franchisePercent <= 100) {
				const percentDeduction = Math.round(
					rawDmsCovered * (franchisePercent / 100),
				);
				franchiseDeductionKopecks += percentDeduction;
				rawDmsCovered -= percentDeduction;
			}

			// 2. Фиксированная франшиза (первоочередной вычет)
			if (remainingFixedFranchiseKopecks > 0 && rawDmsCovered > 0) {
				const fixedDeduction = Math.min(rawDmsCovered, remainingFixedFranchiseKopecks);
				franchiseDeductionKopecks += fixedDeduction;
				rawDmsCovered -= fixedDeduction;
				remainingFixedFranchiseKopecks -= fixedDeduction;
			}

			dmsLineCoveredKopecks = Math.max(0, rawDmsCovered);
			patientLineCoPayKopecks = lineTotalKopecks - dmsLineCoveredKopecks;
		}

		totalDmsCoveredKopecks += dmsLineCoveredKopecks;
		totalPatientCoPayKopecks += patientLineCoPayKopecks;

		breakdowns.push({
			itemId: item.id,
			serviceCode804n: item.serviceCode804n,
			serviceName: item.serviceName,
			toothNumber: item.toothNumber,
			quantity: item.quantity,
			unitPriceKopecks: item.unitPriceKopecks,
			lineTotalKopecks,
			dmsCoveredKopecks: dmsLineCoveredKopecks,
			patientCoPayKopecks: patientLineCoPayKopecks,
			status: verification.status,
			statusLabel: verification.statusLabel,
			statusDescription: verification.reason,
			franchiseDeductionKopecks,
		});
	}

	const initialRemaining = guaranteeLetter
		? Math.max(0, guaranteeLetter.totalLimitKopecks - guaranteeLetter.usedAmountKopecks)
		: 0;

	const letterExcessKopecks = Math.max(0, totalBillKopecks - totalDmsCoveredKopecks);

	const balanceInvariantHolds =
		totalBillKopecks === totalDmsCoveredKopecks + totalPatientCoPayKopecks;

	const isUrgentCare = Boolean(options.isEmergency || options.hasAcutePain);
	let warningMessage: string | undefined = undefined;
	if (isUrgentCare || !guaranteeLetter || (guaranteeLetter && currentRemainingLetterKopecks <= 0) || letterExcessKopecks > 0) {
		warningMessage = "Требуется досылка гарантийного письма ДМС";
	}

	return {
		lineItems: breakdowns,
		totalBillKopecks,
		totalDmsCoveredKopecks,
		totalPatientCoPayKopecks,
		letterInitialLimitKopecks: guaranteeLetter?.totalLimitKopecks ?? 0,
		letterUsedAmountKopecks: guaranteeLetter
			? (guaranteeLetter.totalLimitKopecks - currentRemainingLetterKopecks)
			: 0,
		letterRemainingLimitKopecks: currentRemainingLetterKopecks,
		letterExcessKopecks,
		isFullyCoveredByDms: totalPatientCoPayKopecks === 0,
		hasPatientCoPay: totalPatientCoPayKopecks > 0,
		balanceInvariantHolds,
		warningMessage,
		isEmergency: isUrgentCare,
	};
}

export * from "./dmsDocumentGenerators";

