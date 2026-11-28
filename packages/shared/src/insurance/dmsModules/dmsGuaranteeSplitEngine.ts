import { z } from "zod";
import {
	calculatePercentDiscountKopecks,
	formatDiscountPercent,
	formatKopecksRu,
	formatKopecksToRub,
	kopecksToRubles,
	rublesToKopecks,
} from "../../money.js";
import {
	type DmsGuaranteeLetter,
	dmsSplitCalculationItemSchema,
	type InsuranceContract,
} from "../../schemas/documentChainAndDmsSchemas.js";
import { STANDARD_DMS_EXCLUDED_804N_SERVICES } from "../guaranteeModules/guaranteeMatcher.js";
import { calculateItemDmsSplit } from "./dmsItemSplitEngine.js";

export type DmsSplitCalculationItem = z.infer<typeof dmsSplitCalculationItemSchema>;

export const dmsSplitLineResultSchema = z.object({
	serviceId: z.string(),
	serviceCode: z.string().optional(),
	serviceName: z.string().optional(),
	category: z.string(),
	toothNumber: z.string().optional(),
	quantity: z.number(),
	unitPriceRub: z.number(),
	discountRub: z.number(),
	totalPriceRub: z.number(),
	dmsCoveredRub: z.number(),
	patientCoPayRub: z.number(),
	unitPriceKopecks: z.number().int().optional(),
	discountKopecks: z.number().int().optional(),
	totalPriceKopecks: z.number().int().optional(),
	dmsCoveredKopecks: z.number().int().optional(),
	patientCoPayKopecks: z.number().int().optional(),
	effectiveCoveragePct: z.number(),
	isApprovedByLetter: z.boolean(),
	isExcludedByProgram: z.boolean(),
	splitReason: z.string(),
	status: z.enum(["full_dms", "co_payment", "patient_full"]),
});

export type DmsSplitLineResult = z.infer<typeof dmsSplitLineResultSchema>;

export const dmsSplitCalculationResultSchema = z.object({
	totalBillRub: z.number(),
	totalDmsCoveredRub: z.number(),
	totalPatientCoPayRub: z.number(),
	letterApprovedLimitRub: z.number().nullable(),
	letterUsedAmountRub: z.number(),
	letterRemainingLimitRub: z.number().nullable(),
	totalBillKopecks: z.number().int().optional(),
	totalDmsCoveredKopecks: z.number().int().optional(),
	totalPatientCoPayKopecks: z.number().int().optional(),
	letterApprovedLimitKopecks: z.number().int().nullable().optional(),
	letterUsedAmountKopecks: z.number().int().optional(),
	letterRemainingLimitKopecks: z.number().int().nullable().optional(),
	hasUnapprovedServices: z.boolean(),
	hasExcludedServices: z.boolean(),
	integrityInvariantHolds: z.boolean(),
	warningMessage: z.string().optional(),
	isEmergency: z.boolean().optional(),
	lineItems: z.array(dmsSplitLineResultSchema),
});

export type DmsSplitCalculationResult = z.infer<typeof dmsSplitCalculationResultSchema>;

/**
 * Канонический расчет сплитования счетов ДМС, франшизы, согласований и гарантийных писем.
 * Единственный SSOT для DmsStudio, Fastify роутов и биллинговых интеграций DENTE CRM.
 */
export function calculateDmsGuaranteeSplit(
	letter: Partial<DmsGuaranteeLetter> | null | undefined,
	items: readonly DmsSplitCalculationItem[],
	options: {
		visitDate?: string | undefined;
		contract?: Pick<
			InsuranceContract,
			| "coverageTherapyPct"
			| "coverageSurgeryPct"
			| "coverageOrthoPct"
			| "coverageHygienePct"
			| "annualLimitRub"
		> | null | undefined;
		isEmergency?: boolean | undefined;
		hasAcutePain?: boolean | undefined;
	} = {},
): DmsSplitCalculationResult {
	const lineResults: DmsSplitLineResult[] = [];
	let totalBillKop = 0;
	let totalCoveredKop = 0;
	let totalCoPayKop = 0;

	let hasUnapproved = false;
	let hasExcluded = false;
	const isUrgentCare = Boolean(options.isEmergency || options.hasAcutePain);

	const letterMaxKop = letter != null
		? (typeof letter.remainingLimitKopecks === "number" && typeof letter.usedKopecks === "number"
			? letter.remainingLimitKopecks + letter.usedKopecks
			: typeof letter.limitKopecks === "number"
			? letter.limitKopecks
			: typeof letter.maxCoverageKopecks === "number"
			? letter.maxCoverageKopecks
			: typeof letter.maxApprovedAmountKopecks === "number"
			? letter.maxApprovedAmountKopecks
			: letter.maxCoverageRub != null
			? rublesToKopecks(letter.maxCoverageRub)
			: null)
		: null;

	const letterUsedKop = letter != null
		? (typeof letter.usedKopecks === "number"
			? letter.usedKopecks
			: typeof letter.usedAmountKopecks === "number"
			? letter.usedAmountKopecks
			: letter.usedAmountRub != null
			? Math.max(0, rublesToKopecks(letter.usedAmountRub))
			: 0)
		: 0;

	let remainingLetterKop = letter != null
		? (typeof letter.remainingLimitKopecks === "number"
			? letter.remainingLimitKopecks
			: letterMaxKop != null
			? Math.max(0, letterMaxKop - letterUsedKop)
			: null)
		: null;

	const maxCoverageRub = letterMaxKop != null ? kopecksToRubles(letterMaxKop) : (letter ? letter.maxCoverageRub : null);
	const usedAmountRub = kopecksToRubles(letterUsedKop);

	const isPendingCurator = letter ? (letter.status === "pending_approval" || letter.status === "pending_letter") : false;
	const isLetterActive = letter
		? (letter.status === "active" ||
		   letter.status === "approved" ||
		   letter.status === "pending_approval" ||
		   letter.status === "pending_letter" ||
		   letter.status === "billed")
		: false;
	const isExpired = letter && options.visitDate && letter.validUntil
		? options.visitDate > letter.validUntil
		: false;
	const isNotStarted = letter && options.visitDate && letter.validFrom
		? options.visitDate < letter.validFrom
		: false;

	for (const it of items) {
		const unitPriceKop = typeof it.unitPriceKopecks === "number"
			? it.unitPriceKopecks
			: rublesToKopecks(it.priceRub);
		const qty = Math.max(1, it.quantity);
		const discountKop = typeof it.discountKopecks === "number"
			? it.discountKopecks
			: rublesToKopecks(it.discountRub ?? 0);
		const grossLineKop = unitPriceKop * qty;
		const lineTotalKop = Math.max(0, grossLineKop - discountKop);
		totalBillKop += lineTotalKop;

		if (lineTotalKop === 0) {
			lineResults.push({
				serviceId: it.serviceId,
				serviceCode: it.serviceCode,
				serviceName: it.serviceName,
				category: it.category,
				toothNumber: it.toothNumber !== undefined ? String(it.toothNumber) : undefined,
				quantity: qty,
				unitPriceRub: it.priceRub,
				discountRub: it.discountRub ?? 0,
				totalPriceRub: 0,
				dmsCoveredRub: 0,
				patientCoPayRub: 0,
				unitPriceKopecks: unitPriceKop,
				discountKopecks: discountKop,
				totalPriceKopecks: 0,
				dmsCoveredKopecks: 0,
				patientCoPayKopecks: 0,
				effectiveCoveragePct: 0,
				isApprovedByLetter: true,
				isExcludedByProgram: false,
				splitReason: "Нулевая стоимость услуги",
				status: "full_dms",
			});
			continue;
		}

		// 1. Проверка исключений
		let isExcluded = Boolean(it.isExcluded);
		if (letter?.programExclusions?.length && it.category) {
			if (letter.programExclusions.includes(it.category)) {
				isExcluded = true;
			}
		}
		if (isExcluded && !it.isExplicitlyApproved) {
			if (isUrgentCare) {
				// Клинический регламент: при острой боли оказание помощи не блокируется
				const candidateCoveredKop = lineTotalKop;
				totalCoveredKop += candidateCoveredKop;
				lineResults.push({
					serviceId: it.serviceId,
					serviceCode: it.serviceCode,
					serviceName: it.serviceName,
					category: it.category,
					toothNumber: it.toothNumber !== undefined ? String(it.toothNumber) : undefined,
					quantity: qty,
					unitPriceRub: it.priceRub,
					discountRub: it.discountRub ?? 0,
					totalPriceRub: kopecksToRubles(lineTotalKop),
					dmsCoveredRub: kopecksToRubles(candidateCoveredKop),
					patientCoPayRub: 0,
					unitPriceKopecks: unitPriceKop,
					discountKopecks: discountKop,
					totalPriceKopecks: lineTotalKop,
					dmsCoveredKopecks: candidateCoveredKop,
					patientCoPayKopecks: 0,
					effectiveCoveragePct: 100,
					isApprovedByLetter: true,
					isExcludedByProgram: true,
					splitReason: "Экстренная помощь (острая боль). Требуется досылка гарантийного письма ДМС",
					status: "full_dms",
				});
				continue;
			}

			hasExcluded = true;
			const coPayKop = lineTotalKop;
			totalCoPayKop += coPayKop;
			lineResults.push({
				serviceId: it.serviceId,
				serviceCode: it.serviceCode,
				serviceName: it.serviceName,
				category: it.category,
				toothNumber: it.toothNumber !== undefined ? String(it.toothNumber) : undefined,
				quantity: qty,
				unitPriceRub: it.priceRub,
				discountRub: it.discountRub ?? 0,
				totalPriceRub: kopecksToRubles(lineTotalKop),
				dmsCoveredRub: 0,
				patientCoPayRub: kopecksToRubles(coPayKop),
				unitPriceKopecks: unitPriceKop,
				discountKopecks: discountKop,
				totalPriceKopecks: lineTotalKop,
				dmsCoveredKopecks: 0,
				patientCoPayKopecks: coPayKop,
				effectiveCoveragePct: 0,
				isApprovedByLetter: false,
				isExcludedByProgram: true,
				splitReason: "Исключение из программы ДМС (100% доплата пациентом)",
				status: "patient_full",
			});
			continue;
		}

		// 2. Проверка активности и сроков гарантийного письма
		if (letter) {
			if (!isLetterActive || isExpired || isNotStarted) {
				if (isUrgentCare) {
					// Клинический регламент: просроченное или неактивное письмо не блокирует острую боль
					const candidateCoveredKop = lineTotalKop;
					totalCoveredKop += candidateCoveredKop;
					lineResults.push({
						serviceId: it.serviceId,
						serviceCode: it.serviceCode,
						serviceName: it.serviceName,
						category: it.category,
						toothNumber: it.toothNumber !== undefined ? String(it.toothNumber) : undefined,
						quantity: qty,
						unitPriceRub: it.priceRub,
						discountRub: it.discountRub ?? 0,
						totalPriceRub: kopecksToRubles(lineTotalKop),
						dmsCoveredRub: kopecksToRubles(candidateCoveredKop),
						patientCoPayRub: 0,
						unitPriceKopecks: unitPriceKop,
						discountKopecks: discountKop,
						totalPriceKopecks: lineTotalKop,
						dmsCoveredKopecks: candidateCoveredKop,
						patientCoPayKopecks: 0,
						effectiveCoveragePct: 100,
						isApprovedByLetter: true,
						isExcludedByProgram: false,
						splitReason: "Экстренная помощь (острая боль). Требуется досылка гарантийного письма ДМС",
						status: "full_dms",
					});
					continue;
				}

				hasUnapproved = true;
				const reason = !isLetterActive
					? `Гарантийное письмо № ${letter.letterNumber} неактивно (${letter.status})`
					: isExpired
					? `Срок действия гарантийного письма № ${letter.letterNumber} истек (${letter.validUntil})`
					: `Гарантийное письмо № ${letter.letterNumber} вступает в силу с ${letter.validFrom}`;
				const coPayKop = lineTotalKop;
				totalCoPayKop += coPayKop;
				lineResults.push({
					serviceId: it.serviceId,
					serviceCode: it.serviceCode,
					serviceName: it.serviceName,
					category: it.category,
					toothNumber: it.toothNumber !== undefined ? String(it.toothNumber) : undefined,
					quantity: qty,
					unitPriceRub: it.priceRub,
					discountRub: it.discountRub ?? 0,
					totalPriceRub: kopecksToRubles(lineTotalKop),
					dmsCoveredRub: 0,
					patientCoPayRub: kopecksToRubles(coPayKop),
					unitPriceKopecks: unitPriceKop,
					discountKopecks: discountKop,
					totalPriceKopecks: lineTotalKop,
					dmsCoveredKopecks: 0,
					patientCoPayKopecks: coPayKop,
					effectiveCoveragePct: 0,
					isApprovedByLetter: false,
					isExcludedByProgram: false,
					splitReason: reason,
					status: "patient_full",
				});
				continue;
			}

			// 3. Проверка согласования услуги по 804н
			let isServiceApproved = true;
			if (letter.approvedServiceCodes && letter.approvedServiceCodes.length > 0) {
				const sCode = (it.serviceCode || "").trim().toUpperCase();
				isServiceApproved = letter.approvedServiceCodes.some((approved) => {
					const app = approved.trim().toUpperCase();
					return sCode === app || (sCode.length > 0 && sCode.startsWith(app));
				});
			}

			// 4. Проверка согласования зуба (FDI)
			let isToothApproved = true;
			if (letter.approvedTeethFdi && letter.approvedTeethFdi.length > 0 && it.toothNumber) {
				const tStr = String(it.toothNumber).replace(/[^0-9]/g, "");
				isToothApproved = letter.approvedTeethFdi.some((approved) => {
					const app = String(approved).replace(/[^0-9]/g, "");
					return tStr === app;
				});
			}

			if (!isServiceApproved || !isToothApproved) {
				if (isUrgentCare) {
					// Клинический регламент: несогласованный зуб/услуга при острой боли покрываются экстренно
					const candidateCoveredKop = lineTotalKop;
					totalCoveredKop += candidateCoveredKop;
					lineResults.push({
						serviceId: it.serviceId,
						serviceCode: it.serviceCode,
						serviceName: it.serviceName,
						category: it.category,
						toothNumber: it.toothNumber !== undefined ? String(it.toothNumber) : undefined,
						quantity: qty,
						unitPriceRub: it.priceRub,
						discountRub: it.discountRub ?? 0,
						totalPriceRub: kopecksToRubles(lineTotalKop),
						dmsCoveredRub: kopecksToRubles(candidateCoveredKop),
						patientCoPayRub: 0,
						unitPriceKopecks: unitPriceKop,
						discountKopecks: discountKop,
						totalPriceKopecks: lineTotalKop,
						dmsCoveredKopecks: candidateCoveredKop,
						patientCoPayKopecks: 0,
						effectiveCoveragePct: 100,
						isApprovedByLetter: true,
						isExcludedByProgram: false,
						splitReason: "Экстренная помощь (острая боль). Требуется досылка гарантийного письма ДМС",
						status: "full_dms",
					});
					continue;
				}

				hasUnapproved = true;
				const reason = !isServiceApproved
					? `Услуга ${it.serviceCode || it.serviceName || ""} не входит в согласованный перечень процедур гарантийного письма № ${letter.letterNumber}`
					: `Зуб ${it.toothNumber} не согласован гарантийным письмом № ${letter.letterNumber}`;
				const coPayKop = lineTotalKop;
				totalCoPayKop += coPayKop;
				lineResults.push({
					serviceId: it.serviceId,
					serviceCode: it.serviceCode,
					serviceName: it.serviceName,
					category: it.category,
					toothNumber: it.toothNumber !== undefined ? String(it.toothNumber) : undefined,
					quantity: qty,
					unitPriceRub: it.priceRub,
					discountRub: it.discountRub ?? 0,
					totalPriceRub: kopecksToRubles(lineTotalKop),
					dmsCoveredRub: 0,
					patientCoPayRub: kopecksToRubles(coPayKop),
					unitPriceKopecks: unitPriceKop,
					discountKopecks: discountKop,
					totalPriceKopecks: lineTotalKop,
					dmsCoveredKopecks: 0,
					patientCoPayKopecks: coPayKop,
					effectiveCoveragePct: 0,
					isApprovedByLetter: false,
					isExcludedByProgram: false,
					splitReason: reason,
					status: "patient_full",
				});
				continue;
			}
		} else if (isUrgentCare && !options.contract) {
			// Случай: гарантийного письма нет, но приём экстренный (острая боль)
			const candidateCoveredKop = lineTotalKop;
			totalCoveredKop += candidateCoveredKop;
			lineResults.push({
				serviceId: it.serviceId,
				serviceCode: it.serviceCode,
				serviceName: it.serviceName,
				category: it.category,
				toothNumber: it.toothNumber !== undefined ? String(it.toothNumber) : undefined,
				quantity: qty,
				unitPriceRub: it.priceRub,
				discountRub: it.discountRub ?? 0,
				totalPriceRub: kopecksToRubles(lineTotalKop),
				dmsCoveredRub: kopecksToRubles(candidateCoveredKop),
				patientCoPayRub: 0,
				unitPriceKopecks: unitPriceKop,
				discountKopecks: discountKop,
				totalPriceKopecks: lineTotalKop,
				dmsCoveredKopecks: candidateCoveredKop,
				patientCoPayKopecks: 0,
				effectiveCoveragePct: 100,
				isApprovedByLetter: true,
				isExcludedByProgram: false,
				splitReason: "Экстренная помощь (острая боль). Требуется досылка гарантийного письма ДМС",
				status: "full_dms",
			});
			continue;
		}

		// 5. Расчет базового процента покрытия
		let pct = 100;
		if (options.contract) {
			switch (it.category) {
				case "therapy":
					pct = Number(options.contract.coverageTherapyPct) || 0;
					break;
				case "surgery":
					pct = Number(options.contract.coverageSurgeryPct) || 0;
					break;
				case "orthodontics":
				case "prosthetics":
					pct = Number(options.contract.coverageOrthoPct) || 0;
					break;
				case "hygiene":
				case "periodontology":
					pct = Number(options.contract.coverageHygienePct) || 0;
					break;
				case "consultation":
				case "imaging":
					pct = 100;
					break;
				case "documents":
				case "other":
				default:
					pct = 0;
					break;
			}
			pct = Math.min(100, Math.max(0, pct));
		}

		// 6. Франшиза гарантийного письма через канонический dmsFranchiseEngine
		let franchiseDeductionKop = 0;
		if (letter) {
			const franchisePctVal = typeof letter.defaultFranchisePercent === "number"
				? letter.defaultFranchisePercent
				: (letter.franchisePct || 0);
			if ((letter.franchiseType === "percent" || !letter.franchiseType || letter.franchiseType === "none") && franchisePctVal > 0) {
				const clampedPct = Math.min(100, Math.max(0, franchisePctVal));
				const splitItem = calculateItemDmsSplit(lineTotalKop, clampedPct, true);
				franchiseDeductionKop = splitItem.patientKopecks;
			} else if (letter.franchiseType === "fixed_rub" && (letter.franchiseFixedRub ?? 0) > 0) {
				const fixedKop = rublesToKopecks(letter.franchiseFixedRub ?? 0);
				franchiseDeductionKop = Math.min(lineTotalKop, fixedKop);
			}
		}

		let candidateCoveredKop = Math.max(
			0,
			calculatePercentDiscountKopecks(lineTotalKop, pct) - franchiseDeductionKop,
		);

		// 7. Ограничение лимитом письма
		let splitReason = isPendingCurator
			? "Согласование куратором ДМС (отложенная проводка бэк-офиса)"
			: "100% покрытие по условиям программы ДМС";
		let status: "full_dms" | "co_payment" | "patient_full" = "full_dms";

		if (remainingLetterKop != null) {
			if (candidateCoveredKop <= remainingLetterKop) {
				remainingLetterKop -= candidateCoveredKop;
				if (franchiseDeductionKop > 0 || pct < 100) {
					status = "co_payment";
					splitReason = franchiseDeductionKop > 0
						? `Сооплата франшизы (${kopecksToRubles(franchiseDeductionKop)} ₽)`
						: `Частичное покрытие по тарифу (${pct}%)`;
				}
			} else if (remainingLetterKop > 0) {
				const excessKop = candidateCoveredKop - remainingLetterKop;
				if (isUrgentCare) {
					// При острой боли остаток ГП используется, а превышение покрывается экстренно
					candidateCoveredKop = candidateCoveredKop;
					remainingLetterKop = 0;
					status = "full_dms";
					splitReason = `Экстренная помощь (острая боль) сверх лимита на ${kopecksToRubles(excessKop)} ₽. Требуется досылка гарантийного письма ДМС`;
				} else {
					candidateCoveredKop = remainingLetterKop;
					remainingLetterKop = 0;
					status = "co_payment";
					splitReason = `Превышен остаток лимита ГП на ${kopecksToRubles(excessKop)} ₽ (доплата пациентом)`;
				}
			} else {
				if (isUrgentCare) {
					// При острой боли исчерпание лимита не блокирует экстренную помощь
					candidateCoveredKop = calculatePercentDiscountKopecks(lineTotalKop, pct);
					status = "full_dms";
					splitReason = "Экстренная помощь (острая боль) при исчерпанном лимите ГП. Требуется досылка гарантийного письма ДМС";
				} else {
					candidateCoveredKop = 0;
					status = "patient_full";
					splitReason = "Лимит гарантийного письма полностью исчерпан";
				}
			}
		} else if (franchiseDeductionKop > 0 || pct < 100) {
			status = "co_payment";
			splitReason = franchiseDeductionKop > 0
				? `Сооплата франшизы (${kopecksToRubles(franchiseDeductionKop)} ₽)`
				: `Частичное покрытие по тарифу (${pct}%)`;
		}

		if (isPendingCurator && !splitReason.includes("отложенная проводка")) {
			splitReason = `${splitReason} (отложенная проводка бэк-офиса)`;
		}

		const itemCoPayKop = lineTotalKop - candidateCoveredKop;
		totalCoveredKop += candidateCoveredKop;
		totalCoPayKop += itemCoPayKop;

		const effPct = Math.round(Number(formatDiscountPercent(lineTotalKop, candidateCoveredKop)));

		lineResults.push({
			serviceId: it.serviceId,
			serviceCode: it.serviceCode,
			serviceName: it.serviceName,
			category: it.category,
			toothNumber: it.toothNumber !== undefined ? String(it.toothNumber) : undefined,
			quantity: qty,
			unitPriceRub: it.priceRub,
			discountRub: it.discountRub ?? 0,
			totalPriceRub: kopecksToRubles(lineTotalKop),
			dmsCoveredRub: kopecksToRubles(candidateCoveredKop),
			patientCoPayRub: kopecksToRubles(itemCoPayKop),
			unitPriceKopecks: unitPriceKop,
			discountKopecks: discountKop,
			totalPriceKopecks: lineTotalKop,
			dmsCoveredKopecks: candidateCoveredKop,
			patientCoPayKopecks: itemCoPayKop,
			effectiveCoveragePct: effPct,
			isApprovedByLetter: true,
			isExcludedByProgram: false,
			splitReason,
			status,
		});
	}

	const integrityInvariantHolds = totalCoveredKop + totalCoPayKop === totalBillKop;

	let warningMessage: string | undefined = undefined;
	if (isUrgentCare || !letter || hasUnapproved || isExpired || (remainingLetterKop !== null && remainingLetterKop === 0)) {
		warningMessage = "Требуется досылка гарантийного письма ДМС";
	} else if (isPendingCurator) {
		warningMessage = "Ожидается ответ куратора ДМС (отложенная проводка бэк-офиса)";
	}

	return {
		totalBillRub: kopecksToRubles(totalBillKop),
		totalDmsCoveredRub: kopecksToRubles(totalCoveredKop),
		totalPatientCoPayRub: kopecksToRubles(totalCoPayKop),
		letterApprovedLimitRub: maxCoverageRub ?? null,
		letterUsedAmountRub: usedAmountRub,
		letterRemainingLimitRub: remainingLetterKop != null ? kopecksToRubles(remainingLetterKop) : null,
		totalBillKopecks: totalBillKop,
		totalDmsCoveredKopecks: totalCoveredKop,
		totalPatientCoPayKopecks: totalCoPayKop,
		letterApprovedLimitKopecks: letterMaxKop,
		letterUsedAmountKopecks: letterUsedKop,
		letterRemainingLimitKopecks: remainingLetterKop,
		hasUnapprovedServices: hasUnapproved,
		hasExcludedServices: hasExcluded,
		integrityInvariantHolds,
		warningMessage,
		isEmergency: isUrgentCare,
		lineItems: lineResults,
	};
}
