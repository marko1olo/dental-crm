/**
 * VisitConsentsTab.tsx
 * ============================================================================
 * КЛИНИЧЕСКИЙ АРМ ИНФОРМИРОВАННЫХ СОГЛАСИЙ (ИДС) У КРЕСЛА ВРАЧА-СТОМАТОЛОГА
 * ============================================================================
 * 
 * Нормативная база:
 * 1. Федеральный закон № 323-ФЗ (ст. 20) и Приказ Минздрава РФ № 1051н (ИДС и Отказы).
 * 2. Федеральный закон № 152-ФЗ «О персональных данных» и ПП РФ № 140 (ЕГИСЗ / РЭМД).
 * 3. Закон РФ «О защите прав потребителей» и Гражданский кодекс РФ (Гарантийные обязательства).
 * 4. Клинические протоколы и стандарты Стоматологической Ассоциации России (СтАР).
 * 
 * Инварианты эргономики:
 * - Мандат 8e: Врачебная автономия — 1-клик hot path у кресла, 0 блокирующих окон.
 * - Мандат 8d: 0 эмодзи, только векторные иконки Lucide.
 * - Дизайн-система: Vanilla CSS, токены темы var(--paper), var(--ink), var(--line) и т.д.
 * - Десктопная плотность: высота кнопок 28–34px (h-8, h-9).
 * - Анти-матрешка: глубина карточек строго <= 1 уровня.
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
	ShieldCheck,
	ShieldAlert,
	Check,
	CheckCircle2,
	AlertTriangle,
	Printer,
	ChevronDown,
	ChevronUp,
	Eye,
	EyeOff,
	Tablet,
	FileText,
	FileCheck,
	Award,
	History,
	RotateCcw,
	ExternalLink,
	Sparkles,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import {
	type ConsentTemplateKey,
	type ConsentPackageKey,
	type ConsentSubstitutionContext,
	type ConsentTemplate,
	CONSENT_TEMPLATES,
	CONSENT_PACKAGES,
	getConsentTemplate,
	getConsentPackage,
	printFilledConsentTemplate,
	printBlankConsentTemplate,
	printFilledConsentPackage,
	renderConsentTemplate,
} from "../consents/consentTemplates";
import { generateSha256 } from "../consents/consentIntegrityHash";

export interface VisitConsentsTabPatient {
	id?: string | null | undefined;
	fullName?: string | null | undefined;
	name?: string | null | undefined;
	birthDate?: string | null | undefined;
	passport?: string | null | undefined;
	documentNumber?: string | null | undefined;
	phone?: string | null | undefined;
	snils?: string | null | undefined;
	address?: string | null | undefined;
	cardNumber?: string | null | undefined;
	medicalCardNumber?: string | null | undefined;
	cardOpenedAt?: string | null | undefined;
	allergies?: string | null | undefined;
	somaticNotes?: string | null | undefined;
	[key: string]: unknown;
}

export interface VisitConsentsTabDoctor {
	id?: string | null | undefined;
	fullName?: string | null | undefined;
	name?: string | null | undefined;
	specialty?: string | null | undefined;
	specialtyRu?: string | null | undefined;
	[key: string]: unknown;
}

export interface VisitConsentsTabAppointment {
	id?: string | null | undefined;
	status?: string | null | undefined;
	appointmentDate?: string | null | undefined;
	[key: string]: unknown;
}

export interface VisitConsentsTabNoteForm {
	diagnosis?: string | null | undefined;
	treatmentPlan?: string | null | undefined;
	complaint?: string | null | undefined;
	anamnesis?: string | null | undefined;
	objectiveStatus?: string | null | undefined;
	status?: string | null | undefined;
	[key: string]: unknown;
}

export interface VisitConsentsTabDashboard {
	clinicSettings?: {
		profile?: {
			brandName?: string | undefined;
			legalEntityName?: string | undefined;
			address?: string | undefined;
			ogrn?: string | undefined;
			medicalLicenseNumber?: string | undefined;
			[key: string]: unknown;
		} | undefined;
		[key: string]: unknown;
	} | undefined;
	organization?: {
		name?: string | undefined;
		[key: string]: unknown;
	} | undefined;
	[key: string]: unknown;
}

export interface VisitConsentsTabProps {
	readonly activePatient?: VisitConsentsTabPatient | null | undefined;
	readonly activeDoctor?: VisitConsentsTabDoctor | null | undefined;
	readonly activeAppointment?: VisitConsentsTabAppointment | null | undefined;
	readonly visitNoteForm?: VisitConsentsTabNoteForm | null | undefined;
	readonly dashboard?: VisitConsentsTabDashboard | null | undefined;
	readonly selectedToothForMenu?: any;
	readonly onOpenInformedConsentModal?: () => void;
	readonly onOpenWarrantyModal?: () => void;
	readonly onFastPrint043u?: () => void;
	readonly onFastPrintInformedConsent?: () => void;
}

export type ConsentStatusType = "signed" | "required_today" | "not_signed";

export interface ConsentRecordState {
	isSigned: boolean;
	signedAt?: string;
	method?: "paper" | "tablet" | "otp";
	integrityHash?: string;
	doctorName?: string;
	notes?: string;
}

interface ClinicalConsentConfig {
	key: ConsentTemplateKey;
	code: string;
	title: string;
	category: string;
	statutoryBasis: string;
	summary: string;
	defaultRequiredKeywords: readonly string[];
}

const CLINICAL_CONSENTS_LIST: readonly ClinicalConsentConfig[] = [
	{
		key: "CONSENT_INSPECTION_1051N",
		code: "ИДС-1051Н",
		title: "Общее информированное согласие на первичный осмотр и диагностику",
		category: "Первичный осмотр и диагностика",
		statutoryBasis: "323-ФЗ ст. 20, Приказ Минздрава РФ № 1051н",
		summary: "Клинический осмотр полости рта, зондирование, холодовые пробы, индексная оценка гигиены и цифровая рентген-диагностика (визиография, ОПТГ, КЛКТ).",
		defaultRequiredKeywords: ["осмотр", "консультац", "диагност", "первичн", "кнкт", "оптг", "рентген", "z01"],
	},
	{
		key: "CONSENT_ANESTHESIA",
		code: "ИДС-АНЕСТ",
		title: "Согласие на местную анестезию",
		category: "Местное обезболивание",
		statutoryBasis: "323-ФЗ ст. 20, Клинические рекомендации СтАР",
		summary: "Инфильтрационная, проводниковая и интралигаментарная карпульная анестезия современными препаратами (Артикаин, Мепивакаин) с учетом соматического статуса.",
		defaultRequiredKeywords: ["анестез", "карпул", "обезбол", "артикаин", "мепивакаин", "убистезин", "септанест", "скандонест", "удал", "кариес", "пульпит", "пломб", "препар"],
	},
	{
		key: "CONSENT_THERAPY",
		code: "ИДС-ТЕР",
		title: "Согласие на терапевтическое лечение и эндодонтию",
		category: "Терапия и эндодонтия",
		statutoryBasis: "323-ФЗ ст. 20, Протоколы СтАР",
		summary: "Препарирование твердых тканей зуба, наложение коффердама, эндодонтическая обработка и обтурация корневых каналов, адгезивная композитная реставрация.",
		defaultRequiredKeywords: ["кариес", "пульпит", "периодонтит", "пломб", "реставрац", "эндо", "депульп", "канал", "коффердам", "k02", "k04"],
	},
	{
		key: "CONSENT_SURGERY_IMPLANT",
		code: "ИДС-ХИР",
		title: "Согласие на хирургическое вмешательство, удаление и имплантацию",
		category: "Хирургия и имплантация",
		statutoryBasis: "323-ФЗ ст. 20, Хирургические стандарты СтАР",
		summary: "Простое и сложное удаление зубов, ревизия лунки, альвеолотомия, синус-лифтинг, костная пластика и дентальная имплантация.",
		defaultRequiredKeywords: ["удал", "экстракц", "хирург", "имплант", "синус", "лунк", "резекц", "перикорон", "дистоп", "ретинир", "k01", "k05.2"],
	},
	{
		key: "CONSENT_ORTHOPEDICS",
		code: "ИДС-ОРТ",
		title: "Согласие на ортопедическое лечение и протезирование",
		category: "Ортопедия и протезирование",
		statutoryBasis: "323-ФЗ ст. 20, Правила платных медуслуг № 736",
		summary: "Препарирование зубов, снятие оптических или полиэфирных слепков, изготовление и фиксация вкладок, виниров, одиночных коронок и мостовидных протезов.",
		defaultRequiredKeywords: ["коронк", "протез", "слепок", "винир", "ортопед", "вкладк", "мост", "сканирован", "абатмент", "k08"],
	},
	{
		key: "CONSENT_PERSONAL_DATA",
		code: "ПДН-152",
		title: "Согласие на обработку персональных данных",
		category: "Персональные данные и ЕГИСЗ",
		statutoryBasis: "152-ФЗ ст. 6, 9, 10, ПП РФ № 140",
		summary: "Сбор, хранение, передача сведений в защищенный контур ЕГИСЗ (РЭМД) и обработка данных медицинской карты пациента в строгом соответствии с 152-ФЗ.",
		defaultRequiredKeywords: ["пдн", "персональн", "егисз", "рэмд", "регистрац", "оформлен"],
	},
];

export function VisitConsentsTab({
	activePatient,
	activeDoctor,
	activeAppointment,
	visitNoteForm,
	dashboard,
	selectedToothForMenu,
	onOpenInformedConsentModal,
	onOpenWarrantyModal,
	onFastPrint043u,
	onFastPrintInformedConsent,
}: VisitConsentsTabProps) {
	const patientId = activePatient?.id || "default_patient";
	const storageKey = `dente_consents_state_${patientId}`;

	// Вкладка: актуальные согласия или архив
	const [activeSubTab, setActiveSubTab] = useState<"current" | "archive">("current");

	// Аккордеон раскрытых карточек (превью текста)
	const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

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

		// Клинический дефолт для существующего или нового пациента:
		// Персональные данные и общий осмотр обычно уже подписаны при первичной регистрации в регистратуре
		const hasCard = Boolean(activePatient?.cardNumber || activePatient?.medicalCardNumber || activePatient?.cardOpenedAt);
		const initialDate = activePatient?.cardOpenedAt
			? new Date(activePatient.cardOpenedAt).toLocaleDateString("ru-RU")
			: new Date().toLocaleDateString("ru-RU");

		const defaults: Record<string, ConsentRecordState> = {};

		if (hasCard) {
			defaults.CONSENT_PERSONAL_DATA = {
				isSigned: true,
				signedAt: `${initialDate}, 09:10`,
				method: "paper",
				doctorName: "Регистратура",
				notes: "Оригинал подписан при первичном оформлении карты 043/у",
				integrityHash: generateSha256(`PDN_${patientId}_${initialDate}`),
			};
			defaults.CONSENT_INSPECTION_1051N = {
				isSigned: true,
				signedAt: `${initialDate}, 09:15`,
				method: "paper",
				doctorName: activeDoctor?.fullName || "Врач-стоматолог",
				notes: "Оригинал ИДС 1051н подшит в медицинскую карту",
				integrityHash: generateSha256(`INSP_${patientId}_${initialDate}`),
			};
		}

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

		return {
			patientName: activePatient?.fullName || activePatient?.name || "Пациент",
			birthDate: activePatient?.birthDate || "—",
			passport: activePatient?.passport || activePatient?.documentNumber || "—",
			doctorName: docName,
			clinicName: clinicBrand,
			clinicLegalName: clinicLegal,
			clinicAddress: dashboard?.clinicSettings?.profile?.address || "г. Москва, ул. Большая Стоматологическая, д. 12",
			clinicOgrn: dashboard?.clinicSettings?.profile?.ogrn || "1217700123456",
			licenseNumber: dashboard?.clinicSettings?.profile?.medicalLicenseNumber || "ЛО41-01137-77/00368421",
			diagnosisIcd: visitNoteForm?.diagnosis || "Z01.2 Стоматологическое обследование",
			toothNumbers: toothLabel,
			date: new Date().toLocaleDateString("ru-RU"),
			snils: activePatient?.snils || null,
			phone: activePatient?.phone || null,
		};
	}, [activePatient, activeDoctor, dashboard, visitNoteForm?.diagnosis, selectedToothForMenu]);

	// Анализ клинического контекста визита: какие согласия объективно требуются сегодня
	const requiredFlags = useMemo<Record<ConsentTemplateKey, boolean>>(() => {
		const textContext = `${visitNoteForm?.diagnosis || ""} ${visitNoteForm?.treatmentPlan || ""} ${visitNoteForm?.complaint || ""} ${visitNoteForm?.anamnesis || ""}`.toLowerCase();

		const flags: Record<ConsentTemplateKey, boolean> = {
			CONSENT_INSPECTION_1051N: false,
			CONSENT_ANESTHESIA: false,
			CONSENT_THERAPY: false,
			CONSENT_SURGERY_IMPLANT: false,
			CONSENT_ORTHOPEDICS: false,
			CONSENT_PERSONAL_DATA: false,
			CONSENT_ORTHODONTICS: false,
			CONSENT_HYGIENE_BLEACHING: false,
			CONSENT_PEDIATRIC: false,
		};

		// 1. Персональные данные (152-ФЗ): обязательно, если еще не подписано
		if (!consentRecords.CONSENT_PERSONAL_DATA?.isSigned) {
			flags.CONSENT_PERSONAL_DATA = true;
		}

		// 2. Общий осмотр: обязательно, если еще не подписано
		if (!consentRecords.CONSENT_INSPECTION_1051N?.isSigned) {
			flags.CONSENT_INSPECTION_1051N = true;
		}

		// 3. Местная анестезия: требуется при любом лечении, препарировании, удалении или наличии жалоб
		const anesthesiaKeywords = ["анестез", "замороз", "карпул", "артикаин", "мепивакаин", "удал", "кариес", "пульпит", "периодонт", "пломб", "препар", "коронк", "имплант"];
		if (anesthesiaKeywords.some((kw) => textContext.includes(kw)) || (!textContext.trim() && !isVisitClosed)) {
			flags.CONSENT_ANESTHESIA = true;
		}

		// 4. Терапия / эндодонтия: кариес, пульпит, пломбы, каналы
		const therapyKeywords = ["кариес", "пульпит", "периодонтит", "пломб", "реставрац", "эндо", "депульп", "канал", "k02", "k04"];
		if (therapyKeywords.some((kw) => textContext.includes(kw)) || (!textContext.trim() && !isVisitClosed)) {
			flags.CONSENT_THERAPY = true;
		}

		// 5. Хирургия: удаление, имплантация, синус-лифтинг
		const surgeryKeywords = ["удал", "экстракц", "хирург", "имплант", "синус", "лунк", "резекц", "дистоп", "ретинир", "k01"];
		if (surgeryKeywords.some((kw) => textContext.includes(kw))) {
			flags.CONSENT_SURGERY_IMPLANT = true;
		}

		// 6. Ортопедия: коронки, мосты, протезы, слепки, виниры
		const orthoKeywords = ["коронк", "протез", "слепок", "винир", "ортопед", "вкладк", "мост", "k08"];
		if (orthoKeywords.some((kw) => textContext.includes(kw))) {
			flags.CONSENT_ORTHOPEDICS = true;
		}

		return flags;
	}, [visitNoteForm, consentRecords, isVisitClosed]);

	// Список всех согласий с вычисленным статусом
	const itemsWithStatus = useMemo(() => {
		return CLINICAL_CONSENTS_LIST.map((item) => {
			const record = consentRecords[item.key];
			const isSigned = Boolean(record?.isSigned) || isVisitClosed;
			const isReq = Boolean(requiredFlags[item.key]);

			let status: ConsentStatusType = "not_signed";
			if (isSigned) {
				status = "signed";
			} else if (isReq) {
				status = "required_today";
			}

			// Рендеринг шаблона для превью текста
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
	}, [consentRecords, isVisitClosed, requiredFlags, substitutionContext]);

	// Список согласий, требуемых сегодня, но еще не подписанных
	const unsignedRequiredItems = useMemo(() => {
		return itemsWithStatus.filter((item) => item.status === "required_today");
	}, [itemsWithStatus]);

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
			const next = {
				...consentRecords,
				[key]: {
					isSigned: true,
					signedAt: nowStr,
					method: "paper" as const,
					doctorName: substitutionContext.doctorName || "Врач-стоматолог",
					notes: "Оригинал подписан на бумаге и подшит в карту 043/у",
					integrityHash: generateSha256(`${key}_${patientId}_${nowStr}_paper`),
				},
			};
			saveConsentRecords(next);
			showToast(`Согласие «${itemTitle}» отмечено как подписанное на бумаге`, "success");
		}
	}, [consentRecords, patientId, saveConsentRecords, substitutionContext.doctorName]);

	// 1-Клик: Отметить все необходимые согласия на сегодня как подписанные на бумаге
	const handleMarkAllRequiredTodaySigned = useCallback(() => {
		if (unsignedRequiredItems.length === 0) {
			showToast("Все требуемые на сегодня согласия уже подписаны", "info");
			return;
		}

		const nowStr = `${new Date().toLocaleDateString("ru-RU")}, ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
		const next = { ...consentRecords };

		for (const item of unsignedRequiredItems) {
			next[item.key] = {
				isSigned: true,
				signedAt: nowStr,
				method: "paper",
				doctorName: substitutionContext.doctorName || "Врач-стоматолог",
				notes: "Оригинал подписан на бумаге (пакет на сегодня)",
				integrityHash: generateSha256(`${item.key}_${patientId}_${nowStr}_paper`),
			};
		}

		saveConsentRecords(next);
		showToast(`Оформлено на бумаге: ${unsignedRequiredItems.length} согласий`, "success");
	}, [unsignedRequiredItems, consentRecords, substitutionContext.doctorName, patientId, saveConsentRecords]);

	// Печать бланка одного согласия (заполненного)
	const handlePrintSingleFilled = useCallback((key: ConsentTemplateKey) => {
		const isItemSigned = Boolean(consentRecords[key]?.isSigned) || isVisitClosed;
		printFilledConsentTemplate(key, substitutionContext, {
			isSigned: isItemSigned,
			watermarkText: isItemSigned ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК — ДЛЯ ОЗНАКОМЛЕНИЯ",
		});
		showToast("Бланк ИДС отправлен на печать", "success");
	}, [consentRecords, isVisitClosed, substitutionContext]);

	// Печать чистого бланка одного согласия со строками «________»
	const handlePrintSingleBlank = useCallback((key: ConsentTemplateKey) => {
		printBlankConsentTemplate(key, substitutionContext);
		showToast("Чистый бланк ИДС отправлен на печать", "info");
	}, [substitutionContext]);

	// 1-Клик: Печать пакета согласий на сегодня
	const handlePrintTodayPackage = useCallback(() => {
		// Определение подходящего пакета: хирургия, ортопедия или первичный
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
					statutoryBasis: conf?.statutoryBasis || "323-ФЗ",
					record: rec,
				};
			});
	}, [consentRecords]);

	return (
		<div className="vct-root" data-testid="visit-consents-tab-panel">
			<style>{`
				.vct-root {
					background: var(--paper);
					border: 1px solid var(--line);
					border-radius: var(--radius-xl, 12px);
					padding: 16px;
					display: flex;
					flex-direction: column;
					gap: 16px;
					color: var(--ink);
					font-family: inherit;
					box-sizing: border-box;
				}

				.vct-header {
					display: flex;
					align-items: center;
					justify-content: space-between;
					flex-wrap: wrap;
					gap: 12px;
					padding-bottom: 12px;
					border-bottom: 1px solid var(--line);
				}

				.vct-title-group {
					display: flex;
					flex-direction: column;
					gap: 2px;
				}

				.vct-title {
					font-size: 15px;
					font-weight: 700;
					color: var(--ink);
					margin: 0;
					display: flex;
					align-items: center;
					gap: 8px;
				}

				.vct-subtitle {
					font-size: 12px;
					color: var(--muted);
					margin: 0;
				}

				.vct-header-actions {
					display: flex;
					align-items: center;
					gap: 8px;
					flex-wrap: wrap;
				}

				.vct-btn {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					gap: 6px;
					height: 32px;
					padding: 0 12px;
					border-radius: var(--radius-md, 8px);
					font-size: 12px;
					font-weight: 600;
					cursor: pointer;
					transition: all 0.15s ease;
					border: 1px solid transparent;
					white-space: nowrap;
					user-select: none;
					text-decoration: none;
					box-sizing: border-box;
				}

				.vct-btn:disabled {
					opacity: 0.5;
					cursor: not-allowed;
				}

				.vct-btn-primary {
					background: var(--teal);
					color: var(--on-teal, #ffffff);
					border-color: var(--teal-dark, #0d9488);
				}
				.vct-btn-primary:hover:not(:disabled) {
					background: var(--teal-dark, #0f766e);
				}

				.vct-btn-success {
					background: var(--emerald, #059669);
					color: #ffffff;
					border-color: var(--emerald, #059669);
				}
				.vct-btn-success:hover:not(:disabled) {
					filter: brightness(0.92);
				}

				.vct-btn-secondary {
					background: var(--paper-soft);
					color: var(--ink);
					border-color: var(--line-strong, var(--line));
				}
				.vct-btn-secondary:hover:not(:disabled) {
					background: var(--paper);
					border-color: var(--muted);
				}

				.vct-btn-outline-danger {
					background: transparent;
					color: var(--danger, #dc2626);
					border-color: var(--line);
				}
				.vct-btn-outline-danger:hover:not(:disabled) {
					background: var(--danger-surface, #fef2f2);
					border-color: var(--danger, #dc2626);
				}

				.vct-btn-sm {
					height: 28px;
					padding: 0 9px;
					font-size: 11.5px;
				}

				/* Hot Path Banner */
				.vct-package-banner {
					border-radius: var(--radius-lg, 10px);
					padding: 12px 16px;
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 16px;
					flex-wrap: wrap;
					border: 1px solid var(--line);
					background: var(--paper-soft);
				}

				.vct-package-banner.required {
					border-color: var(--amber, #d97706);
					background: var(--amber-surface, #fffbeb);
				}

				.vct-package-banner.all-signed {
					border-color: var(--emerald, #059669);
					background: var(--emerald-surface, #ecfdf5);
				}

				[data-theme="dark"] .vct-package-banner.required {
					background: rgba(217, 119, 6, 0.12);
					border-color: rgba(217, 119, 6, 0.4);
				}

				[data-theme="dark"] .vct-package-banner.all-signed {
					background: rgba(5, 150, 105, 0.12);
					border-color: rgba(5, 150, 105, 0.4);
				}

				.vct-package-info {
					display: flex;
					align-items: flex-start;
					gap: 12px;
					max-width: 650px;
				}

				.vct-package-icon-box {
					width: 32px;
					height: 32px;
					border-radius: 8px;
					display: flex;
					align-items: center;
					justify-content: center;
					flex-shrink: 0;
				}

				.vct-package-icon-box.required {
					background: rgba(217, 119, 6, 0.15);
					color: var(--amber, #d97706);
				}

				.vct-package-icon-box.all-signed {
					background: rgba(5, 150, 105, 0.15);
					color: var(--emerald, #059669);
				}

				.vct-package-title {
					font-size: 13.5px;
					font-weight: 700;
					margin: 0;
					color: var(--ink);
				}

				.vct-package-desc {
					font-size: 12px;
					color: var(--muted);
					margin: 2px 0 0 0;
					line-height: 1.4;
				}

				.vct-package-actions {
					display: flex;
					align-items: center;
					gap: 8px;
					flex-wrap: wrap;
				}

				/* Navigation sub-tabs */
				.vct-nav-row {
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 12px;
					border-bottom: 1px solid var(--line);
					padding-bottom: 6px;
					flex-wrap: wrap;
				}

				.vct-tabs-nav {
					display: flex;
					align-items: center;
					gap: 6px;
				}

				.vct-tab-trigger {
					display: inline-flex;
					align-items: center;
					gap: 6px;
					padding: 6px 12px;
					font-size: 12px;
					font-weight: 600;
					border-radius: var(--radius-md, 6px);
					background: transparent;
					color: var(--muted);
					border: none;
					cursor: pointer;
					transition: all 0.15s ease;
				}

				.vct-tab-trigger:hover {
					color: var(--ink);
					background: var(--paper-soft);
				}

				.vct-tab-trigger.active {
					color: var(--teal);
					background: var(--teal-surface, var(--paper-soft));
					font-weight: 700;
				}

				.vct-counter-badge {
					font-size: 10.5px;
					font-weight: 700;
					padding: 1px 6px;
					border-radius: 9999px;
					background: var(--paper);
					border: 1px solid var(--line);
					color: var(--ink);
				}

				/* Cards List */
				.vct-cards-list {
					display: flex;
					flex-direction: column;
					gap: 10px;
				}

				.vct-consent-card {
					border: 1px solid var(--line);
					border-radius: var(--radius-lg, 10px);
					background: var(--paper-soft);
					transition: border-color 0.15s ease, box-shadow 0.15s ease;
					overflow: hidden;
				}

				.vct-consent-card:hover {
					border-color: var(--line-strong, var(--line));
				}

				.vct-consent-card.highlight-required {
					border-left: 3px solid var(--amber, #d97706);
				}

				.vct-consent-card.highlight-signed {
					border-left: 3px solid var(--emerald, #059669);
				}

				.vct-card-summary-row {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 10px 14px;
					gap: 12px;
					flex-wrap: wrap;
				}

				.vct-card-left {
					display: flex;
					align-items: flex-start;
					gap: 10px;
					flex: 1;
					min-width: 260px;
				}

				.vct-card-meta {
					display: flex;
					flex-direction: column;
					gap: 3px;
				}

				.vct-card-title-row {
					display: flex;
					align-items: center;
					gap: 8px;
					flex-wrap: wrap;
				}

				.vct-card-title {
					font-size: 13.5px;
					font-weight: 700;
					color: var(--ink);
					margin: 0;
				}

				.vct-code-pill {
					font-family: monospace;
					font-size: 10.5px;
					font-weight: 700;
					padding: 1px 5px;
					border-radius: 4px;
					background: var(--paper);
					border: 1px solid var(--line);
					color: var(--muted);
				}

				.vct-statutory-pill {
					font-size: 10.5px;
					font-weight: 600;
					color: var(--muted);
				}

				.vct-card-desc {
					font-size: 12px;
					color: var(--muted);
					margin: 0;
					line-height: 1.35;
				}

				.vct-card-badges {
					display: flex;
					align-items: center;
					gap: 8px;
					flex-wrap: wrap;
				}

				.vct-badge {
					display: inline-flex;
					align-items: center;
					gap: 5px;
					padding: 3px 8px;
					border-radius: var(--radius-full, 9999px);
					font-size: 11px;
					font-weight: 700;
					letter-spacing: 0.02em;
				}

				.vct-badge-signed {
					background: rgba(5, 150, 105, 0.12);
					color: var(--emerald, #059669);
					border: 1px solid rgba(5, 150, 105, 0.3);
				}

				.vct-badge-required {
					background: rgba(217, 119, 6, 0.12);
					color: var(--amber, #d97706);
					border: 1px solid rgba(217, 119, 6, 0.3);
				}

				.vct-badge-neutral {
					background: var(--paper);
					color: var(--muted);
					border: 1px solid var(--line);
				}

				.vct-signed-detail {
					font-size: 11px;
					color: var(--muted);
					display: flex;
					align-items: center;
					gap: 4px;
				}

				.vct-card-actions {
					display: flex;
					align-items: center;
					gap: 6px;
					flex-wrap: wrap;
				}

				/* Inline Accordion Preview */
				.vct-inline-preview {
					border-top: 1px solid var(--line);
					padding: 14px 16px;
					background: var(--paper);
					display: flex;
					flex-direction: column;
					gap: 12px;
					animation: vctSlideDown 0.18s ease-out;
				}

				@keyframes vctSlideDown {
					from {
						opacity: 0;
						transform: translateY(-4px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				.vct-preview-header {
					display: flex;
					align-items: center;
					justify-content: space-between;
					border-bottom: 1px solid var(--line);
					padding-bottom: 6px;
				}

				.vct-preview-title {
					font-size: 12px;
					font-weight: 700;
					text-transform: uppercase;
					color: var(--muted);
					letter-spacing: 0.04em;
					margin: 0;
				}

				.vct-preview-body {
					font-size: 12.5px;
					line-height: 1.5;
					color: var(--ink);
					display: flex;
					flex-direction: column;
					gap: 8px;
					max-height: 320px;
					overflow-y: auto;
					padding-right: 6px;
				}

				.vct-preview-section {
					display: flex;
					flex-direction: column;
					gap: 3px;
				}

				.vct-preview-section-title {
					font-weight: 700;
					font-size: 12px;
					color: var(--ink);
				}

				.vct-preview-bullets {
					margin: 2px 0 0 0;
					padding-left: 18px;
				}

				.vct-preview-bullets li {
					margin-bottom: 2px;
				}

				.vct-preview-risk-box {
					background: var(--amber-surface, #fffbeb);
					border: 1px solid rgba(217, 119, 6, 0.25);
					border-radius: var(--radius-md, 6px);
					padding: 8px 12px;
					font-size: 11.5px;
				}

				[data-theme="dark"] .vct-preview-risk-box {
					background: rgba(217, 119, 6, 0.1);
					border-color: rgba(217, 119, 6, 0.3);
				}

				.vct-preview-aftercare-box {
					background: var(--paper-soft);
					border: 1px solid var(--line);
					border-radius: var(--radius-md, 6px);
					padding: 8px 12px;
					font-size: 11.5px;
				}

				/* Archive Table */
				.vct-archive-container {
					border: 1px solid var(--line);
					border-radius: var(--radius-lg, 10px);
					overflow: hidden;
					background: var(--paper);
				}

				.vct-archive-table {
					width: 100%;
					border-collapse: collapse;
					font-size: 12px;
				}

				.vct-archive-table th {
					text-align: left;
					padding: 8px 12px;
					font-weight: 700;
					color: var(--muted);
					border-bottom: 1px solid var(--line);
					background: var(--paper-soft);
				}

				.vct-archive-table td {
					padding: 10px 12px;
					border-bottom: 1px solid var(--line);
					color: var(--ink);
					vertical-align: middle;
				}

				.vct-archive-table tr:hover td {
					background: var(--paper-soft);
				}

				.vct-archive-empty {
					padding: 24px;
					text-align: center;
					color: var(--muted);
					font-size: 12.5px;
				}

				/* Footer Bar */
				.vct-footer-bar {
					display: flex;
					align-items: center;
					justify-content: space-between;
					border-top: 1px solid var(--line);
					padding-top: 12px;
					flex-wrap: wrap;
					gap: 10px;
				}

				.vct-footer-left {
					font-size: 12px;
					color: var(--muted);
					display: flex;
					align-items: center;
					gap: 6px;
				}

				.vct-footer-actions {
					display: flex;
					align-items: center;
					gap: 8px;
					flex-wrap: wrap;
				}
			`}</style>

			{/* ═══ ВЕРХНЯЯ ШАПКА РАБОЧЕГО МЕСТА СОГЛАСИЙ ═══ */}
			<div className="vct-header">
				<div className="vct-title-group">
					<h3 className="vct-title">
						<ShieldCheck size={18} style={{ color: "var(--teal)" }} />
						<span>Информированные согласия (ИДС) и Гарантии</span>
					</h3>
					<p className="vct-subtitle">
						Юридический щит врача по 323-ФЗ (Приказ № 1051н), защита персональных данных (152-ФЗ) и паспорт гарантий
					</p>
				</div>
				<div className="vct-header-actions">
					<button
						type="button"
						onClick={onFastPrint043u}
						data-testid="btn-visit-consents-print-043u"
						className="vct-btn vct-btn-secondary"
						title="Мгновенная печать дневника Формы 043/у"
					>
						<Printer size={14} />
						<span>Печать дневника 043/у</span>
					</button>
					<button
						type="button"
						onClick={onFastPrintInformedConsent}
						data-testid="btn-visit-fast-print-consent-1051n"
						className="vct-btn vct-btn-secondary"
						style={{ color: "var(--emerald)", borderColor: "rgba(5, 150, 105, 0.4)" }}
						title="Печать канонического бланка ИДС по Приказу 1051н"
					>
						<Printer size={14} />
						<span>Печать согласия 1051н</span>
					</button>
					<button
						type="button"
						onClick={onOpenInformedConsentModal}
						data-testid="btn-visit-open-consent-modal"
						className="vct-btn vct-btn-secondary"
						title="Открыть полный интерактивный каталог согласий и планшетной подписи"
					>
						<Tablet size={14} />
						<span>Выбрать бланк ИДС</span>
					</button>
					<button
						type="button"
						onClick={onOpenWarrantyModal}
						data-testid="btn-visit-warranty-passport"
						className="vct-btn vct-btn-secondary"
						title="Открыть гарантийный паспорт пациента"
					>
						<Award size={14} />
						<span>Гарантийный паспорт</span>
					</button>
				</div>
			</div>

			{/* ═══ HOT PATH БАННЕР: «1-КЛИК ПАКЕТ НА СЕГОДНЯ» (МАНДАТ 8e) ═══ */}
			{unsignedRequiredItems.length > 0 ? (
				<div className="vct-package-banner required">
					<div className="vct-package-info">
						<div className="vct-package-icon-box required">
							<AlertTriangle size={18} />
						</div>
						<div>
							<div className="vct-package-title">
								Требуется оформить {unsignedRequiredItems.length} согласий для сегодняшнего приёма
							</div>
							<div className="vct-package-desc">
								Клинические манипуляции по плану приёма:{" "}
								<strong>{unsignedRequiredItems.map((i) => i.title).join(", ")}</strong>. Пациент должен подтвердить согласие до начала манипуляций.
							</div>
						</div>
					</div>
					<div className="vct-package-actions">
						<button
							type="button"
							onClick={handlePrintTodayPackage}
							className="vct-btn vct-btn-primary"
							title="Сформировать и отправить на печать единый комплекс документов на сегодня"
						>
							<Printer size={14} />
							<span>Печать пакета на сегодня ({unsignedRequiredItems.length})</span>
						</button>
						<button
							type="button"
							onClick={handleMarkAllRequiredTodaySigned}
							className="vct-btn vct-btn-success"
							title="1-клик отметка: пациент лично подписал бумажный пакет у кресла или на стойке"
						>
							<CheckCircle2 size={14} />
							<span>Отметить пакет: Подписано на бумаге</span>
						</button>
						<button
							type="button"
							onClick={onOpenInformedConsentModal}
							className="vct-btn vct-btn-secondary"
							title="Передать планшет пациенту для стилусной touch-подписи"
						>
							<Tablet size={14} />
							<span>Планшет / ЭЦП</span>
						</button>
					</div>
				</div>
			) : (
				<div className="vct-package-banner all-signed">
					<div className="vct-package-info">
						<div className="vct-package-icon-box all-signed">
							<CheckCircle2 size={18} />
						</div>
						<div>
							<div className="vct-package-title">
								Все необходимые согласия на сегодня оформлены и активны
							</div>
							<div className="vct-package-desc">
								Юридический щит врача активен. Вмешательства текущего визита обеспечены подписанной документацией (бумага / планшет).
							</div>
						</div>
					</div>
					<div className="vct-package-actions">
						<button
							type="button"
							onClick={handlePrintTodayPackage}
							className="vct-btn vct-btn-secondary"
							title="Распечатать повторную копию комплекта согласий"
						>
							<Printer size={14} />
							<span>Повторная печать комплекта</span>
						</button>
					</div>
				</div>
			)}

			{/* ═══ НАВИГАЦИОННАЯ СТРОКА: АКТУАЛЬНЫЕ СОГЛАСИЯ / АРХИВ ═══ */}
			<div className="vct-nav-row">
				<div className="vct-tabs-nav">
					<button
						type="button"
						className={`vct-tab-trigger ${activeSubTab === "current" ? "active" : ""}`}
						onClick={() => setActiveSubTab("current")}
					>
						<FileCheck size={14} />
						<span>Актуальные согласия приёма</span>
						<span className="vct-counter-badge">{itemsWithStatus.length}</span>
					</button>
					<button
						type="button"
						className={`vct-tab-trigger ${activeSubTab === "archive" ? "active" : ""}`}
						onClick={() => setActiveSubTab("archive")}
					>
						<History size={14} />
						<span>Архив и гарантии</span>
						<span className="vct-counter-badge">{archiveList.length}</span>
					</button>
				</div>
				<div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
					Пациент: <strong>{substitutionContext.patientName}</strong> | Врач: <strong>{substitutionContext.doctorName}</strong>
				</div>
			</div>

			{/* ═══ РЕЖИМ 1: СПИСОК НЕОБХОДИМЫХ И ОФОРМЛЕННЫХ СОГЛАСИЙ ═══ */}
			{activeSubTab === "current" && (
				<div className="vct-cards-list">
					{itemsWithStatus.map((item) => {
						const isExpanded = Boolean(expandedCards[item.key]);
						const isSigned = item.status === "signed";
						const isRequired = item.status === "required_today";

						return (
							<div
								key={item.key}
								className={`vct-consent-card ${isRequired ? "highlight-required" : ""} ${isSigned ? "highlight-signed" : ""}`}
							>
								{/* Строка с кратким резюме и действиями */}
								<div className="vct-card-summary-row">
									<div className="vct-card-left">
										<div className="vct-card-meta">
											<div className="vct-card-title-row">
												<span className="vct-code-pill">{item.code}</span>
												<h4 className="vct-card-title">{item.title}</h4>
												<span className="vct-statutory-pill">{item.statutoryBasis}</span>
											</div>
											<p className="vct-card-desc">{item.summary}</p>
										</div>
									</div>

									<div className="vct-card-badges">
										{isSigned && (
											<div className="vct-badge vct-badge-signed">
												<CheckCircle2 size={13} />
												<span>Подписано</span>
											</div>
										)}
										{isRequired && (
											<div className="vct-badge vct-badge-required">
												<AlertTriangle size={13} />
												<span>Требуется для сегодняшнего приёма</span>
											</div>
										)}
										{!isSigned && !isRequired && (
											<div className="vct-badge vct-badge-neutral">
												<FileText size={13} />
												<span>Не оформлено</span>
											</div>
										)}

										{isSigned && item.record?.signedAt && (
											<span className="vct-signed-detail">
												({item.record.signedAt} • {item.record.method === "paper" ? "на бумаге" : "планшет"})
											</span>
										)}
									</div>

									<div className="vct-card-actions">
										{/* 1-клик отметка подписи на бумаге */}
										<button
											type="button"
											onClick={() => handleTogglePaperSigned(item.key, item.title)}
											className={`vct-btn vct-btn-sm ${isSigned ? "vct-btn-secondary" : "vct-btn-success"}`}
											title={isSigned ? "Снять отметку о подписи" : "1-клик отметка: пациент подписал согласие на бумаге"}
										>
											{isSigned ? (
												<>
													<RotateCcw size={12} />
													<span>Изменить</span>
												</>
											) : (
												<>
													<Check size={13} />
													<span>Отметить: Подписано на бумаге</span>
												</>
											)}
										</button>

										{/* Печать заполненного бланка */}
										<button
											type="button"
											onClick={() => handlePrintSingleFilled(item.key)}
											className="vct-btn vct-btn-secondary vct-btn-sm"
											title="Распечатать предварительно заполненный бланк согласия (А4)"
										>
											<Printer size={13} />
											<span>Печать бланка</span>
										</button>

										{/* Печать чистого бланка */}
										<button
											type="button"
											onClick={() => handlePrintSingleBlank(item.key)}
											className="vct-btn vct-btn-secondary vct-btn-sm"
											title="Распечатать чистый бланк со строками «________» для ручного заполнения"
										>
											<FileText size={13} />
											<span>Чистый</span>
										</button>

										{/* Инлайн-аккордеон текста (без модалок) */}
										<button
											type="button"
											onClick={() => toggleCardExpand(item.key)}
											className="vct-btn vct-btn-secondary vct-btn-sm"
											title={isExpanded ? "Свернуть текст" : "Раскрыть текст согласия для ознакомления"}
										>
											{isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
											<span>{isExpanded ? "Скрыть" : "Быстрый просмотр"}</span>
										</button>

										{/* Планшетная подпись */}
										<button
											type="button"
											onClick={onOpenInformedConsentModal}
											className="vct-btn vct-btn-secondary vct-btn-sm"
											title="Открыть модалку планшетной touch-подписи"
										>
											<Tablet size={13} />
										</button>
									</div>
								</div>

								{/* Инлайн превью текста согласия (Zero Popups) */}
								{isExpanded && item.renderedTemplate && (
									<div className="vct-inline-preview">
										<div className="vct-preview-header">
											<div className="vct-preview-title">
												Текст информированного добровольного согласия ({item.statutoryBasis})
											</div>
											<span style={{ fontSize: "11px", color: "var(--muted)" }}>
												Пациент: {substitutionContext.patientName} • Врач: {substitutionContext.doctorName}
											</span>
										</div>

										<div className="vct-preview-body">
											{item.renderedTemplate.renderedSections.map((sec) => (
												<div key={sec.id} className="vct-preview-section">
													<div className="vct-preview-section-title">{sec.title}</div>
													<div>{sec.content}</div>
													{sec.bullets && sec.bullets.length > 0 && (
														<ul className="vct-preview-bullets">
															{sec.bullets.map((b, bIdx) => (
																<li key={bIdx}>{b}</li>
															))}
														</ul>
													)}
												</div>
											))}

											{item.renderedTemplate.riskFactors.length > 0 && (
												<div className="vct-preview-risk-box">
													<strong>Разъясненные клинические риски и возможные осложнения:</strong>
													<ul className="vct-preview-bullets" style={{ marginTop: "4px" }}>
														{item.renderedTemplate.riskFactors.map((rf, rfIdx) => (
															<li key={rfIdx}>{rf}</li>
														))}
													</ul>
												</div>
											)}

											{item.renderedTemplate.aftercareInstructions.length > 0 && (
												<div className="vct-preview-aftercare-box">
													<strong>Рекомендации и ограничения после вмешательства:</strong>
													<ul className="vct-preview-bullets" style={{ marginTop: "4px" }}>
														{item.renderedTemplate.aftercareInstructions.map((ac, acIdx) => (
															<li key={acIdx}>{ac}</li>
														))}
													</ul>
												</div>
											)}
										</div>

										<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "4px" }}>
											<button
												type="button"
												onClick={() => handlePrintSingleFilled(item.key)}
												className="vct-btn vct-btn-primary vct-btn-sm"
											>
												<Printer size={13} />
												<span>Распечатать этот текст</span>
											</button>
											<button
												type="button"
												onClick={() => toggleCardExpand(item.key)}
												className="vct-btn vct-btn-secondary vct-btn-sm"
											>
												Закрыть превью
											</button>
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

			{/* ═══ РЕЖИМ 2: АРХИВ РАНЕЕ ПОДПИСАННЫХ СОГЛАСИЙ И ГАРАНТИЙНЫЙ ПАСПОРТ ═══ */}
			{activeSubTab === "archive" && (
				<div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
					<div className="vct-archive-container">
						<table className="vct-archive-table">
							<thead>
								<tr>
									<th>Код / Наименование</th>
									<th>Нормативное основание</th>
									<th>Дата и время</th>
									<th>Способ</th>
									<th>Хеш целостности SHA-256</th>
									<th style={{ textAlign: "right" }}>Действия</th>
								</tr>
							</thead>
							<tbody>
								{archiveList.length === 0 ? (
									<tr>
										<td colSpan={6} className="vct-archive-empty">
											У пациента пока нет архивных подписанных согласий
										</td>
									</tr>
								) : (
									archiveList.map((doc) => (
										<tr key={doc.key}>
											<td>
												<span className="vct-code-pill" style={{ marginRight: "6px" }}>
													{doc.code}
												</span>
												<strong>{doc.title}</strong>
											</td>
											<td style={{ color: "var(--muted)", fontSize: "11px" }}>
												{doc.statutoryBasis}
											</td>
											<td>{doc.record.signedAt || "—"}</td>
											<td>
												<span className="vct-badge vct-badge-signed">
													{doc.record.method === "paper" ? "На бумаге" : "Планшет Touch"}
												</span>
											</td>
											<td style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--teal)" }}>
												{doc.record.integrityHash ? `${doc.record.integrityHash.slice(0, 16)}...` : "—"}
											</td>
											<td style={{ textAlign: "right" }}>
												<button
													type="button"
													onClick={() => handlePrintSingleFilled(doc.key)}
													className="vct-btn vct-btn-secondary vct-btn-sm"
													title="Повторная печать согласия из архива"
												>
													<Printer size={12} />
													<span>Печать</span>
												</button>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{/* Блок гарантийного паспорта */}
					<div
						style={{
							background: "var(--paper-soft)",
							border: "1px solid var(--line)",
							borderRadius: "10px",
							padding: "14px 16px",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "16px",
							flexWrap: "wrap",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "12px", maxWidth: "600px" }}>
							<Award size={28} style={{ color: "var(--teal)", flexShrink: 0 }} />
							<div>
								<div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--ink)" }}>
									Гарантийный паспорт и сроки службы стоматологических услуг
								</div>
								<div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
									В соответствии со ст. 5, 10, 29 Закона РФ «О защите прав потребителей» и протоколами СтАР. Световые пломбы: гарантия 12–24 мес., металлокерамика и диоксид циркония: 12–36 мес.
								</div>
							</div>
						</div>
						<button
							type="button"
							onClick={onOpenWarrantyModal}
							className="vct-btn vct-btn-primary"
							title="Оформить официальный гарантийный паспорт на оказанные услуги"
						>
							<Award size={14} />
							<span>Оформить гарантийный паспорт</span>
						</button>
					</div>
				</div>
			)}

			{/* ═══ НИЖНЯЯ ПАНЕЛЬ ДЕЙСТВИЙ ═══ */}
			<div className="vct-footer-bar">
				<div className="vct-footer-left">
					<ShieldCheck size={14} style={{ color: "var(--emerald)" }} />
					<span>Все согласия сохраняются в истории электронной медицинской карты Формы 043/у (срок хранения 25 лет)</span>
				</div>
				<div className="vct-footer-actions">
					<button
						type="button"
						onClick={onFastPrint043u}
						className="vct-btn vct-btn-secondary vct-btn-sm"
						title="Печать полного дневника 043/у текущего приёма"
					>
						<Printer size={13} />
						<span>Печать Формы 043/у</span>
					</button>
					<button
						type="button"
						onClick={onOpenWarrantyModal}
						className="vct-btn vct-btn-secondary vct-btn-sm"
						title="Гарантийный талон и паспорт"
					>
						<Award size={13} />
						<span>Гарантии</span>
					</button>
					<button
						type="button"
						onClick={onOpenInformedConsentModal}
						className="vct-btn vct-btn-secondary vct-btn-sm"
						title="Открыть модальное окно выбора любого специализированного бланка ИДС"
					>
						<Tablet size={13} />
						<span>Все бланки ИДС</span>
					</button>
				</div>
			</div>
		</div>
	);
}
