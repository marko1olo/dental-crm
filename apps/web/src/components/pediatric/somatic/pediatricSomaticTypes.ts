export interface PediatricSomaticStatus {
	readonly isNormal: boolean;
	readonly summaryRu: string;
	readonly physicalDevelopmentRu: string;
	readonly allergiesRu: string;
	readonly infectionsRu: string;
	readonly chronicDiseasesRu: string;
	readonly notesRu?: string;
}

export const PEDIATRIC_SOMATIC_NORM_SUMMARY = "Ребенок соматически здоров, контактен. Аллергии нет";

export const DEFAULT_PEDIATRIC_SOMATIC_NORM: PediatricSomaticStatus = {
	isNormal: true,
	summaryRu: PEDIATRIC_SOMATIC_NORM_SUMMARY,
	physicalDevelopmentRu: "Физическое развитие соответствует возрасту",
	allergiesRu: "Аллергологический анамнез не отягощен (аллергия на местные анестетики отсутствует)",
	infectionsRu: "Детские инфекции без осложнений, контакт с инфекционными больными в течение 21 дня отрицает",
	chronicDiseasesRu: "Хронические соматические заболевания отсутствуют, соматически здоров",
};

export type LegalRepresentativeRole = "Мать" | "Отец" | "Опекун" | "Усыновитель" | "Родитель";

export interface LegalRepresentativeData {
	readonly role: LegalRepresentativeRole;
	readonly fullName: string;
	readonly phone: string;
	readonly statutoryDocument: string;
	readonly consentSigned: boolean;
}

export const DEFAULT_LEGAL_REPRESENTATIVE: LegalRepresentativeData = {
	role: "Мать",
	fullName: "",
	phone: "",
	statutoryDocument: "ст. 20 323-ФЗ, ст. 64 СК РФ (законный представитель)",
	consentSigned: true,
};

export function formatPediatricRepresentativeText(
	rep: LegalRepresentativeData,
	patientAge?: number | null | undefined,
): string {
	const repRole = rep.role === "Мать" ? "Мама" : rep.role === "Отец" ? "Папа" : rep.role;
	const namePart = rep.fullName.trim();
	const phonePart = rep.phone.trim();
	const details = [namePart, phonePart].filter(Boolean).join(", ");

	if (patientAge !== null && patientAge !== undefined && patientAge >= 15) {
		const consentPart = rep.consentSigned
			? "Согласие на лечение получено (пациент 15+ лет / представитель, ст. 54 323-ФЗ)"
			: "Согласие может быть подписано пациентом самостоятельно (15+ лет, ст. 54 323-ФЗ) или представителем";
		return details
			? `Родитель/представитель: ${repRole} (${details}). ${consentPart}.`
			: `Родитель/представитель: ${repRole}. ${consentPart}.`;
	}

	const consentPart = rep.consentSigned
		? "Согласие на лечение получено"
		: "ВНИМАНИЕ: требуется подписание согласия родителем";

	return details
		? `Родитель: ${repRole} (${details}). ${consentPart}.`
		: `Родитель: ${repRole}. ${consentPart}.`;
}

export interface PediatricSomaticAndLegalRepProps {
	readonly initialSomatic?: Partial<PediatricSomaticStatus> | undefined;
	readonly onSomaticChange?: ((status: PediatricSomaticStatus, formattedText: string) => void) | undefined;
	readonly initialRepresentative?: Partial<LegalRepresentativeData> | undefined;
	readonly defaultRepresentativeFullName?: string | undefined;
	readonly defaultRepresentativePhone?: string | undefined;
	readonly defaultRepresentativeRole?: string | undefined;
	readonly onRepresentativeChange?: ((rep: LegalRepresentativeData, formattedText: string) => void) | undefined;
	readonly patientAge?: number | null | undefined;
	readonly className?: string | undefined;
}
