import type { DmsGuaranteeLetter, DmsGuaranteeLetterStatus } from "./guaranteeTypes.js";

export interface GuaranteeValidationResult {
	readonly isValid: boolean;
	readonly status: "valid" | "not_yet_valid" | "expired" | "inactive" | "exhausted";
	readonly reasonRu?: string;
}

export function validateGuaranteeLetterDates(
	letter: Pick<DmsGuaranteeLetter, "validFrom" | "validTo">,
	serviceDate: string,
): { isValid: boolean; reasonRu?: string; isExpired: boolean; isNotYetValid: boolean } {
	if (serviceDate < letter.validFrom) {
		return {
			isValid: false,
			isNotYetValid: true,
			isExpired: false,
			reasonRu: `Дата услуги (${serviceDate}) предшествует началу действия гарантийного письма (${letter.validFrom})`,
		};
	}
	if (serviceDate > letter.validTo) {
		return {
			isValid: false,
			isNotYetValid: false,
			isExpired: true,
			reasonRu: `Срок действия гарантийного письма истек ${letter.validTo} (дата услуги: ${serviceDate})`,
		};
	}
	return { isValid: true, isNotYetValid: false, isExpired: false };
}

export function normalizePatientFullName(name: string): string {
	return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function validatePatientFullNameMatch(letterPatientName: string, expectedPatientName: string): boolean {
	const normLetter = normalizePatientFullName(letterPatientName);
	const normExpected = normalizePatientFullName(expectedPatientName);
	if (normLetter === normExpected) return true;

	const partsLetter = normLetter.split(" ").filter(Boolean);
	const partsExpected = normExpected.split(" ").filter(Boolean);
	if (partsLetter.length >= 2 && partsExpected.length >= 2) {
		return partsLetter[0] === partsExpected[0] && partsLetter[1] === partsExpected[1];
	}
	return false;
}

export function isGuaranteeLetterUsable(
	letter: DmsGuaranteeLetter,
	serviceDate?: string,
): GuaranteeValidationResult {
	if (letter.status === "exhausted" || letter.remainingLimitKopecks <= 0) {
		return { isValid: false, status: "exhausted", reasonRu: "Лимит гарантийного письма полностью исчерпан" };
	}
	if (letter.status !== "active" && letter.status !== "approved") {
		return { isValid: false, status: "inactive", reasonRu: `Гарантийное письмо неактивно (статус: ${letter.status})` };
	}
	if (serviceDate) {
		const dateCheck = validateGuaranteeLetterDates(letter, serviceDate);
		if (!dateCheck.isValid) {
			return {
				isValid: false,
				status: dateCheck.isExpired ? "expired" : "not_yet_valid",
				reasonRu: dateCheck.reasonRu ?? "Срок действия гарантийного письма не соответствует дате услуги",
			};
		}
	}
	return { isValid: true, status: "valid" };
}

export const DMS_STATUS_HUMAN_LABELS: Record<DmsGuaranteeLetterStatus, string> = {
	draft: "Черновик (гарантия в пути)",
	pending_approval: "На согласовании в страховой",
	approved: "Согласовано",
	active: "Действует",
	billed: "Счёт выставлен",
	paid: "Оплачено",
	exhausted: "Лимит полностью исчерпан",
	expired: "Срок действия истек",
	cancelled: "Гарантийное письмо аннулировано",
};
