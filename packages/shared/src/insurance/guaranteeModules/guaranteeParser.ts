import type { Kopecks } from "../../utils/money.js";
import { rublesToKopecks } from "../../utils/money.js";
import type { DmsGuaranteeLetter, DmsGuaranteeLetterStatus, DmsInsuranceCompanyId } from "./guaranteeTypes.js";

export interface ParsedGuaranteeLetterDraft {
	letterNumber?: string;
	issueDate?: string;
	validFrom?: string;
	validTo?: string;
	policyNumber?: string;
	patientFullName?: string;
	limitKopecks?: Kopecks;
	companyId?: DmsInsuranceCompanyId;
	companyName?: string;
	notes?: string;
}

export function parseGuaranteeLetterText(rawText: string): ParsedGuaranteeLetterDraft {
	const result: ParsedGuaranteeLetterDraft = {};
	if (!rawText || typeof rawText !== "string") return result;

	const numMatch = rawText.match(/(?:гарантийн[оеых]+\s+письм[оа-я]*|письмо)\s*(?:№|номер|#|:)\s*([A-Za-zА-Яа-я0-9\-_/]+)/iu);
	if (numMatch?.[1]) result.letterNumber = numMatch[1].trim();

	const polMatch = rawText.match(/(?:полис[а-я]*(?:\s+дмс)?|страховк[а-я]*)\s*(?:№|номер|#|:)\s*([A-Za-zА-Яа-я0-9\-_/]+)/iu);
	if (polMatch?.[1]) result.policyNumber = polMatch[1].trim();

	const sumMatch = rawText.match(/(?:лимит\s*(?:покрытия)?|сумм[а-я]*|на\s+сумму|покр[ыи]ти[ея])\s*[:—\-]?\s*([0-9\s]+(?:[.,]\d{1,2})?)\s*(?:руб|р|₽|коп)?/iu);
	if (sumMatch?.[1]) {
		const cleanSum = sumMatch[1].replace(/\s+/g, "").replace(",", ".");
		const parsedFloat = Number.parseFloat(cleanSum);
		if (!Number.isNaN(parsedFloat) && parsedFloat > 0) {
			result.limitKopecks = rublesToKopecks(parsedFloat);
		}
	}

	const dateMatches = Array.from(rawText.matchAll(/(\d{4}-\d{2}-\d{2})|(\d{2}\.\d{2}\.\d{4})/g));
	if (dateMatches.length >= 1) {
		const parseDate = (dStr: string) => {
			if (dStr.includes(".")) {
				const [d, m, y] = dStr.split(".");
				return `${y}-${m}-${d}`;
			}
			return dStr;
		};
		const firstMatch = dateMatches[0]?.[0];
		if (firstMatch) {
			const first = parseDate(firstMatch);
			result.issueDate = first;
			result.validFrom = first;
		}
		const secondMatch = dateMatches[1]?.[0];
		if (secondMatch) {
			result.validTo = parseDate(secondMatch);
		}
	}

	const fioMatch = rawText.match(/(?:пациент[а-я]*|застрахованн[а-я]*|фио)\s*[:—\-]?\s*([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){1,2})/iu);
	if (fioMatch?.[1]) result.patientFullName = fioMatch[1].trim();

	const textLower = rawText.toLowerCase();
	if (textLower.includes("согаз")) { result.companyId = "sogaz"; result.companyName = "АО «СОГАЗ»"; }
	else if (textLower.includes("ингосстрах")) { result.companyId = "ingosstrakh"; result.companyName = "СПАО «Ингосстрах»"; }
	else if (textLower.includes("альфа")) { result.companyId = "alfastrakhovanie"; result.companyName = "АО «АльфаСтрахование»"; }
	else if (textLower.includes("ресо")) { result.companyId = "reso_garantiya"; result.companyName = "СПАО «РЕСО-Гарантия»"; }
	else if (textLower.includes("вск")) { result.companyId = "vsk"; result.companyName = "САО «ВСК»"; }
	else if (textLower.includes("согласие")) { result.companyId = "soglasie"; result.companyName = "ООО «СК «Согласие»"; }

	return result;
}

export function createGuaranteeLetterFromDraft(
	draft: ParsedGuaranteeLetterDraft & { id: string; patientBirthDate?: string; defaultFranchisePercent?: number },
): DmsGuaranteeLetter {
	const nowIso = new Date().toISOString().slice(0, 10);
	const limit = draft.limitKopecks ?? 0;
	return {
		id: draft.id,
		letterNumber: draft.letterNumber ?? `ГП-${draft.id.slice(0, 8)}`,
		issueDate: draft.issueDate ?? nowIso,
		validFrom: draft.validFrom ?? nowIso,
		validTo: draft.validTo ?? nowIso,
		companyId: draft.companyId ?? "other",
		companyName: draft.companyName ?? "Страховая компания",
		policyNumber: draft.policyNumber ?? "БЕЗ-ПОЛИСА",
		patientFullName: draft.patientFullName ?? "Пациент Не указан",
		patientBirthDate: draft.patientBirthDate ?? "1990-01-01",
		limitKopecks: limit,
		usedKopecks: 0,
		remainingLimitKopecks: limit,
		defaultFranchisePercent: draft.defaultFranchisePercent ?? 0,
		status: "active" as DmsGuaranteeLetterStatus,
		notes: draft.notes,
	};
}
