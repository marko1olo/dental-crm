import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";

export interface ClinicalItem {
	kind: DocumentKind;
	title: string;
	statutoryRef: string;
	description: string;
}

export interface ClinicalVisitPackageModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: Patient | null;
	readonly doctorFullName?: string | null;
	readonly existingDocuments: GeneratedDocument[];
	readonly onCreateDocument: (kind: DocumentKind) => void;
	readonly onOpenDocument: (documentId: string) => void;
	readonly onSelectDocumentKind: (kind: DocumentKind) => void;
	// biome-ignore lint/suspicious/noExplicitAny: clinic profile settings draft
	readonly clinicProfileDraft?: any;
}

export const CLINICAL_STATUTORY_ITEMS: readonly ClinicalItem[] = [
	{
		kind: "dental_medical_card_043u",
		title: "Медицинская карта стоматологического пациента",
		statutoryRef: "Амбулаторная карта",
		description: "Первичный и повторный учёт состояния зубочелюстной системы, зубная формула и анамнез.",
	},
	{
		kind: "treatment_plan",
		title: "Протокол приёма и комплексный план лечения",
		statutoryRef: "Клинический протокол",
		description: "Фиксация статуса, протокола манипуляций, этапов и стоимости лечения.",
	},
	{
		kind: "prescription_medication_order",
		title: "Рецептурный бланк",
		statutoryRef: "Назначение лекарств",
		description: "Назначение антибактериальных, противовоспалительных, обезболивающих препаратов.",
	},
	{
		kind: "xray_cbct_referral",
		title: "Направление на рентгенографию / КЛКТ / ОПТГ",
		statutoryRef: "Стандарты безопасности и прейскурант",
		description: "Направление на лучевую диагностику (3D томография, ортопантомограмма, прицельный снимок) с обоснованием цели.",
	},
	{
		kind: "post_visit_recommendations",
		title: "Памятка и рекомендации пациенту после приёма",
		statutoryRef: "Закон РФ «О защите прав потребителей» № 2300-1",
		description: "Инструкция по уходу за полостью рта, приёму назначенных медикаментов, ограничениям в питании и тревожным симптомам.",
	},
];
