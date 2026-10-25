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

/** Реквизиты клиники для печатных форм хирургического пакета (честные данные профиля клиники). */
export interface SurgicalClinicRequisites {
	readonly clinicName?: string | null;
	readonly legalName?: string | null;
	readonly fullName?: string | null;
	readonly shortName?: string | null;
	readonly inn?: string | null;
	readonly ogrn?: string | null;
	readonly licenseNumber?: string | null;
	readonly address?: string | null;
	readonly actualAddress?: string | null;
	readonly phone?: string | null;
}

/** Реквизиты пациента для печатных форм хирургического пакета. */
export interface SurgicalPatientRequisites {
	readonly fullName?: string | null;
	readonly birthDate?: string | null;
	readonly phone?: string | null;
	readonly snils?: string | null;
	readonly registrationAddress?: string | null;
	readonly address?: string | null;
	readonly passportSeries?: string | null;
	readonly passportNumber?: string | null;
	readonly passportIssuedBy?: string | null;
	readonly passportIssuedDate?: string | null;
	readonly passportDepartmentCode?: string | null;
	readonly passport?: string | null;
	readonly gender?: string | null;
}

/** Параметры операции: зуб, тип вмешательства, анестетик. */
export interface SurgicalOperationDetails {
	readonly toothNumber?: string | number | null;
	readonly operationType?: string | null;
	readonly anestheticName?: string | null;
}

/** Вход печатного движка хирургического пакета. */
export interface SurgicalPackagePrintOptions {
	readonly patient: SurgicalPatientRequisites | null;
	readonly clinic: SurgicalClinicRequisites | null;
	readonly doctorFullName?: string | null;
	readonly operationDetails?: SurgicalOperationDetails | null;
}

/** Подготовленный контекст реквизитов (все строки экранированы и подставлены). */
export interface SurgicalRequisitesContext {
	readonly todayFormatted: string;
	readonly clinicName: string;
	readonly clinicAddress: string;
	readonly clinicInn: string;
	readonly clinicOgrn: string;
	readonly clinicLicense: string;
	readonly clinicPhone: string;
	readonly ptName: string;
	readonly ptBirthDate: string;
	readonly ptPhone: string;
	readonly ptAddress: string;
	readonly ptPassport: string;
	readonly docDoctorName: string;
	readonly opTooth: string;
	readonly opType: string;
	readonly anesName: string;
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
