import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";

export interface PrimaryIntakePackageModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: Patient | null;
	readonly existingDocuments: GeneratedDocument[];
	readonly onCreateDocument: (kind: DocumentKind) => void;
	readonly onOpenDocument: (documentId: string) => void;
	readonly onSelectDocumentKind: (kind: DocumentKind) => void;
	readonly onOpenAutoclaveLog257?: () => void;
	readonly doctorFullName?: string | null | undefined;
	readonly clinicProfileDraft?: any | undefined;
}

export interface StatutoryIntakeItem {
	kind: DocumentKind;
	title: string;
	statutoryRef: string;
	description: string;
	required: boolean;
}

export const INTAKE_STATUTORY_ITEMS: readonly StatutoryIntakeItem[] = [
	{
		kind: "paid_medical_services_contract",
		title: "Договор на медицинские услуги",
		statutoryRef: "Договор на оказание медицинских услуг",
		description: "Обязательный договор с пациентом/заказчиком до начала любых платных медицинских манипуляций.",
		required: true,
	},
	{
		kind: "informed_consent",
		title: "Информированное согласие на осмотр и диагностику (ИДС)",
		statutoryRef: "Согласие на медицинское вмешательство",
		description: "Согласие на первичный осмотр, сбор анамнеза, инструментальное обследование и местную анестезию.",
		required: true,
	},
	{
		kind: "personal_data_processing_consent",
		title: "Согласие на обработку персональных данных",
		statutoryRef: "Конфиденциальность и безопасность персональных данных",
		description: "Правовое основание для ведения электронной медицинской карты и связи с пациентом.",
		required: true,
	},
	{
		kind: "patient_intake_questionnaire",
		title: "Анкета первичного пациента о состоянии здоровья",
		statutoryRef: "Клинический стандарт · Аллергоанамнез и соматика",
		description: "Сбор аллергоанамнеза, соматических патологий, непереносимости анестетиков и постоянных медикаментов.",
		required: true,
	},
];

export const CONSENT_INTERVENTION_TYPES = [
	{ id: "comprehensive", label: "Осмотр и диагностика" },
	{ id: "therapy_endo", label: "Терапия и эндодонтия" },
	{ id: "anesthesia", label: "Местная анестезия" },
	{ id: "surgery", label: "Хирургия и удаление" },
	{ id: "prosthetics", label: "Ортопедия" },
] as const;

export const CONSENT_1051N_INTERVENTION_TYPES = CONSENT_INTERVENTION_TYPES;
