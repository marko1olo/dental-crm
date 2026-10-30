/**
 * types.ts
 *
 * Типы и канонические перечни бланков первичного и клинического пакета документов.
 *
 * Инварианты Мандата 8e, 8x, 8ap:
 * - Никаких советских шифров ("1051н", "152-ФЗ", "54-ФЗ", "043/у") в видимом интерфейсе!
 * - Автономия врача: софт для врача, а не врач для софта.
 */

import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";
import type React from "react";
import {
	ClipboardCheck,
	FileDown,
	FileText,
	HelpCircle,
	Receipt,
	ShieldCheck,
	Stethoscope,
	UserCheck,
} from "lucide-react";

export type ClinicalPackageTab = "primary" | "clinical" | "tax";

export interface ClinicalItem {
	readonly kind: DocumentKind;
	readonly title: string;
	readonly statutoryRef: string;
	readonly description: string;
	readonly icon: React.ComponentType<{ className?: string; size?: number }>;
}

export interface ClinicalVisitPackageModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient: Patient | null;
	readonly doctorFullName?: string | null | undefined;
	readonly existingDocuments?: readonly GeneratedDocument[] | undefined;
	readonly onCreateDocument?: ((kind: DocumentKind) => void) | undefined;
	readonly onOpenDocument?: ((documentId: string) => void) | undefined;
	readonly onSelectDocumentKind?: ((kind: DocumentKind) => void) | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinicProfileDraft
	readonly clinicProfileDraft?: any | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: payments from cash register
	readonly payments?: readonly any[] | undefined;
	readonly initialTab?: ClinicalPackageTab | undefined;
}

export const PRIMARY_STATUTORY_ITEMS: readonly ClinicalItem[] = [
	{
		kind: "paid_medical_services_contract",
		title: "Договор оказания платных медицинских услуг",
		statutoryRef: "Договор клиники · Стандарт",
		description:
			"Договор с пациентом или плательщиком на стоматологические услуги (допустима печать до приёма с 0 ₽).",
		icon: FileText,
	},
	{
		kind: "informed_consent",
		title: "Информированное добровольное согласие на лечение",
		statutoryRef: "Клинический стандарт согласия",
		description:
			"Согласие на диагностику, осмотр, местную анестезию и терапевтическое лечение.",
		icon: ShieldCheck,
	},
	{
		kind: "personal_data_processing_consent",
		title: "Согласие на обработку персональных данных",
		statutoryRef: "Персональные данные · Конфиденциальность",
		description:
			"Правовое основание для ведения медицинской карты, связи и сервисных уведомлений.",
		icon: UserCheck,
	},
	{
		kind: "patient_intake_questionnaire",
		title: "Анкета первичного пациента о здоровье",
		statutoryRef: "Анкета здоровья · Аллергоанамнез",
		description:
			"Сбор аллергоанамнеза и соматического статуса с возможностью фиксации физиологической нормы в 1 клик.",
		icon: ClipboardCheck,
	},
];

export const CLINICAL_STATUTORY_ITEMS: readonly ClinicalItem[] = [
	{
		kind: "dental_medical_card_043u",
		title: "Медицинская карта приёма",
		statutoryRef: "Амбулаторная карта",
		description:
			"Первичный и повторный учёт состояния зубочелюстной системы, зубная формула и дневник визита.",
		icon: FileText,
	},
	{
		kind: "treatment_plan",
		title: "Протокол приёма и комплексный план лечения",
		statutoryRef: "Клинический протокол",
		description:
			"Фиксация клинического статуса, манипуляций, этапов и стоимости лечения.",
		icon: Stethoscope,
	},
	{
		kind: "prescription_medication_order",
		title: "Рецептурный бланк",
		statutoryRef: "Назначение лекарств",
		description:
			"Назначение антибактериальных, противовоспалительных и обезболивающих препаратов.",
		icon: Receipt,
	},
	{
		kind: "xray_cbct_referral",
		title: "Направление на рентгенодиагностику и КТ",
		statutoryRef: "Лучевая диагностика",
		description:
			"Направление на прицельный снимок, панораму (ОПТГ) или 3D томографию челюстей (КЛКТ).",
		icon: FileDown,
	},
	{
		kind: "post_visit_recommendations",
		title: "Рекомендации пациенту после приёма",
		statutoryRef: "Памятка ухода",
		description:
			"Инструкция по уходу за полостью рта, приёму медикаментов и гигиеническому режиму.",
		icon: HelpCircle,
	},
];
