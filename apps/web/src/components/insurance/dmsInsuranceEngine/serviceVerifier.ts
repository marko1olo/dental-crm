/**
 * serviceVerifier.ts — Верификация медицинских услуг на покрытие ДМС
 */

import {
	getNomenclature804nByCode,
	getStatutoryProgramByKey,
	STATUTORY_DMS_EXCLUSION_RULES,
	type DmsGuaranteeLetterRecord,
	type DmsProgramKey,
} from "../dmsInsurancePresets.js";
import { formatKopecks } from "./currency.js";
import type { DmsVerificationResult } from "./types.js";

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
	const { serviceCode804n, serviceName, toothNumber, programKey, guaranteeLetter, requestedPriceKopecks, currentVisitDate, isEmergency, hasAcutePain } = params;

	const program = getStatutoryProgramByKey(programKey);
	const nomenclature = getNomenclature804nByCode(serviceCode804n);

	const matchedExclusion = STATUTORY_DMS_EXCLUSION_RULES.find((rule) => {
		if (rule.matchingNomenclatureCodes.includes(serviceCode804n)) return true;
		const lowerName = serviceName.toLowerCase();
		return rule.matchingKeywords.some((kw) => lowerName.includes(kw));
	});
	const isExcludedByProgramRule = matchedExclusion !== undefined && matchedExclusion.excludedInPrograms.includes(programKey);

	if (isEmergency || hasAcutePain) {
		return {
			serviceCode804n, serviceName, toothNumber, status: "approved", statusLabel: "Экстренно (острая боль)",
			isCovered: true, dmsPayableKopecks: requestedPriceKopecks, patientPayableKopecks: 0,
			reason: "Экстренная помощь (острая боль): лечение разрешено, требуется досылка гарантийного письма ДМС.",
			exclusionRuleId: matchedExclusion?.ruleId, isExcludedByRule: Boolean(isExcludedByProgramRule), approvedByGuaranteeLetter: true,
		};
	}

	const isLetterActive = guaranteeLetter != null && guaranteeLetter.status === "active" && (!currentVisitDate || guaranteeLetter.validUntil >= currentVisitDate);
	const isCodeApproved = Boolean(isLetterActive && guaranteeLetter?.approvedNomenclatureCodes.includes(serviceCode804n));
	const isToothApproved = Boolean(isLetterActive && (!toothNumber || guaranteeLetter?.approvedTeeth.length === 0 || (toothNumber && guaranteeLetter?.approvedTeeth.includes(toothNumber))));
	const isExplicitlyApproved = isLetterActive && isCodeApproved && isToothApproved;

	if (isExcludedByProgramRule && !isExplicitlyApproved) {
		return {
			serviceCode804n, serviceName, toothNumber, status: "rejected_exclusion", statusLabel: "Отказ страховой",
			isCovered: false, dmsPayableKopecks: 0, patientPayableKopecks: requestedPriceKopecks,
			reason: `Услуга входит в список исключений программы «${program.title}»: ${matchedExclusion?.reasonDescription ?? "Исключение из ДМС"}`,
			exclusionRuleId: matchedExclusion?.ruleId, isExcludedByRule: true, approvedByGuaranteeLetter: false,
		};
	}

	if (guaranteeLetter && (guaranteeLetter.status === "expired" || (currentVisitDate && guaranteeLetter.validUntil < currentVisitDate))) {
		return {
			serviceCode804n, serviceName, toothNumber, status: "requires_letter", statusLabel: "Требуется гарантийное письмо",
			isCovered: false, dmsPayableKopecks: 0, patientPayableKopecks: requestedPriceKopecks,
			reason: `Срок действия гарантийного письма № ${guaranteeLetter.letterNumber} истек (${guaranteeLetter.validUntil}). Требуется продление.`,
			isExcludedByRule: false, approvedByGuaranteeLetter: false,
		};
	}

	if (isExplicitlyApproved && guaranteeLetter) {
		const remainingLimit = Math.max(0, guaranteeLetter.totalLimitKopecks - guaranteeLetter.usedAmountKopecks);
		if (remainingLimit <= 0) {
			return {
				serviceCode804n, serviceName, toothNumber, status: "limit_exceeded", statusLabel: "Превышен лимит",
				isCovered: false, dmsPayableKopecks: 0, patientPayableKopecks: requestedPriceKopecks,
				reason: `Лимит письма № ${guaranteeLetter.letterNumber} исчерпан (${formatKopecks(guaranteeLetter.totalLimitKopecks)}). Оплата пациентом.`,
				isExcludedByRule: false, approvedByGuaranteeLetter: true,
			};
		}
		if (remainingLimit < requestedPriceKopecks) {
			return {
				serviceCode804n, serviceName, toothNumber, status: "limit_exceeded", statusLabel: "Превышен лимит",
				isCovered: true, dmsPayableKopecks: remainingLimit, patientPayableKopecks: requestedPriceKopecks - remainingLimit,
				reason: `Частичное покрытие: остаток по ГП составляет ${formatKopecks(remainingLimit)}. Доплата пациента ${formatKopecks(requestedPriceKopecks - remainingLimit)}.`,
				isExcludedByRule: false, approvedByGuaranteeLetter: true,
			};
		}
		return {
			serviceCode804n, serviceName, toothNumber, status: "approved", statusLabel: "Согласовано",
			isCovered: true, dmsPayableKopecks: requestedPriceKopecks, patientPayableKopecks: 0,
			reason: `Согласовано гарантийным письмом № ${guaranteeLetter.letterNumber}.`,
			isExcludedByRule: false, approvedByGuaranteeLetter: true,
		};
	}

	if (nomenclature?.isBaseDmsCovered) {
		return {
			serviceCode804n, serviceName, toothNumber, status: "approved", statusLabel: "Согласовано",
			isCovered: true, dmsPayableKopecks: requestedPriceKopecks, patientPayableKopecks: 0,
			reason: `Базовое покрытие полисом ДМС по программе «${program.title}».`,
			isExcludedByRule: false, approvedByGuaranteeLetter: false,
		};
	}

	return {
		serviceCode804n, serviceName, toothNumber, status: "pending_preauth", statusLabel: "На рассмотрении",
		isCovered: false, dmsPayableKopecks: 0, patientPayableKopecks: requestedPriceKopecks,
		reason: `Услуга ${serviceCode804n} требует предварительного согласования с куратором ДМС.`,
		isExcludedByRule: false, approvedByGuaranteeLetter: false,
	};
}
