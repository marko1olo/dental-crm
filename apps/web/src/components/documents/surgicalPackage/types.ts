import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";

export interface SurgicalPackageModalProps {
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

export interface SurgicalItem {
	kind: DocumentKind;
	title: string;
	statutoryRef: string;
	description: string;
	required: boolean;
}

export const SURGICAL_STATUTORY_ITEMS: readonly SurgicalItem[] = [
	{
		kind: "procedure_specific_consent_packet",
		title: "Согласие на хирургическое вмешательство и имплантацию",
		statutoryRef: "Информированное согласие пациента",
		description: "Согласие на операцию удаления зуба, остеотомию, синус-лифтинг, костную пластику или установку имплантатов.",
		required: true,
	},
	{
		kind: "anesthesia_consent_log",
		title: "Протокол и согласие на местную/проводниковую анестезию",
		statutoryRef: "Стандарты безопасности и информированное согласие",
		description: "Фиксация аллергоанамнеза, типа анестетика (артикаин/мепивакаин), дозировки и отсутствия противопоказаний.",
		required: true,
	},
	{
		kind: "dental_medical_card_043u",
		title: "Хирургический протокол операции в карте пациента",
		statutoryRef: "Протокол операции",
		description: "Протокол хода операции, гемостаза, наложения швов, используемых шовных и костных материалов.",
		required: true,
	},
	{
		kind: "xray_cbct_referral",
		title: "Направление на контрольную рентгенодиагностику / КЛКТ 3D",
		statutoryRef: "Стандарты безопасности и прейскурант",
		description: "Контроль позиционирования имплантатов, целостности кортикальной пластинки и дна гайморовой пазухи.",
		required: true,
	},
	{
		kind: "prescription_medication_order",
		title: "Рецептурный бланк (антибиотики и НПВС)",
		statutoryRef: "Назначение лекарств",
		description: "Назначение превентивной антибактериальной, противовоспалительной, обезболивающей и антигистаминной терапии.",
		required: true,
	},
	{
		kind: "post_visit_recommendations",
		title: "Памятка пациента после хирургического вмешательства",
		statutoryRef: "Закон РФ «О защите прав потребителей» № 2300-1",
		description: "Правила послеоперационного режима: холод, ванночки с антисептиком, диета, ограничение физнагрузок, гигиена.",
		required: true,
	},
];
