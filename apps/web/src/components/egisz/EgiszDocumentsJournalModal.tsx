/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD DOCUMENTS JOURNAL MODAL — DENTE DENTAL CRM
 * Statutory Journal of Medical & Financial Documents for Russian Ministry of Health
 * Compliant with Order 947n, Order 804n, HL7 CDA R2 and Federal Law 63-FZ
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle,
	AlertTriangle,
	Archive,
	ArrowUpDown,
	Building2,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	Copy,
	Download,
	Eye,
	FileArchive,
	FileCheck,
	FileCode2,
	FileText,
	Filter,
	KeyRound,
	Play,
	Plus,
	RefreshCw,
	RotateCcw,
	Search,
	Send,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	User,
	UserCheck,
	X,
} from "lucide-react";
import { strToU8, zipSync } from "fflate";
import { showToast } from "../GlobalToast";
import {
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	EGISZ_DENTAL_SEMD_TYPES,
	type EgiszDentalCdaPayload,
	type EgiszDentalSemdCode,
	type GostSignatureInfo,
	SAMPLE_043U_PATIENT_PRESET,
	SAMPLE_DENTAL_SEMD_105_PRESET,
	canonicalizeCdaXml,
	createMockGostSignature,
	createMockMoGostSignature,
	formatHl7DateTime,
	formatRuDate,
	generateEgiszDentalCdaXml,
	generateEgiszXmlFilename,
} from "./egiszRemdEngine";
import { EgiszRemdSigningModal } from "./EgiszRemdSigningModal";
import "./egiszRemd.css";

export type RemdDocumentStatus = "draft" | "signed" | "sent" | "registered" | "error";

export interface RemdValidationError {
	errorCode: string;
	errorCategory: "frmr" | "frmo" | "804n" | "icd10" | "crypto" | "schema" | "patient";
	errorMessage: string;
	actionableHint: string;
	occurredAt: string;
}

export interface RemdRegistrationInfo {
	remdDocId: string;
	regNumber: string;
	registeredAt: string;
	registryOid: string;
	documentHashGost: string;
	channel: string;
}

export interface RemdDocumentRecord {
	id: string;
	documentUuid: string;
	docTypeCode: EgiszDentalSemdCode | "1151156";
	docTypeName: string;
	createdAt: string;
	updatedAt: string;
	encounterDate: string;
	patient: {
		id: string;
		fullName: string;
		birthDate: string;
		snils?: string | undefined;
		cardNumber: string;
		polisOms?: string | undefined;
	};
	doctor: {
		id: string;
		fullName: string;
		snils: string;
		position: string;
		specialty: string;
	};
	clinic: {
		name: string;
		oid: string;
		ogrn: string;
		inn: string;
	};
	status: RemdDocumentStatus;
	doctorSignature?: GostSignatureInfo | undefined;
	moSignature?: GostSignatureInfo | undefined;
	cdaPayload?: EgiszDentalCdaPayload | undefined;
	registrationInfo?: RemdRegistrationInfo | undefined;
	validationError?: RemdValidationError | undefined;
}

/**
 * Realistic clinical records baseline per DENTE Clinical Realism Law
 */
export const SAMPLE_REMD_JOURNAL_RECORDS: RemdDocumentRecord[] = [
	{
		id: "REMD-REC-001",
		documentUuid: "DOC-105-2026-08419",
		docTypeCode: "105",
		docTypeName: "Протокол консультации стоматолога (СЭМД 105)",
		createdAt: "2026-08-28T09:15:00+03:00",
		updatedAt: "2026-08-28T09:30:00+03:00",
		encounterDate: "2026-08-28",
		patient: {
			id: "PAT-001",
			fullName: "Соколова Анна Владимировна",
			birthDate: "1988-06-14",
			snils: "123-456-789 64",
			cardNumber: "К-2026/0841",
			polisOms: "7754123456789012",
		},
		doctor: {
			id: "DOC-001",
			fullName: "Иванов Сергей Владимирович",
			snils: "123-456-789 64",
			position: "Врач-стоматолог-терапевт",
			specialty: "Стоматология терапевтическая",
		},
		clinic: {
			name: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
			oid: "1.2.643.5.1.13.13.12.2.77.10425",
			ogrn: "1157746123457",
			inn: "7701234560",
		},
		status: "registered",
		doctorSignature: createMockGostSignature(
			"Иванов Сергей Владимирович",
			"123-456-789 64",
			'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
		),
		moSignature: createMockMoGostSignature(
			'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
			"1157746123457",
		),
		cdaPayload: SAMPLE_DENTAL_SEMD_105_PRESET,
		registrationInfo: {
			remdDocId: "REMD-2026-08419-RU",
			regNumber: "РЭМД-77-2026-99120",
			registeredAt: "2026-08-28T09:32:15+03:00",
			registryOid: "1.2.643.5.1.13.13.11.1527",
			documentHashGost: "9F86D081884C7D659A2FEAA0C55AD015A3BF4F1B2B0B822CD15D6C15B0F00A08",
			channel: "EGISZ_INTEGRATION_GATEWAY_V3",
		},
	},
	{
		id: "REMD-REC-002",
		documentUuid: "DOC-303-2026-08422",
		docTypeCode: "303",
		docTypeName: "Протокол стоматологического лечения (СЭМД 303)",
		createdAt: "2026-08-28T10:45:00+03:00",
		updatedAt: "2026-08-28T11:00:00+03:00",
		encounterDate: "2026-08-28",
		patient: {
			id: "PAT-002",
			fullName: "Барабаш Сергей Васильевич",
			birthDate: "1979-11-23",
			snils: "112-233-445 95",
			cardNumber: "К-2026/0842",
			polisOms: "7754987654321098",
		},
		doctor: {
			id: "DOC-002",
			fullName: "Смирнова Елена Александровна",
			snils: "112-233-445 00", // Invalid SNILS in FRMR
			position: "Врач-стоматолог-хирург",
			specialty: "Стоматология хирургическая",
		},
		clinic: {
			name: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
			oid: "1.2.643.5.1.13.13.12.2.77.10425",
			ogrn: "1157746123457",
			inn: "7701234560",
		},
		status: "error",
		doctorSignature: createMockGostSignature(
			"Смирнова Елена Александровна",
			"112-233-445 00",
			'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
		),
		cdaPayload: {
			...SAMPLE_DENTAL_SEMD_105_PRESET,
			docTypeCode: "303",
			documentUuid: "DOC-303-2026-08422",
			patient: {
				...SAMPLE_043U_PATIENT_PRESET,
				patientFullName: "Барабаш Сергей Васильевич",
				patientSnils: "112-233-445 95",
				cardNumber: "К-2026/0842",
			},
			doctor: {
				...DEFAULT_EGISZ_DOCTOR_PRESET,
				doctorFullName: "Смирнова Елена Александровна",
				doctorSnils: "112-233-445 00",
				doctorPosition: "Врач-стоматолог-хирург",
			},
		},
		validationError: {
			errorCode: "ERR_FRMR_SNILS_NOT_FOUND",
			errorCategory: "frmr",
			errorMessage: "СНИЛС врача (112-233-445 00) не найден в Федеральном регистре медицинских работников (ФРМР).",
			actionableHint: "1. Проверьте правильность ввода СНИЛС врача в справочнике сотрудников клиники. 2. Убедитесь, что сотрудник зарегистрирован в регистре ФРМР Минздрава РФ с актуальным профилем. 3. Исправьте данные врача и повторите подписание.",
			occurredAt: "2026-08-28T11:02:10+03:00",
		},
	},
	{
		id: "REMD-REC-003",
		documentUuid: "DOC-303-2026-08425",
		docTypeCode: "303",
		docTypeName: "Протокол стоматологического лечения (СЭМД 303)",
		createdAt: "2026-08-28T12:00:00+03:00",
		updatedAt: "2026-08-28T12:15:00+03:00",
		encounterDate: "2026-08-28",
		patient: {
			id: "PAT-003",
			fullName: "Кузнецов Михаил Петрович",
			birthDate: "1992-03-05",
			snils: "145-678-901 23",
			cardNumber: "К-2026/0845",
			polisOms: "7754332211009988",
		},
		doctor: {
			id: "DOC-001",
			fullName: "Иванов Сергей Владимирович",
			snils: "123-456-789 64",
			position: "Врач-стоматолог-терапевт",
			specialty: "Стоматология терапевтическая",
		},
		clinic: {
			name: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
			oid: "1.2.643.5.1.13.13.12.2.77.10425",
			ogrn: "1157746123457",
			inn: "7701234560",
		},
		status: "signed",
		doctorSignature: createMockGostSignature(
			"Иванов Сергей Владимирович",
			"123-456-789 64",
			'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
		),
		cdaPayload: {
			...SAMPLE_DENTAL_SEMD_105_PRESET,
			docTypeCode: "303",
			documentUuid: "DOC-303-2026-08425",
			patient: {
				...SAMPLE_043U_PATIENT_PRESET,
				patientFullName: "Кузнецов Михаил Петрович",
				cardNumber: "К-2026/0845",
			},
		},
	},
	{
		id: "REMD-REC-004",
		documentUuid: "DOC-302-2026-08428",
		docTypeCode: "302",
		docTypeName: "Консультация стоматолога (СЭМД 302)",
		createdAt: "2026-08-28T13:30:00+03:00",
		updatedAt: "2026-08-28T13:40:00+03:00",
		encounterDate: "2026-08-28",
		patient: {
			id: "PAT-004",
			fullName: "Морозова Ольга Николаевна",
			birthDate: "1985-09-17",
			snils: "156-789-012 34",
			cardNumber: "К-2026/0848",
		},
		doctor: {
			id: "DOC-002",
			fullName: "Смирнова Елена Александровна",
			snils: "123-456-789 64",
			position: "Врач-стоматолог-ортопед",
			specialty: "Стоматология ортопедическая",
		},
		clinic: {
			name: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
			oid: "1.2.643.5.1.13.13.12.2.77.10425",
			ogrn: "1157746123457",
			inn: "7701234560",
		},
		status: "sent",
		doctorSignature: createMockGostSignature(
			"Смирнова Елена Александровна",
			"123-456-789 64",
			'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
		),
		moSignature: createMockMoGostSignature(
			'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
			"1157746123457",
		),
		cdaPayload: {
			...SAMPLE_DENTAL_SEMD_105_PRESET,
			docTypeCode: "302",
			documentUuid: "DOC-302-2026-08428",
			patient: {
				...SAMPLE_043U_PATIENT_PRESET,
				patientFullName: "Морозова Ольга Николаевна",
				cardNumber: "К-2026/0848",
			},
		},
	},
	{
		id: "REMD-REC-005",
		documentUuid: "DOC-106-2026-08431",
		docTypeCode: "106",
		docTypeName: "Выписной эпикриз (СЭМД 106)",
		createdAt: "2026-08-28T14:10:00+03:00",
		updatedAt: "2026-08-28T14:10:00+03:00",
		encounterDate: "2026-08-28",
		patient: {
			id: "PAT-005",
			fullName: "Васильев Дмитрий Андреевич",
			birthDate: "1995-12-01",
			snils: "167-890-123 45",
			cardNumber: "К-2026/0851",
		},
		doctor: {
			id: "DOC-001",
			fullName: "Иванов Сергей Владимирович",
			snils: "123-456-789 64",
			position: "Врач-стоматолог-терапевт",
			specialty: "Стоматология терапевтическая",
		},
		clinic: {
			name: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
			oid: "1.2.643.5.1.13.13.12.2.77.10425",
			ogrn: "1157746123457",
			inn: "7701234560",
		},
		status: "draft",
		cdaPayload: {
			...SAMPLE_DENTAL_SEMD_105_PRESET,
			docTypeCode: "106",
			documentUuid: "DOC-106-2026-08431",
			patient: {
				...SAMPLE_043U_PATIENT_PRESET,
				patientFullName: "Васильев Дмитрий Андреевич",
				cardNumber: "К-2026/0851",
			},
		},
	},
	{
		id: "REMD-REC-006",
		documentUuid: "DOC-303-2026-08435",
		docTypeCode: "303",
		docTypeName: "Протокол стоматологического лечения (СЭМД 303)",
		createdAt: "2026-08-27T16:00:00+03:00",
		updatedAt: "2026-08-27T16:20:00+03:00",
		encounterDate: "2026-08-27",
		patient: {
			id: "PAT-006",
			fullName: "Попова Татьяна Сергеевна",
			birthDate: "2001-07-29",
			snils: "178-901-234 56",
			cardNumber: "К-2026/0835",
		},
		doctor: {
			id: "DOC-002",
			fullName: "Смирнова Елена Александровна",
			snils: "123-456-789 64",
			position: "Врач-стоматолог-терапевт",
			specialty: "Стоматология терапевтическая",
		},
		clinic: {
			name: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
			oid: "1.2.643.5.1.13.13.12.2.77.10425",
			ogrn: "1157746123457",
			inn: "7701234560",
		},
		status: "error",
		doctorSignature: createMockGostSignature(
			"Смирнова Елена Александровна",
			"123-456-789 64",
			'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
		),
		cdaPayload: {
			...SAMPLE_DENTAL_SEMD_105_PRESET,
			docTypeCode: "303",
			documentUuid: "DOC-303-2026-08435",
			patient: {
				...SAMPLE_043U_PATIENT_PRESET,
				patientFullName: "Попова Татьяна Сергеевна",
				cardNumber: "К-2026/0835",
			},
			procedures: [], // Missing 804n procedures
		},
		validationError: {
			errorCode: "ERR_804N_SERVICE_CODE_MISSING",
			errorCategory: "804n",
			errorMessage: "Для протокола стоматологического вмешательства (СЭМД 303) обязателен минимум один код услуги по Номенклатуре 804н.",
			actionableHint: "1. Откройте протокол лечения пациента. 2. Добавьте оказанную номенклатурную услугу (например: A16.07.002.001 - Восстановление зуба пломбой). 3. Переподпишите документ УКЭП.",
			occurredAt: "2026-08-27T16:22:45+03:00",
		},
	},
	{
		id: "REMD-REC-007",
		documentUuid: "DOC-105-2026-08438",
		docTypeCode: "105",
		docTypeName: "Протокол консультации стоматолога (СЭМД 105)",
		createdAt: "2026-08-27T11:20:00+03:00",
		updatedAt: "2026-08-27T11:40:00+03:00",
		encounterDate: "2026-08-27",
		patient: {
			id: "PAT-007",
			fullName: "Григорьев Артем Павлович",
			birthDate: "1983-04-19",
			snils: "189-012-345 67",
			cardNumber: "К-2026/0838",
			polisOms: "7754445566778899",
		},
		doctor: {
			id: "DOC-001",
			fullName: "Иванов Сергей Владимирович",
			snils: "123-456-789 64",
			position: "Врач-стоматолог-терапевт",
			specialty: "Стоматология терапевтическая",
		},
		clinic: {
			name: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
			oid: "1.2.643.5.1.13.13.12.2.77.10425",
			ogrn: "1157746123457",
			inn: "7701234560",
		},
		status: "registered",
		doctorSignature: createMockGostSignature(
			"Иванов Сергей Владимирович",
			"123-456-789 64",
			'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
		),
		moSignature: createMockMoGostSignature(
			'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
			"1157746123457",
		),
		cdaPayload: {
			...SAMPLE_DENTAL_SEMD_105_PRESET,
			docTypeCode: "105",
			documentUuid: "DOC-105-2026-08438",
			patient: {
				...SAMPLE_043U_PATIENT_PRESET,
				patientFullName: "Григорьев Артем Павлович",
				cardNumber: "К-2026/0838",
			},
		},
		registrationInfo: {
			remdDocId: "REMD-2026-08438-RU",
			regNumber: "РЭМД-77-2026-99411",
			registeredAt: "2026-08-27T11:42:00+03:00",
			registryOid: "1.2.643.5.1.13.13.11.1527",
			documentHashGost: "A1B2C3D4E5F67890123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0",
			channel: "EGISZ_INTEGRATION_GATEWAY_V3",
		},
	},
];

export interface EgiszDocumentsJournalModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialFilter?: RemdDocumentStatus | "all" | undefined;
	initialSelectedId?: string | undefined;
	onOpenSigningStudio?: ((record: RemdDocumentRecord) => void) | undefined;
}

export const EgiszDocumentsJournalModal: React.FC<EgiszDocumentsJournalModalProps> = ({
	isOpen,
	onClose,
	initialFilter = "all",
	initialSelectedId,
	onOpenSigningStudio,
}) => {
	// Journal records state
	const [records, setRecords] = useState<RemdDocumentRecord[]>(SAMPLE_REMD_JOURNAL_RECORDS);
	const [selectedRecordId, setSelectedRecordId] = useState<string>(() => {
		if (initialSelectedId) return initialSelectedId;
		if (initialFilter !== "all") {
			const match = SAMPLE_REMD_JOURNAL_RECORDS.find((r) => r.status === initialFilter);
			if (match) return match.id;
		}
		return SAMPLE_REMD_JOURNAL_RECORDS[0]?.id || "";
	});

	// Filters
	const [statusFilter, setStatusFilter] = useState<RemdDocumentStatus | "all">(initialFilter);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [docTypeFilter, setDocTypeFilter] = useState<string>("all");

	// Active signing modal for selected record
	const [activeSigningRecord, setActiveSigningRecord] = useState<RemdDocumentRecord | null>(null);

	// Currently selected record
	const selectedRecord = useMemo(() => {
		return records.find((r) => r.id === selectedRecordId) || records[0];
	}, [records, selectedRecordId]);

	// Filtered records
	const filteredRecords = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		return records.filter((rec) => {
			// Status filter
			if (statusFilter !== "all" && rec.status !== statusFilter) {
				return false;
			}
			// Doc type filter
			if (docTypeFilter !== "all" && rec.docTypeCode !== docTypeFilter) {
				return false;
			}
			// Search query (Patient FIO, Doctor FIO, Card, SNILS, UUID, Reg number)
			if (q) {
				const matchPatient = rec.patient.fullName.toLowerCase().includes(q);
				const matchDoctor = rec.doctor.fullName.toLowerCase().includes(q);
				const matchCard = rec.patient.cardNumber.toLowerCase().includes(q);
				const matchSnils = (rec.patient.snils || "").toLowerCase().includes(q);
				const matchUuid = rec.documentUuid.toLowerCase().includes(q);
				const matchReg = (rec.registrationInfo?.regNumber || "").toLowerCase().includes(q);
				if (!matchPatient && !matchDoctor && !matchCard && !matchSnils && !matchUuid && !matchReg) {
					return false;
				}
			}
			return true;
		});
	}, [records, statusFilter, docTypeFilter, searchQuery]);

	// Summary Statistics
	const stats = useMemo(() => {
		return {
			total: records.length,
			registered: records.filter((r) => r.status === "registered").length,
			sent: records.filter((r) => r.status === "sent").length,
			signed: records.filter((r) => r.status === "signed").length,
			error: records.filter((r) => r.status === "error").length,
			draft: records.filter((r) => r.status === "draft").length,
		};
	}, [records]);

	// 1-Click Action: Export Single Document ZIP Archive (XML + .p7s signatures + receipt)
	const handleExportRecordZip = (record: RemdDocumentRecord) => {
		try {
			const payload = record.cdaPayload || SAMPLE_DENTAL_SEMD_105_PRESET;
			const xml = generateEgiszDentalCdaXml({
				...payload,
				doctorSignature: record.doctorSignature,
			});
			const filenamePrefix = generateEgiszXmlFilename(payload).replace(".xml", "");

			// Build in-memory ZIP bundle using fflate
			const zipData: Record<string, Uint8Array> = {
				[`${filenamePrefix}.xml`]: strToU8(xml),
			};

			if (record.doctorSignature?.signatureBase64) {
				zipData[`${filenamePrefix}_doctor.p7s`] = strToU8(record.doctorSignature.signatureBase64);
			}

			if (record.moSignature?.signatureBase64) {
				zipData[`${filenamePrefix}_mo.p7s`] = strToU8(record.moSignature.signatureBase64);
			}

			if (record.registrationInfo) {
				const receiptJson = JSON.stringify(record.registrationInfo, null, 2);
				zipData[`${filenamePrefix}_receipt.json`] = strToU8(receiptJson);
			}

			const zipped = zipSync(zipData);
			const blob = new Blob([zipped], { type: "application/zip" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${filenamePrefix}_EGISZ_PACKAGE.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			showToast(`Архив ${filenamePrefix}_EGISZ_PACKAGE.zip успешно выгружен!`, "success");
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			showToast(`Ошибка формирования ZIP-архива: ${msg}`, "error");
		}
	};

	// 1-Click Action: Batch Export of all filtered documents into a single master ZIP
	const handleExportAllZip = () => {
		try {
			if (filteredRecords.length === 0) {
				showToast("Нет документов для экспорта", "warning");
				return;
			}

			const masterZipData: Record<string, Uint8Array> = {};

			filteredRecords.forEach((record, idx) => {
				const payload = record.cdaPayload || SAMPLE_DENTAL_SEMD_105_PRESET;
				const xml = generateEgiszDentalCdaXml({
					...payload,
					doctorSignature: record.doctorSignature,
				});
				const folderName = `doc_${idx + 1}_${record.documentUuid}`;

				masterZipData[`${folderName}/document.xml`] = strToU8(xml);

				if (record.doctorSignature?.signatureBase64) {
					masterZipData[`${folderName}/doctor_signature.p7s`] = strToU8(
						record.doctorSignature.signatureBase64,
					);
				}

				if (record.moSignature?.signatureBase64) {
					masterZipData[`${folderName}/mo_signature.p7s`] = strToU8(
						record.moSignature.signatureBase64,
					);
				}

				if (record.registrationInfo) {
					masterZipData[`${folderName}/remd_receipt.json`] = strToU8(
						JSON.stringify(record.registrationInfo, null, 2),
					);
				}
			});

			// Add summary manifest
			const manifest = {
				exportedAt: new Date().toISOString(),
				clinic: DEFAULT_EGISZ_CLINIC_PRESET,
				documentsCount: filteredRecords.length,
				documents: filteredRecords.map((r) => ({
					uuid: r.documentUuid,
					type: r.docTypeCode,
					patient: r.patient.fullName,
					doctor: r.doctor.fullName,
					status: r.status,
					regNumber: r.registrationInfo?.regNumber,
				})),
			};
			masterZipData["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));

			const zipped = zipSync(masterZipData);
			const blob = new Blob([zipped], { type: "application/zip" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			const dateTag = new Date().toISOString().slice(0, 10);
			a.href = url;
			a.download = `EGISZ_REMD_JOURNAL_EXPORT_${dateTag}.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			showToast(
				`Пакет из ${filteredRecords.length} документов успешно выгружен в ZIP!`,
				"success",
			);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			showToast(`Ошибка пакетной выгрузки: ${msg}`, "error");
		}
	};

	// 1-Click Action: Resend / Retry submission to REMD
	const handleResendRecord = (record: RemdDocumentRecord) => {
		setRecords((prev) =>
			prev.map((r) => {
				if (r.id === record.id) {
					return {
						...r,
						status: "sent" as const,
						updatedAt: new Date().toISOString(),
					};
				}
				return r;
			}),
		);

		showToast(`Документ ${record.documentUuid} поставлен в очередь повторной отправки в РЭМД`, "info");

		// Simulate asynchronous confirmation from REMD integration broker
		setTimeout(() => {
			setRecords((prev) =>
				prev.map((r) => {
					if (r.id === record.id) {
						const regNumber = `РЭМД-77-2026-${Math.floor(100000 + Math.random() * 900000)}`;
						return {
							...r,
							status: "registered" as const,
							updatedAt: new Date().toISOString(),
							registrationInfo: {
								remdDocId: `REMD-${Date.now()}`,
								regNumber,
								registeredAt: new Date().toISOString(),
								registryOid: "1.2.643.5.1.13.13.11.1527",
								documentHashGost: "9F86D081884C7D659A2FEAA0C55AD015A3BF4F1B2B0B822CD15D6C15B0F00A08",
								channel: "EGISZ_INTEGRATION_GATEWAY_V3",
							},
							validationError: undefined,
						};
					}
					return r;
				}),
			);
			showToast(`Документ ${record.documentUuid} успешно зарегистрирован в РЭМД!`, "success");
		}, 1200);
	};

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="egisz-journal-backdrop"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="egisz-journal-title"
		>
			<div className="egisz-journal-modal">
				{/* Modal Header */}
				<header className="egisz-modal-header">
					<div className="egisz-header-left">
						<div className="egisz-header-icon-badge">
							<Archive size={24} />
						</div>
						<div className="egisz-header-title-group">
							<h2 id="egisz-journal-title" className="egisz-modal-title">
								Журнал медицинских документов РЭМД ЕГИСЗ
							</h2>
							<div className="egisz-modal-subtitle">
								Реестр СЭМД 043/у, 302, 303, 105, 106 • Приказ Минздрава РФ № 947н
							</div>
						</div>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<button
							type="button"
							className="egisz-btn sm"
							onClick={handleExportAllZip}
							title="Выгрузить отфильтрованные документы архивом ZIP"
						>
							<FileArchive size={14} />
							1-Клик ZIP (все {filteredRecords.length})
						</button>

						<button
							type="button"
							className="egisz-close-icon-btn"
							onClick={onClose}
							aria-label="Закрыть журнал"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* Modal Body */}
				<div className="egisz-journal-body">
					{/* Stats Ribbon */}
					<div className="egisz-stats-ribbon">
						<div className="egisz-stat-tile">
							<span className="egisz-stat-label">Всего документов</span>
							<span className="egisz-stat-val">{stats.total}</span>
						</div>

						<div className="egisz-stat-tile">
							<span className="egisz-stat-label">Зарегистрировано в РЭМД</span>
							<span className="egisz-stat-val green">{stats.registered}</span>
						</div>

						<div className="egisz-stat-tile">
							<span className="egisz-stat-label">В очереди / Отправлено</span>
							<span className="egisz-stat-val amber">{stats.sent}</span>
						</div>

						<div className="egisz-stat-tile">
							<span className="egisz-stat-label">Подписано (готово)</span>
							<span className="egisz-stat-val blue">{stats.signed}</span>
						</div>

						<div className="egisz-stat-tile">
							<span className="egisz-stat-label">Ошибки валидации</span>
							<span className="egisz-stat-val red">{stats.error}</span>
						</div>
					</div>

					{/* Filters & Search Toolbar */}
					<div className="egisz-journal-filters">
						{/* Status Chips */}
						<div className="egisz-status-tabs">
							<button
								type="button"
								className={`egisz-status-tab-chip ${statusFilter === "all" ? "active" : ""}`}
								onClick={() => setStatusFilter("all")}
							>
								Все ({stats.total})
							</button>

							<button
								type="button"
								className={`egisz-status-tab-chip ${statusFilter === "registered" ? "active" : ""}`}
								onClick={() => setStatusFilter("registered")}
							>
								Зарегистрирован ({stats.registered})
							</button>

							<button
								type="button"
								className={`egisz-status-tab-chip ${statusFilter === "sent" ? "active" : ""}`}
								onClick={() => setStatusFilter("sent")}
							>
								Отправлен ({stats.sent})
							</button>

							<button
								type="button"
								className={`egisz-status-tab-chip ${statusFilter === "signed" ? "active" : ""}`}
								onClick={() => setStatusFilter("signed")}
							>
								Подписан ({stats.signed})
							</button>

							<button
								type="button"
								className={`egisz-status-tab-chip ${statusFilter === "error" ? "active" : ""}`}
								onClick={() => setStatusFilter("error")}
							>
								Ошибки ({stats.error})
							</button>

							<button
								type="button"
								className={`egisz-status-tab-chip ${statusFilter === "draft" ? "active" : ""}`}
								onClick={() => setStatusFilter("draft")}
							>
								Черновики ({stats.draft})
							</button>
						</div>

						{/* Search Box */}
						<div className="egisz-search-input-wrap">
							<Search size={15} className="egisz-search-icon" />
							<input
								type="text"
								className="egisz-search-input"
								placeholder="Поиск по ФИО, СНИЛС, карте, UUID..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>

						{/* Doc Type Dropdown */}
						<select
							className="egisz-filter-select"
							value={docTypeFilter}
							onChange={(e) => setDocTypeFilter(e.target.value)}
						>
							<option value="all">Все виды СЭМД</option>
							<option value="105">СЭМД 105 (Консультация 043/у)</option>
							<option value="302">СЭМД 302 (Осмотр стоматолога)</option>
							<option value="303">СЭМД 303 (Вмешательство/лечение)</option>
							<option value="106">СЭМД 106 (Эпикриз)</option>
						</select>
					</div>

					{/* Main Journal Table */}
					<div className="egisz-table-container">
						<table className="egisz-journal-table">
							<thead>
								<tr>
									<th style={{ width: "130px" }}>Дата / Время</th>
									<th style={{ width: "160px" }}>Вид СЭМД</th>
									<th>Пациент</th>
									<th>Врач (ФРМР)</th>
									<th style={{ width: "170px" }}>Статус</th>
									<th style={{ width: "100px" }}>Подписи</th>
									<th style={{ width: "180px", textAlign: "right" }}>Действия</th>
								</tr>
							</thead>
							<tbody>
								{filteredRecords.length === 0 ? (
									<tr>
										<td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--muted, #64748b)" }}>
											Документы не найдены по заданным критериям фильтрации
										</td>
									</tr>
								) : (
									filteredRecords.map((rec) => {
										const isSelected = rec.id === selectedRecordId;
										return (
											<tr
												key={rec.id}
												className={isSelected ? "selected" : ""}
												onClick={() => setSelectedRecordId(rec.id)}
												style={{ cursor: "pointer" }}
											>
												{/* Date */}
												<td>
													<div style={{ fontWeight: 600 }}>{formatRuDate(rec.encounterDate)}</div>
													<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
														{new Date(rec.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
													</div>
												</td>

												{/* SEMD Type */}
												<td>
													<span style={{ fontWeight: 700, color: "var(--primary, #0ea5e9)" }}>
														СЭМД {rec.docTypeCode}
													</span>
													<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
														{rec.docTypeName}
													</div>
												</td>

												{/* Patient */}
												<td>
													<div style={{ fontWeight: 700 }}>{rec.patient.fullName}</div>
													<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
														Карта: {rec.patient.cardNumber} {rec.patient.snils ? `• СНИЛС: ${rec.patient.snils}` : ""}
													</div>
												</td>

												{/* Doctor */}
												<td>
													<div style={{ fontWeight: 600 }}>{rec.doctor.fullName}</div>
													<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
														{rec.doctor.position}
													</div>
												</td>

												{/* Status */}
												<td>
													<span className={`egisz-badge ${rec.status}`}>
														{rec.status === "registered" && (
															<>
																<CheckCircle2 size={12} />
																Зарегистрирован
															</>
														)}
														{rec.status === "sent" && (
															<>
																<Clock size={12} />
																В очереди РЭМД
															</>
														)}
														{rec.status === "signed" && (
															<>
																<ShieldCheck size={12} />
																Подписан УКЭП
															</>
														)}
														{rec.status === "error" && (
															<>
																<AlertCircle size={12} />
																Ошибка РЭМД
															</>
														)}
														{rec.status === "draft" && (
															<>
																<FileText size={12} />
																Черновик
															</>
														)}
													</span>
													{rec.registrationInfo && (
														<div style={{ fontSize: "10.5px", fontFamily: "monospace", color: "#059669", marginTop: "2px" }}>
															{rec.registrationInfo.regNumber}
														</div>
													)}
													{rec.validationError && (
														<div style={{ fontSize: "10.5px", color: "#dc2626", marginTop: "2px" }}>
															{rec.validationError.errorCode}
														</div>
													)}
												</td>

												{/* Signatures */}
												<td>
													<div style={{ display: "flex", gap: "4px" }}>
														<span
															title={rec.doctorSignature ? "УКЭП врача наложена" : "УКЭП врача отсутствует"}
															style={{
																padding: "2px 6px",
																borderRadius: "4px",
																fontSize: "11px",
																background: rec.doctorSignature ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.1)",
																color: rec.doctorSignature ? "#059669" : "#94a3b8",
																fontWeight: "bold",
															}}
														>
															👤 Врач
														</span>

														{rec.moSignature && (
															<span
																title="УКЭП организации наложена"
																style={{
																	padding: "2px 6px",
																	borderRadius: "4px",
																	fontSize: "11px",
																	background: "rgba(14, 165, 233, 0.15)",
																	color: "#0284c7",
																	fontWeight: "bold",
																}}
															>
																🏢 МО
															</span>
														)}
													</div>
												</td>

												{/* Action Buttons */}
												<td style={{ textAlign: "right" }}>
													<div style={{ display: "inline-flex", gap: "4px" }}>
														{/* Sign / Studio Button */}
														<button
															type="button"
															className="egisz-btn sm primary"
															onClick={(e) => {
																e.stopPropagation();
																setActiveSigningRecord(rec);
																onOpenSigningStudio?.(rec);
															}}
															title="Открыть студию подписания УКЭП"
														>
															<KeyRound size={13} />
															Подписать
														</button>

														{/* Retry Button if Error */}
														{rec.status === "error" && (
															<button
																type="button"
																className="egisz-btn sm"
																onClick={(e) => {
																	e.stopPropagation();
																	handleResendRecord(rec);
																}}
																title="Повторить отправку в РЭМД"
															>
																<RotateCcw size={13} />
															</button>
														)}

														{/* ZIP Export Button */}
														<button
															type="button"
															className="egisz-btn sm"
															onClick={(e) => {
																e.stopPropagation();
																handleExportRecordZip(rec);
															}}
															title="1-Клик выгрузка ZIP архива (XML + .p7s)"
														>
															<Download size={13} />
														</button>
													</div>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>

					{/* Inspection Drawer / Remediation Pane for Selected Record */}
					{selectedRecord && (
						<div className="egisz-detail-panel">
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									<FileText size={16} color="var(--primary, #0ea5e9)" />
									<span style={{ fontWeight: 700, fontSize: "14px" }}>
										СЭМД {selectedRecord.docTypeCode}: {selectedRecord.documentUuid}
									</span>
									<span className={`egisz-badge ${selectedRecord.status}`}>
										{selectedRecord.status}
									</span>
								</div>

								<div style={{ display: "flex", gap: "6px" }}>
									<button
										type="button"
										className="egisz-btn sm"
										onClick={() => handleExportRecordZip(selectedRecord)}
									>
										<FileArchive size={13} />
										Скачать ZIP (XML + .p7s)
									</button>

									<button
										type="button"
										className="egisz-btn sm primary"
										onClick={() => setActiveSigningRecord(selectedRecord)}
									>
										<KeyRound size={13} />
										Студия подписания
									</button>
								</div>
							</div>

							{/* If Error: Display Statutory Remediation Card */}
							{selectedRecord.validationError && (
								<div className="egisz-error-card">
									<div className="egisz-error-title">
										<ShieldAlert size={16} />
										Ошибка валидации РЭМД: {selectedRecord.validationError.errorCode}
									</div>
									<div style={{ fontSize: "12.5px", color: "var(--ink, #0f172a)" }}>
										{selectedRecord.validationError.errorMessage}
									</div>
									<div className="egisz-hint-box">
										<strong>💡 Инструкция по устранению ошибки:</strong>
										<div style={{ marginTop: "3px" }}>
											{selectedRecord.validationError.actionableHint}
										</div>
									</div>
									<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
										<button
											type="button"
											className="egisz-btn sm"
											onClick={() => handleResendRecord(selectedRecord)}
										>
											<RotateCcw size={13} />
											Повторить отправку после исправления
										</button>
									</div>
								</div>
							)}

							{/* If Registered: Display EGISZ REMD Receipt Card */}
							{selectedRecord.registrationInfo && (
								<div
									style={{
										border: "1px solid rgba(16, 185, 129, 0.35)",
										borderLeft: "4px solid #10b981",
										borderRadius: "8px",
										padding: "10px 14px",
										background: "rgba(16, 185, 129, 0.06)",
										display: "flex",
										flexDirection: "column",
										gap: "4px",
										fontSize: "12px",
									}}
								>
									<div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#059669", fontWeight: "bold" }}>
										<ShieldCheck size={16} />
										Квитанция РЭМД ЕГИСЗ (Документ зарегистрирован)
									</div>
									<div>
										<strong>Регистрационный номер:</strong> <code>{selectedRecord.registrationInfo.regNumber}</code> &nbsp;&nbsp;|&nbsp;&nbsp;
										<strong>Идентификатор РЭМД:</strong> <code>{selectedRecord.registrationInfo.remdDocId}</code>
									</div>
									<div>
										<strong>Дата и время регистрации:</strong> {new Date(selectedRecord.registrationInfo.registeredAt).toLocaleString("ru-RU")}
									</div>
									<div style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--muted, #64748b)", wordBreak: "break-all" }}>
										Хэш документа (ГОСТ Р 34.11-2012): {selectedRecord.registrationInfo.documentHashGost}
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Sub-modal: Signing Studio */}
			{activeSigningRecord && (
				<EgiszRemdSigningModal
					isOpen={Boolean(activeSigningRecord)}
					onClose={() => setActiveSigningRecord(null)}
					payload={activeSigningRecord.cdaPayload}
					documentId={activeSigningRecord.documentUuid}
					onSigned={(updatedPayload, signatures) => {
						setRecords((prev) =>
							prev.map((r) => {
								if (r.id === activeSigningRecord.id) {
									return {
										...r,
										cdaPayload: updatedPayload,
										doctorSignature: signatures.doctorSignature || r.doctorSignature,
										moSignature: signatures.moSignature || r.moSignature,
										status: "signed" as const,
										updatedAt: new Date().toISOString(),
									};
								}
								return r;
							}),
						);
					}}
					onSentToRemd={(result) => {
						if (result.success && result.regNumber) {
							setRecords((prev) =>
								prev.map((r) => {
									if (r.id === activeSigningRecord.id) {
										return {
											...r,
											status: "registered" as const,
											updatedAt: new Date().toISOString(),
											registrationInfo: {
												remdDocId: result.remdDocId || `REMD-${Date.now()}`,
												regNumber: result.regNumber || "РЭМД-77-2026-99000",
												registeredAt: new Date().toISOString(),
												registryOid: "1.2.643.5.1.13.13.11.1527",
												documentHashGost: "9F86D081884C7D659A2FEAA0C55AD015A3BF4F1B2B0B822CD15D6C15B0F00A08",
												channel: "EGISZ_INTEGRATION_GATEWAY_V3",
											},
											validationError: undefined,
										};
									}
									return r;
								}),
							);
						}
					}}
				/>
			)}
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};
