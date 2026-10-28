import type { Kopecks } from "../../utils/money.js";
import type { DmsGuaranteeLetter } from "./guaranteeTypes.js";
import type { DmsServiceCheckResult } from "./guaranteeEvaluationTypes.js";
import { evaluateGuaranteeLetterCoverage } from "./guaranteeQuotaTracker.js";

export const STANDARD_DMS_EXCLUDED_804N_SERVICES = [
	{ code804n: "A16.07.003", nameRu: "Восстановление зуба керамическим виниром / виниринг", category: "veneers", reasonRu: "Эстетическая реставрация (виниры) исключена из стандартного покрытия ДМС" },
	{ code804n: "A16.07.003.001", nameRu: "Керамический винир (E.max, полевой шпат)", category: "veneers", reasonRu: "Керамические виниры относятся к эстетической стоматологии и не покрываются базовым полисом ДМС" },
	{ code804n: "A16.07.054", nameRu: "Внутрикостная дентальная имплантация", category: "implantology", reasonRu: "Дентальная имплантация исключена из стандартных программ ДМС (требуется спец. программа или оплата пациентом)" },
	{ code804n: "A16.07.006", nameRu: "Установка дентального имплантата (хирургический этап)", category: "implantology", reasonRu: "Хирургическая установка имплантатов исключена из базового покрытия ДМС" },
	{ code804n: "A16.07.050", nameRu: "Профессиональное отбеливание зубов", category: "whitening", reasonRu: "Косметическое отбеливание не входит в стандартный перечень страховых рисков ДМС" },
	{ code804n: "A16.07.048", nameRu: "Ортодонтическая коррекция с применением брекет-систем", category: "orthodontics", reasonRu: "Исправление прикуса и брекет-системы не покрываются стандартным полисом ДМС" },
] as const;

export const STANDARD_DMS_COVERED_804N_PREFIXES = [
	"A16.07.002", "A16.07.030", "A16.07.008", "A16.07.001",
	"A11.07.010", "A11.07.011", "A11.07.012", "B01.003.004",
	"A06.07.003", "A06.07.007", "A16.07.051",
] as const;

export function checkServiceDmsCoverage(
	letter: DmsGuaranteeLetter | null | undefined,
	service: {
		code804n: string; nameRu?: string; priceKopecks: Kopecks;
		isEmergency?: boolean; hasAcutePain?: boolean; serviceDate?: string;
	},
): DmsServiceCheckResult {
	const isUrgentCare = Boolean(service.isEmergency || service.hasAcutePain);
	if (isUrgentCare) {
		return {
			isCovered: true,
			coverageIndicatorRu: "Экстренная помощь (острая боль): приём разрешен без блокировок, требуется досылка гарантийного письма ДМС",
			isDoctorWorkBlocked: false,
			approvedInsurerKopecks: service.priceKopecks,
			patientPortionKopecks: 0,
			remainingLimitAfterKopecks: letter ? Math.max(0, letter.remainingLimitKopecks - service.priceKopecks) : 0,
			reasonRu: "Экстренная медицинская помощь при острой зубной боли",
			recommendationRu: "Окажите помощь пациенту. Запросите гарантийное письмо у страховой компании.",
		};
	}

	const normalizedCode = service.code804n.trim();
	const isKnownExcluded = STANDARD_DMS_EXCLUDED_804N_SERVICES.some(
		(ex) => normalizedCode === ex.code804n || normalizedCode.startsWith(ex.code804n),
	);

	if (!letter) {
		if (isKnownExcluded) {
			const excludedMeta = STANDARD_DMS_EXCLUDED_804N_SERVICES.find(
				(ex) => normalizedCode === ex.code804n || normalizedCode.startsWith(ex.code804n),
			);
			return {
				isCovered: false,
				coverageIndicatorRu: "Услуга не покрывается ДМС, требуется согласование страховой или оплата пациентом",
				isDoctorWorkBlocked: false,
				approvedInsurerKopecks: 0,
				patientPortionKopecks: service.priceKopecks,
				remainingLimitAfterKopecks: 0,
				reasonRu: excludedMeta?.reasonRu ?? `Услуга ${normalizedCode} (${service.nameRu ?? ""}) исключена из стандартного ДМС`,
				recommendationRu: "Услуга оплачивается пациентом в кассу или требуется отдельное гарантийное письмо от СМО.",
			};
		}

		const isStandardCovered = STANDARD_DMS_COVERED_804N_PREFIXES.some((prefix) => normalizedCode.startsWith(prefix));
		if (isStandardCovered) {
			return {
				isCovered: true,
				coverageIndicatorRu: "Покрывается базовой программой ДМС",
				isDoctorWorkBlocked: false,
				approvedInsurerKopecks: service.priceKopecks,
				patientPortionKopecks: 0,
				remainingLimitAfterKopecks: 0,
				reasonRu: `Услуга ${normalizedCode} входит в базовый терапевтический стандарт ДМС`,
				recommendationRu: "Услуга направляется в реестр на возмещение страховой компанией.",
			};
		}

		return {
			isCovered: false,
			coverageIndicatorRu: "Услуга не покрывается ДМС, требуется согласование страховой или оплата пациентом",
			isDoctorWorkBlocked: false,
			approvedInsurerKopecks: 0,
			patientPortionKopecks: service.priceKopecks,
			remainingLimitAfterKopecks: 0,
			reasonRu: `Услуга ${normalizedCode} не входит в стандартный объем без гарантийного письма`,
			recommendationRu: "Услуга оплачивается пациентом либо запрашивается гарантийное письмо у страховой компании.",
		};
	}

	const evaluation = evaluateGuaranteeLetterCoverage(letter, service.priceKopecks, {
		serviceCode804n: service.code804n, serviceName: service.nameRu,
		serviceDate: service.serviceDate, isEmergency: service.isEmergency, hasAcutePain: service.hasAcutePain,
	});

	return {
		isCovered: evaluation.isApproved,
		coverageIndicatorRu: evaluation.coverageIndicatorRu,
		isDoctorWorkBlocked: false,
		approvedInsurerKopecks: evaluation.approvedInsurerKopecks,
		patientPortionKopecks: evaluation.overflowToPatientKopecks,
		remainingLimitAfterKopecks: evaluation.remainingLimitAfterKopecks,
		reasonRu: evaluation.rejectionReasonRu ?? (evaluation.isApproved ? "Услуга согласована страховой компанией" : "Не согласовано"),
		recommendationRu: evaluation.actionRecommendationsRu[0] ?? "Действуйте в соответствии с регламентом ДМС.",
	};
}
