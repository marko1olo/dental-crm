import type { SignatureStroke } from "../signaturePadMath";

export interface ConsentPdfAOptions {
	readonly clinicName: string;
	readonly clinicAddress?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly patientName: string;
	readonly patientBirthDate?: string | undefined;
	readonly medicalCardNumber?: string | undefined;
	readonly doctorName: string;
	readonly documentTitle: string;
	readonly documentCode?: string | undefined;
	readonly documentText: string;
	readonly signedAtIso?: string | undefined;
	readonly integrityHash: string;
	readonly strokes?: SignatureStroke[] | undefined;
	readonly signatureSvg?: string | undefined;
	readonly verificationMethod?: "tablet_stylus" | "sms_otp" | "paper_physical" | undefined;
}

export function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export function escapePdfString(str: string): string {
	return str.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function transliterateRussianToAscii(str: string): string {
	const map: Record<string, string> = {
		А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ё: "Yo", Ж: "Zh", З: "Z",
		И: "I", Й: "Y", К: "K", Л: "L", М: "M", Н: "N", О: "O", П: "P", Р: "R",
		С: "S", Т: "T", У: "U", Ф: "F", Х: "Kh", Ц: "Ts", Ч: "Ch", Ш: "Sh", Щ: "Sch",
		Ъ: "", Ы: "Y", Ь: "", Э: "E", Ю: "Yu", Я: "Ya",
		а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z",
		и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
		с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", sh: "sh", щ: "sch",
		ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
	};
	return str.split("").map((c) => map[c] ?? c).join("");
}
