import { useState, useMemo, useCallback, useEffect } from "react";
import { showToast } from "../../GlobalToast";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import {
	type ConsentTemplateKey,
	type ConsentPackageKey,
	type ConsentSubstitutionContext,
	getConsentTemplate,
	printFilledConsentTemplate,
	printBlankConsentTemplate,
	printFilledConsentPackage,
	renderConsentTemplate,
} from "../../consents/consentTemplates";
import { generateSha256 } from "../../consents/consentIntegrityHash";
import {
	detectConsentScopeMismatch,
	sanitizeConsentContext,
	type ConsentScopeMismatchResult,
} from "../../consents/consentSummaryHelper";
import { detectRequiredVisitConsents } from "../../consents/consentSsotEngine";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import {
	type VisitConsentsTabPatient,
	type VisitConsentsTabDoctor,
	type VisitConsentsTabAppointment,
	type VisitConsentsTabNoteForm,
	type VisitConsentsTabDashboard,
	type ConsentRecordState,
	type ConsentStatusType,
	CONSENT_KEY_TO_DOCUMENT_KIND,
	DOCUMENT_KIND_TO_CONSENT_KEY,
	resolveConsentKeyFromDocument,
	CLINICAL_CONSENTS_LIST,
} from "./visitConsentTypes";

export interface UseVisitConsentsLogicParams {
	readonly activePatient?: VisitConsentsTabPatient | null | undefined;
	readonly activeDoctor?: VisitConsentsTabDoctor | null | undefined;
	readonly activeAppointment?: VisitConsentsTabAppointment | null | undefined;
	readonly visitNoteForm?: VisitConsentsTabNoteForm | null | undefined;
	readonly dashboard?: VisitConsentsTabDashboard | null | undefined;
	readonly selectedToothForMenu?: any;
	readonly onFastPrintInformedConsent?: () => void;
	readonly onOpenInformedConsentModal?: () => void;
}

export function useVisitConsentsLogic({
	activePatient,
	activeDoctor,
	activeAppointment,
	visitNoteForm,
	dashboard,
	selectedToothForMenu,
	onFastPrintInformedConsent,
	onOpenInformedConsentModal,
}: UseVisitConsentsLogicParams) {
	const patientId = activePatient?.id || "default_patient";
	const storageKey = `dente_consents_state_${patientId}`;

	// Вкладка: актуальные согласия или архив
	const [activeSubTab, setActiveSubTab] = useState<"current" | "archive">("current");

	// Аккордеон раскрытых карточек (превью текста)
	const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

	// Активное выпадающее меню действий [...] для карточки
	const [activeDropdownKey, setActiveDropdownKey] = useState<string | null>(null);

	// Закрытие выпадающего меню при клике вне него
	useEffect(() => {
		if (!activeDropdownKey) return;
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement | null;
			if (!target?.closest(".vct-dropdown-wrapper")) {
				setActiveDropdownKey(null);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [activeDropdownKey]);

	// Локальное состояние подписанных согласий пациента
	const [consentRecords, setConsentRecords] = useState<Record<string, ConsentRecordState>>(() => {
		try {
			const saved = safeLocalStorageGetItem(storageKey);
			if (saved) {
				return JSON.parse(saved);
			}
		} catch {
			// ignore json error
		}

		// ‼️ RED TEAM ИНВАРИАНТ: Согласия НЕ генерируются из воздуха задним числом.
		// Документ регистрируется подписанным исключительно по факту реального подписания пациентом (323-ФЗ ст. 20).
		const defaults: Record<string, ConsentRecordState> = {};
		return defaults;
	});

	// Синхронизация с localStorage при изменении записей
	const saveConsentRecords = useCallback((nextRecords: Record<string, ConsentRecordState>) => {
		setConsentRecords(nextRecords);
		try {
			safeLocalStorageSetItem(storageKey, JSON.stringify(nextRecords));
		} catch {
			// ignore storage errors
		}
	}, [storageKey]);

	// Проверка статуса завершенности/подписанности всего визита
	const isVisitClosed = useMemo(() => {
		return (
			activeAppointment?.status === "completed" ||
			activeAppointment?.status === "signed" ||
			activeAppointment?.status === "closed" ||
			visitNoteForm?.status === "completed" ||
			visitNoteForm?.status === "signed"
		);
	}, [activeAppointment?.status, visitNoteForm?.status]);

	// Контекст для подстановки в печатные формы и генераторы
	const substitutionContext = useMemo<ConsentSubstitutionContext>(() => {
		const docName =
			activeDoctor?.fullName ||
			activeDoctor?.name ||
			(activeDoctor?.specialty ? `Врач-стоматолог (${activeDoctor.specialty})` : "Врач-стоматолог");

		const clinicBrand =
			dashboard?.clinicSettings?.profile?.brandName ||
			dashboard?.organization?.name ||
			"Стоматологическая клиника «DENTE»";

		const clinicLegal =
			dashboard?.clinicSettings?.profile?.legalEntityName ||
			clinicBrand;

		const toothLabel =
			typeof selectedToothForMenu === "number"
				? String(selectedToothForMenu)
				: (selectedToothForMenu?.code || "По клиническому плану");

		return sanitizeConsentContext({
			patientName: activePatient?.fullName || activePatient?.name || "Пациент",
			birthDate: activePatient?.birthDate || "—",
			passport: activePatient?.passport || activePatient?.documentNumber || "—",
			doctorName: docName,
			clinicName: clinicBrand,
			clinicLegalName: clinicLegal,
			clinicAddress: dashboard?.clinicSettings?.profile?.address || (isDemoShowcaseMode() ? "г. Москва, ул. Большая Стоматологическая, д. 12" : "«________________________________________»"),
			clinicOgrn: dashboard?.clinicSettings?.profile?.ogrn || (isDemoShowcaseMode() ? "1217700123456" : "«________________»"),
			licenseNumber: dashboard?.clinicSettings?.profile?.medicalLicenseNumber || (isDemoShowcaseMode() ? "ЛО41-01137-77/00368421" : "«________________________________________»"),
			diagnosisIcd: visitNoteForm?.diagnosis || (isDemoShowcaseMode() ? "Z01.2 Стоматологическое обследование" : "________________________________________"),
			toothNumbers: toothLabel,
			date: new Date().toLocaleDateString("ru-RU"),
			snils: activePatient?.snils || null,
			phone: activePatient?.phone || null,
		});
	}, [activePatient, activeDoctor, dashboard, visitNoteForm?.diagnosis, selectedToothForMenu]);

	// Анализ клинического контекста визита: какие согласия объективно требуются сегодня
	const requiredFlags = useMemo<Partial<Record<ConsentTemplateKey, boolean>>>(() => {
		const textContext = `${visitNoteForm?.diagnosis || ""} ${visitNoteForm?.treatmentPlan || ""} ${visitNoteForm?.complaint || ""} ${visitNoteForm?.anamnesis || ""}`.toLowerCase();

		const ssotFlags = detectRequiredVisitConsents({
			textContext,
			isVisitClosed,
			hasInspectionSigned: Boolean(consentRecords.CONSENT_INSPECTION_1051N?.isSigned),
		});

		const flags: Partial<Record<ConsentTemplateKey, boolean>> = {
			CONSENT_INSPECTION_1051N: false,
			CONSENT_ANESTHESIA: false,
			CONSENT_THERAPY: false,
			CONSENT_SURGERY_IMPLANT: false,
			CONSENT_ORTHOPEDICS: false,
			CONSENT_PERSONAL_DATA: !consentRecords.CONSENT_PERSONAL_DATA?.isSigned,
			CONSENT_ORTHODONTICS: false,
			CONSENT_HYGIENE_BLEACHING: false,
			CONSENT_PEDIATRIC: false,
			...ssotFlags,
		};

		return flags;
	}, [visitNoteForm, consentRecords, isVisitClosed]);

	// Список ключей всех подписанных согласий пациента
	const signedConsentKeys = useMemo<ConsentTemplateKey[]>(() => {
		return Object.entries(consentRecords)
			.filter(([_, rec]) => rec.isSigned)
			.map(([k]) => k as ConsentTemplateKey);
	}, [consentRecords]);

	// Детекция изменений в плане лечения (Consent Scope Mismatch по 1051н и ст. 20 323-ФЗ)
	const consentScopeMismatch = useMemo<ConsentScopeMismatchResult>(() => {
		return detectConsentScopeMismatch({
			signedConsentKeys,
			treatmentPlanText: visitNoteForm?.treatmentPlan,
			diagnosisText: visitNoteForm?.diagnosis,
			complaintText: visitNoteForm?.complaint,
			anamnesisText: visitNoteForm?.anamnesis,
			objectiveStatusText: visitNoteForm?.objectiveStatus,
			additionalProcedures: selectedToothForMenu
				? [typeof selectedToothForMenu === "number" ? String(selectedToothForMenu) : (selectedToothForMenu?.code || "")]
				: [],
		});
	}, [signedConsentKeys, visitNoteForm, selectedToothForMenu]);

	// Список всех согласий с вычисленным статусом
	const itemsWithStatus = useMemo(() => {
		return CLINICAL_CONSENTS_LIST.map((item) => {
			const record = consentRecords[item.key];
			// ‼️ RED TEAM ИНВАРИАНТ: закрытие визита врачом НЕ подменяет подпись пациента в ИДС (ст. 20 323-ФЗ).
			// Согласие является подписанным ТОЛЬКО при наличии реальной записи о подписании (record?.isSigned).
			const isSigned = Boolean(record?.isSigned);
			const isReq = Boolean(requiredFlags[item.key]);

			let status: ConsentStatusType = "not_signed";
			if (isSigned) {
				status = "signed";
			} else if (isReq) {
				status = "required_today";
			}

			let renderedTemplate: ReturnType<typeof renderConsentTemplate> | null = null;
			try {
				const tpl = getConsentTemplate(item.key);
				renderedTemplate = renderConsentTemplate(tpl, substitutionContext);
			} catch {
				// template missing fallback
			}

			return {
				...item,
				status,
				record,
				renderedTemplate,
			};
		});
	}, [consentRecords, requiredFlags, substitutionContext]);

	// Список согласий, требуемых сегодня, но еще не подписанных
	const unsignedRequiredItems = useMemo(() => {
		return itemsWithStatus.filter((item) => item.status === "required_today");
	}, [itemsWithStatus]);

	// Загрузка ранее сохраненных и выданных документов из бэкенда
	useEffect(() => {
		if (!patientId) return;
		let isSubscribed = true;

		async function loadExistingDocuments() {
			try {
				const res = await fetch(`/api/documents?patientId=${encodeURIComponent(patientId)}`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) return;
				const data = (await res.json()) as {
					documents?: Array<{
						id?: string;
						kind?: string;
						title?: string;
						status?: string;
						hash?: string;
						signatureAttestation?: {
							signedAt?: string;
							staffFullName?: string;
							mode?: string;
							note?: string;
						};
						payload?: Record<string, unknown>;
						createdAt?: string;
					}>;
				};
				const docs = data?.documents;
				if (!isSubscribed || !docs || !Array.isArray(docs)) return;

				setConsentRecords((prev) => {
					const next = { ...prev };
					let hasUpdates = false;

					for (const doc of docs) {
						const isDocSigned =
							doc.status === "issued" ||
							doc.status === "signed" ||
							Boolean(doc.signatureAttestation);
						if (!isDocSigned) continue;

						const consentKey = resolveConsentKeyFromDocument(doc);

						if (consentKey && !next[consentKey]?.isSigned) {
							const signedDateStr = doc.signatureAttestation?.signedAt
								? `${new Date(doc.signatureAttestation.signedAt).toLocaleDateString("ru-RU")}, ${new Date(doc.signatureAttestation.signedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`
								: doc.createdAt
									? `${new Date(doc.createdAt).toLocaleDateString("ru-RU")}, ${new Date(doc.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`
									: `${new Date().toLocaleDateString("ru-RU")}, 09:00`;

							next[consentKey] = {
								isSigned: true,
								signedAt: signedDateStr,
								method: doc.signatureAttestation?.mode === "ukep" ? "tablet" : "paper",
								doctorName:
									doc.signatureAttestation?.staffFullName ||
									substitutionContext.doctorName ||
									"Врач-стоматолог",
								notes:
									doc.signatureAttestation?.note ||
									"Подписано и зафиксировано в реестре документов клиники",
								integrityHash:
									doc.hash || generateSha256(`${consentKey}_${patientId}_${signedDateStr}`),
							};
							hasUpdates = true;
						}
					}

					if (hasUpdates) {
						try {
							safeLocalStorageSetItem(storageKey, JSON.stringify(next));
						} catch {
							// ignore storage error
						}
						return next;
					}
					return prev;
				});
			} catch {
				// Network error / offline fallback
			}
		}

		void loadExistingDocuments();

		return () => {
			isSubscribed = false;
		};
	}, [patientId, storageKey, substitutionContext.doctorName]);

	// Асинхронное сохранение подписанного согласия на бэкенде
	const persistConsentToBackend = useCallback(
		async (key: ConsentTemplateKey, itemTitle: string, record: ConsentRecordState) => {
			if (!patientId) return;
			try {
				const kind = CONSENT_KEY_TO_DOCUMENT_KIND[key] || "informed_consent";
				const createRes = await fetch("/api/documents", {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({
						patientId,
						visitId: activeAppointment?.id || undefined,
						kind,
						title: itemTitle,
						payload: {
							consentKey: key,
							patientName: substitutionContext.patientName,
							doctorName: record.doctorName,
							signedAt: record.signedAt,
							integrityHash: record.integrityHash,
							method: record.method,
							notes: record.notes,
						},
					}),
				});

				if (!createRes.ok) return;
				const createData = (await createRes.json()) as { document?: { id?: string }; id?: string };
				const docId = createData?.document?.id || createData?.id;
				if (!docId) return;

				const nowIso = new Date().toISOString();
				await fetch(`/api/documents/${encodeURIComponent(docId)}/issue`, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({
						signatureAttestation: {
							mode: "paper_signed",
							signedAt: nowIso,
							recipientFullName: substitutionContext.patientName || "Пациент",
							recipientRole: "patient",
							staffFullName: record.doctorName || "Врач-стоматолог",
							staffRole: "doctor",
							identityChecked: true,
							documentOpenedAndChecked: true,
							recipientSigned: true,
							clinicRepresentativeSigned: true,
							note: record.notes || "Подписано на бумаге и подшито в медицинскую карту",
						},
					}),
				});
			} catch {
				// Offline fallback
			}
		},
		[activeAppointment?.id, patientId, substitutionContext.doctorName, substitutionContext.patientName],
	);

	// 1-Клик отметка: Подписано на бумаге
	const handleTogglePaperSigned = useCallback((key: ConsentTemplateKey, itemTitle: string) => {
		const current = consentRecords[key];
		const isCurrentlySigned = Boolean(current?.isSigned);

		if (isCurrentlySigned) {
			const next = { ...consentRecords };
			delete next[key];
			saveConsentRecords(next);
			showToast(`Отметка о согласии «${itemTitle}» снята`, "info");
		} else {
			const nowStr = `${new Date().toLocaleDateString("ru-RU")}, ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
			const newRecord: ConsentRecordState = {
				isSigned: true,
				signedAt: nowStr,
				method: "paper" as const,
				doctorName: substitutionContext.doctorName || "Врач-стоматолог",
				notes: "Оригинал подписан на бумаге и подшит в медицинскую карту",
				integrityHash: generateSha256(`${key}_${patientId}_${nowStr}_paper`),
			};
			const next = {
				...consentRecords,
				[key]: newRecord,
			};
			saveConsentRecords(next);
			showToast(`Согласие «${itemTitle}» отмечено как подписанное на бумаге`, "success");
			void persistConsentToBackend(key, itemTitle, newRecord);
		}
	}, [consentRecords, patientId, persistConsentToBackend, saveConsentRecords, substitutionContext.doctorName]);

	// 1-Клик: Отметить все необходимые согласия на сегодня как подписанные на бумаге
	const handleMarkAllRequiredTodaySigned = useCallback(() => {
		if (unsignedRequiredItems.length === 0) {
			showToast("Все требуемые на сегодня согласия уже подписаны", "info");
			return;
		}

		const nowStr = `${new Date().toLocaleDateString("ru-RU")}, ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
		const next = { ...consentRecords };

		for (const item of unsignedRequiredItems) {
			const rec: ConsentRecordState = {
				isSigned: true,
				signedAt: nowStr,
				method: "paper",
				doctorName: substitutionContext.doctorName || "Врач-стоматолог",
				notes: "Оригинал подписан на бумаге (пакет на сегодня)",
				integrityHash: generateSha256(`${item.key}_${patientId}_${nowStr}_paper`),
			};
			next[item.key] = rec;
			void persistConsentToBackend(item.key, item.title, rec);
		}

		saveConsentRecords(next);
		showToast(`Оформлено на бумаге: ${unsignedRequiredItems.length} согласий`, "success");
	}, [unsignedRequiredItems, consentRecords, substitutionContext.doctorName, patientId, persistConsentToBackend, saveConsentRecords]);

	// Печать бланка одного согласия (заполненного)
	const handlePrintSingleFilled = useCallback((key: ConsentTemplateKey) => {
		if (key === "CONSENT_INSPECTION_1051N" && onFastPrintInformedConsent) {
			onFastPrintInformedConsent();
			return;
		}
		const isItemSigned = Boolean(consentRecords[key]?.isSigned) || isVisitClosed;
		printFilledConsentTemplate(key, substitutionContext, {
			isSigned: isItemSigned,
			watermarkText: isItemSigned ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК — ДЛЯ ОЗНАКОМЛЕНИЯ",
		});
		showToast("Бланк согласия на лечение отправлен на печать", "success");
	}, [consentRecords, isVisitClosed, onFastPrintInformedConsent, substitutionContext]);

	// Печать чистого бланка одного согласия со строками «________»
	const handlePrintSingleBlank = useCallback((key: ConsentTemplateKey) => {
		printBlankConsentTemplate(key, substitutionContext);
		showToast("Чистый бланк согласия на лечение отправлен на печать", "info");
	}, [substitutionContext]);

	// 1-Клик: Печать пакета согласий на сегодня
	const handlePrintTodayPackage = useCallback(() => {
		let pkgKey: ConsentPackageKey = "PACKAGE_PRIMARY_VISIT";
		if (requiredFlags.CONSENT_SURGERY_IMPLANT) {
			pkgKey = "PACKAGE_SURGERY";
		} else if (requiredFlags.CONSENT_ORTHOPEDICS) {
			pkgKey = "PACKAGE_ORTHOPEDICS";
		}

		printFilledConsentPackage(pkgKey, substitutionContext, {
			isSigned: isVisitClosed,
			watermarkText: isVisitClosed ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК — ДЛЯ ПОДПИСИ ПАЦИЕНТОМ",
		});
		showToast("Пакет согласий на сегодня сформирован и отправлен на печать", "success");
	}, [requiredFlags, substitutionContext, isVisitClosed]);

	// 1-Клик: Сформировать доп. согласие на новые процедуры (печать + фиксация)
	const handleFormAddendumConsent = useCallback(() => {
		if (consentScopeMismatch.uncoveredTemplateKeys.length === 0) {
			showToast("Все процедуры текущего визита уже покрыты соглашением", "info");
			return;
		}

		const nowStr = `${new Date().toLocaleDateString("ru-RU")}, ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
		const next = { ...consentRecords };

		for (const tplKey of consentScopeMismatch.uncoveredTemplateKeys) {
			const conf = CLINICAL_CONSENTS_LIST.find((c) => c.key === tplKey);
			const title = conf?.title || tplKey;
			const rec: ConsentRecordState = {
				isSigned: true,
				signedAt: nowStr,
				method: "paper",
				doctorName: substitutionContext.doctorName || "Врач-стоматолог",
				notes: "Дополнительное информированное согласие на добавленные инвазивные процедуры (Приказ Минздрава 1051н)",
				integrityHash: generateSha256(`ADDENDUM_${tplKey}_${patientId}_${nowStr}`),
			};
			next[tplKey] = rec;
			void persistConsentToBackend(tplKey, title, rec);
		}

		saveConsentRecords(next);

		if (consentScopeMismatch.uncoveredTemplateKeys.length === 1 && consentScopeMismatch.uncoveredTemplateKeys[0]) {
			handlePrintSingleFilled(consentScopeMismatch.uncoveredTemplateKeys[0]);
		} else {
			handlePrintTodayPackage();
		}

		showToast("Сформировано и отправлено на печать доп. согласие на новые процедуры", "success");
	}, [consentScopeMismatch, consentRecords, substitutionContext.doctorName, patientId, persistConsentToBackend, saveConsentRecords, handlePrintSingleFilled, handlePrintTodayPackage]);

	// 1-Клик: Отметить доп. согласие подписанным на бумаге без печати
	const handleMarkAddendumSigned = useCallback(() => {
		if (consentScopeMismatch.uncoveredTemplateKeys.length === 0) {
			showToast("Все процедуры текущего визита уже покрыты соглашением", "info");
			return;
		}

		const nowStr = `${new Date().toLocaleDateString("ru-RU")}, ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
		const next = { ...consentRecords };

		for (const tplKey of consentScopeMismatch.uncoveredTemplateKeys) {
			const conf = CLINICAL_CONSENTS_LIST.find((c) => c.key === tplKey);
			const title = conf?.title || tplKey;
			const rec: ConsentRecordState = {
				isSigned: true,
				signedAt: nowStr,
				method: "paper",
				doctorName: substitutionContext.doctorName || "Врач-стоматолог",
				notes: "Дополнительное информированное согласие на добавленные процедуры подписано на бумаге",
				integrityHash: generateSha256(`ADDENDUM_${tplKey}_${patientId}_${nowStr}`),
			};
			next[tplKey] = rec;
			void persistConsentToBackend(tplKey, title, rec);
		}

		saveConsentRecords(next);
		showToast("Дополнительное согласие на новые процедуры отмечено подписанным", "success");
	}, [consentScopeMismatch, consentRecords, substitutionContext.doctorName, patientId, persistConsentToBackend, saveConsentRecords]);

	// Тоггл аккордеона быстрого просмотра
	const toggleCardExpand = useCallback((key: string) => {
		setExpandedCards((prev) => ({
			...prev,
			[key]: !prev[key],
		}));
	}, []);

	// Список ранее оформленных согласий для Архива
	const archiveList = useMemo(() => {
		return Object.entries(consentRecords)
			.filter(([_, rec]) => rec.isSigned)
			.map(([key, rec]) => {
				const conf = CLINICAL_CONSENTS_LIST.find((c) => c.key === key);
				return {
					key: key as ConsentTemplateKey,
					code: conf?.code || key,
					title: conf?.title || key,
					category: conf?.category || "Медицинская документация",
					statutoryBasis: conf?.statutoryBasis || "Клинический стандарт",
					record: rec,
				};
			});
	}, [consentRecords]);

	return {
		activeSubTab,
		setActiveSubTab,
		expandedCards,
		toggleCardExpand,
		activeDropdownKey,
		setActiveDropdownKey,
		substitutionContext,
		consentScopeMismatch,
		itemsWithStatus,
		unsignedRequiredItems,
		archiveList,
		handleTogglePaperSigned,
		handleMarkAllRequiredTodaySigned,
		handlePrintSingleFilled,
		handlePrintSingleBlank,
		handlePrintTodayPackage,
		handleFormAddendumConsent,
		handleMarkAddendumSigned,
	};
}
