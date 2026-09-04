/**
 * ============================================================================
 * DMS INSURANCE CASE MANAGER & PRE-AUTH STUDIO (MODAL HUD)
 * Интерактивный пульт управления договорами ДМС, гарантийными письмами,
 * согласованием услуг (Pre-Auth), сплит-оплатой и реестрами по Приказу № 804н.
 * ============================================================================
 */

import React, { useMemo, useState } from "react";
import {
	AlertCircle,
	AlertTriangle,
	Building2,
	Calendar,
	CheckCircle2,
	CreditCard,
	Download,
	Eye,
	FileSpreadsheet,
	FileText,
	Filter,
	Layers,
	Plus,
	Printer,
	RefreshCw,
	Search,
	ShieldCheck,
	UserCheck,
	X,
	XCircle,
	Zap,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import "./dmsInsurance.css";
import {
	calculateDmsSplitInvoice,
	type ClinicLegalInfo,
	DEFAULT_CLINIC_LEGAL_INFO,
	type DmsBillItemInput,
	type DmsRegistryVisitServiceItem,
	exportRegistryToCsv,
	formatKopecks,
	generateBilateralAcceptanceActHtml,
	generateDmsPreAuthRequest,
	generateDmsStatutoryRegistry,
	kopecksToRub,
	rubToKopecks,
	verifyServiceForDms,
} from "./dmsInsuranceEngine";
import {
	type DmsGuaranteeLetterRecord,
	type DmsGuaranteeLetterStatus,
	type DmsInsurerId,
	type DmsPreAuthApprovalStatus,
	type DmsProgramKey,
	getStatutoryInsurerById,
	SAMPLE_DMS_GUARANTEE_LETTERS,
	STATUTORY_804N_NOMENCLATURE,
	STATUTORY_DMS_INSURERS,
	STATUTORY_DMS_PROGRAMS,
} from "./dmsInsurancePresets";

export type DmsManagerTab = "letters" | "preauth" | "split" | "registry";

export interface DmsInsuranceManagerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: DmsManagerTab | undefined;
	readonly clinicInfo?: ClinicLegalInfo | undefined;
	readonly patientContext?: {
		readonly id: string;
		readonly fullName: string;
		readonly policyNumber?: string | undefined;
		readonly insurerId?: DmsInsurerId | undefined;
		readonly programKey?: DmsProgramKey | undefined;
	} | undefined;
}

export const DmsInsuranceManagerModal: React.FC<DmsInsuranceManagerModalProps> = ({
	isOpen,
	onClose,
	initialTab = "letters",
	clinicInfo = DEFAULT_CLINIC_LEGAL_INFO,
	patientContext,
}) => {
	const [activeTab, setActiveTab] = useState<DmsManagerTab>(initialTab);

	// 1. Состояние гарантийных писем
	const [letters, setLetters] = useState<readonly DmsGuaranteeLetterRecord[]>(
		SAMPLE_DMS_GUARANTEE_LETTERS,
	);
	const [letterSearchQuery, setLetterSearchQuery] = useState("");
	const [letterInsurerFilter, setLetterInsurerFilter] = useState<string>("all");
	const [letterStatusFilter, setLetterStatusFilter] = useState<string>("all");

	// Форма добавления нового ГП
	const [isAddingLetter, setIsAddingLetter] = useState(false);
	const [newLetterNumber, setNewLetterNumber] = useState("");
	const [newLetterInsurerId, setNewLetterInsurerId] = useState<DmsInsurerId>("sogaz");
	const [newLetterPatientName, setNewLetterPatientName] = useState(
		patientContext?.fullName ?? "",
	);
	const [newLetterPolicyNumber, setNewLetterPolicyNumber] = useState(
		patientContext?.policyNumber ?? "",
	);
	const [newLetterProgramKey, setNewLetterProgramKey] =
		useState<DmsProgramKey>("standard_therapy");
	const [newLetterLimitRub, setNewLetterLimitRub] = useState<number>(50000);
	const [newLetterValidUntil, setNewLetterValidUntil] = useState("2026-12-31");
	const [newLetterTeeth, setNewLetterTeeth] = useState("1.6, 2.6");
	const [newLetterDiagnosis, setNewLetterDiagnosis] = useState("K04.0");
	const [newLetterCodes, setNewLetterCodes] = useState(
		"A16.07.002.001, A16.07.030.001, A16.07.008.002",
	);

	// 2. Состояние Pre-Auth Studio (Согласование услуг)
	const [preAuthPatientName, setPreAuthPatientName] = useState(
		patientContext?.fullName ?? "Иванов Сергей Александрович",
	);
	const [preAuthPolicyNumber, setPreAuthPolicyNumber] = useState(
		patientContext?.policyNumber ?? "СГЗ-77-991283",
	);
	const [preAuthInsurerId, setPreAuthInsurerId] = useState<DmsInsurerId>(
		patientContext?.insurerId ?? "sogaz",
	);
	const [preAuthProgramKey, setPreAuthProgramKey] = useState<DmsProgramKey>(
		patientContext?.programKey ?? "standard_therapy",
	);
	const [preAuthTooth, setPreAuthTooth] = useState("1.6");
	const [preAuthDiagnosisCode, setPreAuthDiagnosisCode] = useState("K04.0");
	const [preAuthDiagnosisTitle, setPreAuthDiagnosisTitle] = useState(
		"Пульпит зуба (острый очаговый / необратимый)",
	);
	const [preAuthServiceCode, setPreAuthServiceCode] = useState("A16.07.030.001");
	const [preAuthClinicalNotes, setPreAuthClinicalNotes] = useState(
		"Жалобы на самопроизвольные ночные боли в области 1.6. Зондирование болезненно, ЭОД 35 мкА. Перкуссия слабоположительная.",
	);
	const [preAuthAttachingXray, setPreAuthAttachingXray] = useState(true);
	const [preAuthOverrideStatus, setPreAuthOverrideStatus] =
		useState<DmsPreAuthApprovalStatus | null>(null);

	// 3. Состояние Сплит-оплаты (Split Billing)
	const [splitItems, setSplitItems] = useState<readonly DmsBillItemInput[]>([
		{
			id: "item-1",
			serviceCode804n: "A16.07.002.001",
			serviceName: "Восстановление зуба пломбой светоотверждаемой (кариес)",
			toothNumber: "1.6",
			quantity: 1,
			unitPriceKopecks: 380000,
		},
		{
			id: "item-2",
			serviceCode804n: "A16.07.030.001",
			serviceName: "Инструментальная и медикаментозная обработка корневого канала",
			toothNumber: "1.6",
			quantity: 3,
			unitPriceKopecks: 210000,
		},
		{
			id: "item-3",
			serviceCode804n: "A11.07.010",
			serviceName: "Анестезия инфильтрационная / проводниковая",
			toothNumber: "1.6",
			quantity: 1,
			unitPriceKopecks: 95000,
		},
		{
			id: "item-4",
			serviceCode804n: "A16.07.050",
			serviceName: "Клиническое фотоотбеливание Zoom 4 (Исключение ДМС)",
			quantity: 1,
			unitPriceKopecks: 2600000,
		},
	]);
	const [selectedLetterIdForSplit, setSelectedLetterIdForSplit] =
		useState<string>("gl-sogaz-001");
	const [splitFranchisePct, setSplitFranchisePct] = useState<number>(0);
	const [splitFixedFranchiseRub, setSplitFixedFranchiseRub] = useState<number>(0);

	// 4. Состояние Реестров ДМС
	const [registryPeriodStart, setRegistryPeriodStart] = useState("2026-08-01");
	const [registryPeriodEnd, setRegistryPeriodEnd] = useState("2026-08-31");
	const [registryInsurerId, setRegistryInsurerId] =
		useState<DmsInsurerId>("sogaz");

	const sampleRegistryVisits: readonly DmsRegistryVisitServiceItem[] = useMemo(
		() => [
			{
				visitId: "v-8801",
				visitDate: "2026-08-05",
				patientFullName: "Иванов Сергей Александрович",
				policyNumber: "СГЗ-77-991283",
				guaranteeLetterNumber: "ГП-СОГАЗ-2026-8812",
				diagnosisMkb10: "K04.0",
				toothNumber: "1.6",
				serviceCode804n: "A16.07.030.001",
				serviceName: "Инструментальная и медикаментозная обработка корневого канала",
				doctorFullName: "Д-р Смирнов К.В.",
				quantity: 3,
				unitPriceKopecks: 210000,
				totalBillKopecks: 630000,
				dmsAcceptedKopecks: 630000,
				patientPaidKopecks: 0,
			},
			{
				visitId: "v-8802",
				visitDate: "2026-08-05",
				patientFullName: "Иванов Сергей Александрович",
				policyNumber: "СГЗ-77-991283",
				guaranteeLetterNumber: "ГП-СОГАЗ-2026-8812",
				diagnosisMkb10: "K04.0",
				toothNumber: "1.6",
				serviceCode804n: "A11.07.010",
				serviceName: "Инъекционное введение анестетика",
				doctorFullName: "Д-р Смирнов К.В.",
				quantity: 1,
				unitPriceKopecks: 95000,
				totalBillKopecks: 95000,
				dmsAcceptedKopecks: 95000,
				patientPaidKopecks: 0,
			},
			{
				visitId: "v-8803",
				visitDate: "2026-08-12",
				patientFullName: "Кузнецова Ольга Дмитриевна",
				policyNumber: "ИНГ-902-11487",
				guaranteeLetterNumber: "ИНГОС-МЕД-26-44091",
				diagnosisMkb10: "K01.1",
				toothNumber: "3.8",
				serviceCode804n: "A16.07.001.002",
				serviceName: "Удаление ретинированного зуба мудрости",
				doctorFullName: "Д-р Васильев А.А.",
				quantity: 1,
				unitPriceKopecks: 850000,
				totalBillKopecks: 850000,
				dmsAcceptedKopecks: 850000,
				patientPaidKopecks: 0,
			},
			{
				visitId: "v-8804",
				visitDate: "2026-08-15",
				patientFullName: "Петров Василий Николаевич",
				policyNumber: "РЕСО-994-0012",
				diagnosisMkb10: "K02.1",
				toothNumber: "2.1",
				serviceCode804n: "A16.07.002.001",
				serviceName: "Восстановление зуба светоотверждаемой пломбой",
				doctorFullName: "Д-р Смирнов К.В.",
				quantity: 1,
				unitPriceKopecks: 380000,
				totalBillKopecks: 380000,
				dmsAcceptedKopecks: 380000,
				patientPaidKopecks: 0,
			},
		],
		[],
	);

	// Фильтрация гарантийных писем
	const filteredLetters = useMemo(() => {
		return letters.filter((letter) => {
			if (
				letterInsurerFilter !== "all" &&
				letter.insurerId !== letterInsurerFilter
			) {
				return false;
			}
			if (letterStatusFilter !== "all" && letter.status !== letterStatusFilter) {
				return false;
			}
			if (letterSearchQuery.trim()) {
				const q = letterSearchQuery.toLowerCase();
				const matchName = letter.patientFullName.toLowerCase().includes(q);
				const matchNum = letter.letterNumber.toLowerCase().includes(q);
				const matchPol = letter.policyNumber.toLowerCase().includes(q);
				if (!matchName && !matchNum && !matchPol) return false;
			}
			return true;
		});
	}, [letters, letterInsurerFilter, letterStatusFilter, letterSearchQuery]);

	// Активное гарантийное письмо для сплит-расчета
	const activeSelectedLetter = useMemo(() => {
		return letters.find((l) => l.id === selectedLetterIdForSplit) ?? null;
	}, [letters, selectedLetterIdForSplit]);

	// Автоматический расчет сплита для вкладки 3
	const splitSummary = useMemo(() => {
		return calculateDmsSplitInvoice(
			splitItems,
			patientContext?.programKey ?? "standard_therapy",
			activeSelectedLetter,
			{
				franchisePercent: splitFranchisePct,
				franchiseFixedKopecks: rubToKopecks(splitFixedFranchiseRub),
			},
		);
	}, [
		splitItems,
		patientContext?.programKey,
		activeSelectedLetter,
		splitFranchisePct,
		splitFixedFranchiseRub,
	]);

	// Автоматическая верификация для вкладки 2 (Pre-Auth)
	const selectedNomenclatureItem = useMemo(() => {
		return STATUTORY_804N_NOMENCLATURE.find(
			(n) => n.code === preAuthServiceCode,
		);
	}, [preAuthServiceCode]);

	const preAuthVerification = useMemo(() => {
		const matchingLetter =
			letters.find(
				(l) =>
					l.patientFullName.toLowerCase() ===
						preAuthPatientName.toLowerCase() && l.status === "active",
			) ?? null;

		const res = verifyServiceForDms({
			serviceCode804n: preAuthServiceCode,
			serviceName:
				selectedNomenclatureItem?.name ?? "Медицинская услуга стоматологии",
			toothNumber: preAuthTooth,
			programKey: preAuthProgramKey,
			guaranteeLetter: matchingLetter,
			requestedPriceKopecks:
				selectedNomenclatureItem?.defaultPriceKopecks ?? 350000,
		});

		if (preAuthOverrideStatus) {
			const labelMap: Record<DmsPreAuthApprovalStatus, string> = {
				approved: "Согласовано",
				pending_preauth: "На рассмотрении",
				rejected_exclusion: "Отказ страховой",
				limit_exceeded: "Превышен лимит",
				requires_letter: "Требуется гарантийное письмо",
			};
			return {
				...res,
				status: preAuthOverrideStatus,
				statusLabel: labelMap[preAuthOverrideStatus],
				isCovered: preAuthOverrideStatus === "approved",
			};
		}

		return res;
	}, [
		preAuthServiceCode,
		selectedNomenclatureItem,
		preAuthTooth,
		preAuthProgramKey,
		preAuthPatientName,
		letters,
		preAuthOverrideStatus,
	]);

	// Сгенерированный реестр для вкладки 4
	const statutoryRegistry = useMemo(() => {
		return generateDmsStatutoryRegistry({
			registryNumber: `РЕЕСТР-2026-08-${registryInsurerId.toUpperCase().slice(0, 4)}`,
			periodStart: registryPeriodStart,
			periodEnd: registryPeriodEnd,
			insurerId: registryInsurerId,
			clinicInfo,
			visitServices: sampleRegistryVisits.filter((v) => {
				if (registryInsurerId === "sogaz")
					return v.policyNumber.startsWith("СГЗ");
				if (registryInsurerId === "ingosstrakh")
					return v.policyNumber.startsWith("ИНГ");
				if (registryInsurerId === "reso_garantiya")
					return v.policyNumber.startsWith("РЕСО");
				return true;
			}),
		});
	}, [
		registryPeriodStart,
		registryPeriodEnd,
		registryInsurerId,
		clinicInfo,
		sampleRegistryVisits,
	]);

	if (!isOpen) return null;

	// Обработчики действий
	const handleActivateEmergencyLetter = () => {
		const targetInsurerId = newLetterInsurerId || (patientContext?.insurerId as DmsInsurerId) || "sogaz";
		const insMeta = getStatutoryInsurerById(targetInsurerId);
		const emergencyLetterRecord: DmsGuaranteeLetterRecord = {
			id: `gl-emergency-${Date.now()}`,
			letterNumber: `ГП-ЭКСТРЕННО-${Date.now().toString().slice(-6)} (ДОСЫЛКА)`,
			insurerId: targetInsurerId,
			insurerName: insMeta?.shortName ?? "АО «СОГАЗ»",
			patientId: patientContext?.id ?? `pat-emergency-${Date.now()}`,
			patientFullName: patientContext?.fullName || newLetterPatientName || "Пациент с острой болью",
			policyNumber: patientContext?.policyNumber || newLetterPolicyNumber || "ПОЛИС-ДМС-ОСТРАЯ-БОЛЬ",
			programKey: "economy_emergency_only",
			issueDate: new Date().toISOString().slice(0, 10),
			validUntil: "2026-12-31",
			totalLimitKopecks: rubToKopecks(50000),
			usedAmountKopecks: 0,
			approvedNomenclatureCodes: [
				"A16.07.030.001", // Депульпирование
				"A11.07.010", // Анестезия
				"A16.07.011", // Вскрытие абсцесса
				"A16.07.008.001", // Пломбирование канала / временная повязка
				"A16.07.002.001", // Пломба светоотверждаемая
				"B01.003.004.001", // Первичный прием по острой боли
			],
			approvedTeeth: ["Все"],
			diagnosisMkb10: ["K04.0", "K04.4", "K04.6"],
			status: "active",
			curatorFullName: "Временное согласование по острой боли (досылка ГП)",
			curatorPhone: insMeta?.phone ?? "8 (800) 000-00-00",
			curatorEmail: insMeta?.email ?? "dms-urgent@clinic.ru",
			attachedXrayUris: [],
			notes: "⚡ Экстренная помощь по острой боли. Гарантийное письмо будет дослано страховой компанией. Временное согласование неотложных манипуляций (депульпирование, анестезия, вскрытие абсцесса) без блокировки кассы или приёма (Мандат 8e).",
		};

		setLetters((prev) => [emergencyLetterRecord, ...prev]);
		setSelectedLetterIdForSplit(emergencyLetterRecord.id);

		// Также сразу настраиваем Pre-Auth Studio
		setPreAuthDiagnosisCode("K04.0");
		setPreAuthDiagnosisTitle("Пульпит зуба (острый очаговый / острая боль)");
		setPreAuthServiceCode("A16.07.030.001");
		setPreAuthClinicalNotes(
			"⚡ ОСТРАЯ БОЛЬ. Неотложные манипуляции: анестезия, депульпирование зуба, купирование болевого синдрома. Гарантийное письмо будет дослано страховой компанией. Согласно Мандату 8e приём и касса 54-ФЗ не блокируются.",
		);
		setPreAuthOverrideStatus("approved");

		showToast(
			`⚡ Временное согласование по острой боли № ${emergencyLetterRecord.letterNumber} создано! Приём врача и касса 54-ФЗ разблокированы.`,
			"success",
		);
	};

	const handleActivateEmergencyPreAuth = () => {
		setPreAuthDiagnosisCode("K04.0");
		setPreAuthDiagnosisTitle("Пульпит зуба (острый очаговый / острая боль)");
		setPreAuthServiceCode("A16.07.030.001");
		setPreAuthClinicalNotes(
			"⚡ ОСТРАЯ БОЛЬ. Неотложные манипуляции: анестезия, депульпирование зуба, купирование болевого синдрома. Гарантийное письмо будет дослано страховой компанией. Согласно Мандату 8e приём и касса 54-ФЗ не блокируются.",
		);
		setPreAuthOverrideStatus("approved");

		// Гарантируем, что активное письмо по острой боли создано и доступно
		const hasEmergencyLetter = letters.some((l) => l.letterNumber.includes("ЭКСТРЕННО") && l.status === "active");
		if (!hasEmergencyLetter) {
			handleActivateEmergencyLetter();
		} else {
			showToast("⚡ 1-Клик: Временное согласование по острой боли установлено! Приём и касса разблокированы.", "success");
		}
	};

	const handleCreateNewLetter = (e: React.FormEvent) => {
		e.preventDefault();
		// Мандат 8e: если номер письма не введен, генерируем временный номер досылки без блокировки
		const resolvedLetterNumber =
			newLetterNumber.trim() || `ГП-ДОСЫЛКА-${Date.now().toString().slice(-6)}`;
		const resolvedPatientName =
			newLetterPatientName.trim() || patientContext?.fullName || "Пациент";

		const insMeta = getStatutoryInsurerById(newLetterInsurerId);
		const newLetterRecord: DmsGuaranteeLetterRecord = {
			id: `gl-custom-${Date.now()}`,
			letterNumber: resolvedLetterNumber,
			insurerId: newLetterInsurerId,
			insurerName: insMeta?.shortName ?? "АО «СОГАЗ»",
			patientId: `pat-${Date.now()}`,
			patientFullName: resolvedPatientName,
			policyNumber: newLetterPolicyNumber || "ПОЛИС-ДМС-2026",
			programKey: newLetterProgramKey,
			issueDate: new Date().toISOString().slice(0, 10),
			validUntil: newLetterValidUntil,
			totalLimitKopecks: rubToKopecks(newLetterLimitRub > 0 ? newLetterLimitRub : 50000),
			usedAmountKopecks: 0,
			approvedNomenclatureCodes: newLetterCodes
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean),
			approvedTeeth: newLetterTeeth
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean),
			diagnosisMkb10: [newLetterDiagnosis.trim() || "K04.0"],
			status: "active",
			curatorFullName: "Дежурный эксперт ДМС",
			curatorPhone: insMeta?.phone ?? "8 (800) 000-00-00",
			curatorEmail: insMeta?.email ?? "dms@insurer.ru",
			attachedXrayUris: [],
			notes: "Зарегистрировано администратором клиники (без блокировок).",
		};

		setLetters((prev) => [newLetterRecord, ...prev]);
		setIsAddingLetter(false);
		setNewLetterNumber("");
		showToast(`Гарантийное письмо № ${newLetterRecord.letterNumber} зарегистрировано`, "success");
	};

	const handlePrintPreAuthRequest = () => {
		const doc = generateDmsPreAuthRequest({
			clinicInfo,
			insurerId: preAuthInsurerId,
			patient: {
				id: patientContext?.id ?? "pat-demo",
				fullName: preAuthPatientName,
				policyNumber: preAuthPolicyNumber,
				phone: "+7 (999) 000-00-00",
			},
			programKey: preAuthProgramKey,
			diagnosisMkb10: {
				code: preAuthDiagnosisCode,
				title: preAuthDiagnosisTitle,
			},
			toothNumber: preAuthTooth,
			requestedServices: [
				{
					code804n: preAuthServiceCode,
					name:
						selectedNomenclatureItem?.name ??
						"Медицинская стоматологическая услуга",
					quantity: 1,
					priceKopecks:
						selectedNomenclatureItem?.defaultPriceKopecks ?? 350000,
				},
			],
			clinicalJustification: preAuthClinicalNotes,
			attachedXrayStudies: preAuthAttachingXray
				? [
						{
							id: "xr-1",
							type: "periapical",
							title: `Прицельный радиовизиографический снимок зуба ${preAuthTooth}`,
							date: new Date().toLocaleDateString("ru-RU"),
						},
					]
				: [],
			attendingDoctor: {
				fullName: clinicInfo.chiefDoctorFullName,
				specialty: "Врач-стоматолог-терапевт",
				signatureDate: new Date().toLocaleDateString("ru-RU"),
			},
		});

		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.write(doc.printableHtml);
			printWindow.document.close();
			printWindow.focus();
			printWindow.print();
		}
	};

	const handleDownloadRegistryCsv = () => {
		const csvContent = exportRegistryToCsv(statutoryRegistry);
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			`Реестр_ДМС_${statutoryRegistry.registryNumber}.csv`,
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handlePrintAcceptanceAct = () => {
		const actHtml = generateBilateralAcceptanceActHtml(
			statutoryRegistry,
			clinicInfo,
		);
		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.write(actHtml);
			printWindow.document.close();
			printWindow.focus();
			printWindow.print();
		}
	};

	return (
		<div className="dms-manager-backdrop" onClick={onClose}>
			<div
				className="dms-manager-modal"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
			>
				{/* Шапка модального окна */}
				<div className="dms-manager-header">
					<div className="dms-manager-title-row">
						<ShieldCheck size={26} color="var(--teal, #0284c7)" />
						<div>
							<h2 className="dms-manager-title">
								ДМС Case Manager & Pre-Authorization Studio
							</h2>
							<div
								style={{
									fontSize: "0.75rem",
									color: "var(--muted, #64748b)",
									marginTop: 2,
								}}
							>
								Регламент ДМС-2026 | Номенклатура Минздрава РФ № 804н | Копеечный
								сплит-баланс
							</div>
						</div>
						<span className="dms-manager-badge-top">ДМС / РФ</span>
					</div>
					<button
						className="dms-manager-close-btn"
						onClick={onClose}
						aria-label="Закрыть окно"
					>
						<X size={20} />
					</button>
				</div>

				{/* Навигация по вкладкам (Touch Targets >= 44px) */}
				<div className="dms-manager-tabs">
					<button
						className={`dms-tab-btn ${activeTab === "letters" ? "dms-tab-btn--active" : ""}`}
						onClick={() => setActiveTab("letters")}
					>
						<FileText size={18} />
						1. Гарантийные письма
					</button>
					<button
						className={`dms-tab-btn ${activeTab === "preauth" ? "dms-tab-btn--active" : ""}`}
						onClick={() => setActiveTab("preauth")}
					>
						<ShieldCheck size={18} />
						2. Согласование услуг (Pre-Auth)
					</button>
					<button
						className={`dms-tab-btn ${activeTab === "split" ? "dms-tab-btn--active" : ""}`}
						onClick={() => setActiveTab("split")}
					>
						<CreditCard size={18} />
						3. Сплит-оплата (Касса)
					</button>
					<button
						className={`dms-tab-btn ${activeTab === "registry" ? "dms-tab-btn--active" : ""}`}
						onClick={() => setActiveTab("registry")}
					>
						<FileSpreadsheet size={18} />
						4. Реестры и Акты 804н
					</button>
				</div>

				{/* Тело активной вкладки */}
				<div className="dms-manager-body">
					{/* =========================================================
					    ВКЛАДКА 1: ГАРАНТИЙНЫЕ ПИСЬМА
					   ========================================================= */}
					{activeTab === "letters" && (
						<>
							{/* ⚡ 1-КЛИК: ЭКСТРЕННАЯ ПОМОЩЬ ПО ОСТРОЙ БОЛИ (МАНДАТ 8e) */}
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: 12,
									background:
										"linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)",
									border: "1.5px solid rgba(239, 68, 68, 0.35)",
									borderRadius: 12,
									padding: "12px 16px",
									flexWrap: "wrap",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 10,
										flex: 1,
										minWidth: 260,
									}}
								>
									<Zap size={22} color="#ef4444" style={{ flexShrink: 0 }} />
									<div>
										<div
											style={{
												fontWeight: 700,
												fontSize: "0.875rem",
												color: "var(--ink, #0f172a)",
											}}
										>
											⚡ 1-Клик: Экстренная помощь по острой боли (письмо будет дослано страховой)
										</div>
										<div
											style={{
												fontSize: "0.75rem",
												color: "var(--muted, #64748b)",
												marginTop: 2,
											}}
										>
											Мандат 8e: немедленная разблокировка приёма, депульпирования, анестезии и кассы 54-ФЗ с временным номером согласования
										</div>
									</div>
								</div>
								<button
									type="button"
									className="dms-btn-action"
									style={{
										background: "#ef4444",
										color: "#ffffff",
										border: "none",
										fontWeight: 700,
										padding: "10px 18px",
										minHeight: 44,
										borderRadius: 8,
										cursor: "pointer",
										display: "inline-flex",
										alignItems: "center",
										gap: 8,
									}}
									onClick={handleActivateEmergencyLetter}
								>
									<Zap size={16} />
									⚡ Активировать по острой боли
								</button>
							</div>

							{/* Панель фильтров и добавления */}
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: 12,
									flexWrap: "wrap",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 10,
										flex: 1,
										minWidth: 280,
									}}
								>
									<div
										style={{
											position: "relative",
											flex: 1,
											display: "flex",
											alignItems: "center",
										}}
									>
										<Search
											size={16}
											style={{
												position: "absolute",
												left: 12,
												color: "var(--muted)",
											}}
										/>
										<input
											type="text"
											className="dms-input"
											style={{ paddingLeft: 36, width: "100%" }}
											placeholder="Поиск по пациенту, номеру ГП или полису..."
											value={letterSearchQuery}
											onChange={(e) => setLetterSearchQuery(e.target.value)}
										/>
									</div>
									<select
										className="dms-select"
										value={letterInsurerFilter}
										onChange={(e) => setLetterInsurerFilter(e.target.value)}
									>
										<option value="all">Все страховые компании</option>
										{STATUTORY_DMS_INSURERS.map((ins) => (
											<option key={ins.id} value={ins.id}>
												{ins.shortName}
											</option>
										))}
									</select>
									<select
										className="dms-select"
										value={letterStatusFilter}
										onChange={(e) => setLetterStatusFilter(e.target.value)}
									>
										<option value="all">Все статусы</option>
										<option value="active">Активные</option>
										<option value="exhausted">Исчерпан лимит</option>
										<option value="expired">Просроченные</option>
									</select>
								</div>
								<button
									className="dms-btn-action dms-btn-primary"
									onClick={() => setIsAddingLetter(!isAddingLetter)}
								>
									<Plus size={18} />
									Добавить гарантийное письмо
								</button>
							</div>

							{/* Форма добавления нового письма */}
							{isAddingLetter && (
								<form
									onSubmit={handleCreateNewLetter}
									style={{
										background: "var(--surface, #f8fafc)",
										border: "1px solid var(--line, #e2e8f0)",
										borderRadius: 14,
										padding: 16,
										display: "flex",
										flexDirection: "column",
										gap: 14,
									}}
								>
									<div
										style={{
											fontWeight: 700,
											fontSize: "0.9375rem",
											display: "flex",
											alignItems: "center",
											gap: 8,
										}}
									>
										<FileText size={18} color="var(--teal)" />
										Регистрация нового гарантийного письма ДМС
									</div>
									<div className="dms-form-grid">
										<div className="dms-field-group">
											<label className="dms-label">Номер письма</label>
											<input
												type="text"
												className="dms-input"
												placeholder="ГП-СОГАЗ-2026-... (необязательно, сгенерируется авто)"
												value={newLetterNumber}
												onChange={(e) => setNewLetterNumber(e.target.value)}
											/>
										</div>
										<div className="dms-field-group">
											<label className="dms-label">Страховая компания</label>
											<select
												className="dms-select"
												value={newLetterInsurerId}
												onChange={(e) =>
													setNewLetterInsurerId(e.target.value as DmsInsurerId)
												}
											>
												{STATUTORY_DMS_INSURERS.map((ins) => (
													<option key={ins.id} value={ins.id}>
														{ins.shortName}
													</option>
												))}
											</select>
										</div>
										<div className="dms-field-group">
											<label className="dms-label">ФИО Пациента</label>
											<input
												type="text"
												className="dms-input"
												placeholder="Иванов Иван Иванович (по умолчанию контекст)"
												value={newLetterPatientName}
												onChange={(e) =>
													setNewLetterPatientName(e.target.value)
												}
											/>
										</div>
										<div className="dms-field-group">
											<label className="dms-label">Номер полиса</label>
											<input
												type="text"
												className="dms-input"
												placeholder="ПОЛИС-77-..."
												value={newLetterPolicyNumber}
												onChange={(e) =>
													setNewLetterPolicyNumber(e.target.value)
												}
											/>
										</div>
										<div className="dms-field-group">
											<label className="dms-label">Лимит суммы (руб)</label>
											<input
												type="number"
												className="dms-input"
												value={newLetterLimitRub}
												onChange={(e) =>
													setNewLetterLimitRub(Number(e.target.value))
												}
												min={1000}
												step={1000}
											/>
										</div>
										<div className="dms-field-group">
											<label className="dms-label">Действует до</label>
											<input
												type="date"
												className="dms-input"
												value={newLetterValidUntil}
												onChange={(e) => setNewLetterValidUntil(e.target.value)}
											/>
										</div>
										<div className="dms-field-group">
											<label className="dms-label">
												Согласованные зубы (FDI)
											</label>
											<input
												type="text"
												className="dms-input"
												placeholder="1.6, 2.6, 3.8"
												value={newLetterTeeth}
												onChange={(e) => setNewLetterTeeth(e.target.value)}
											/>
										</div>
										<div className="dms-field-group">
											<label className="dms-label">Диагноз (МКБ-10)</label>
											<input
												type="text"
												className="dms-input"
												placeholder="K04.0, K02.1"
												value={newLetterDiagnosis}
												onChange={(e) => setNewLetterDiagnosis(e.target.value)}
											/>
										</div>
									</div>
									<div className="dms-field-group">
										<label className="dms-label">
											Согласованные коды номенклатуры 804н
										</label>
										<input
											type="text"
											className="dms-input"
											value={newLetterCodes}
											onChange={(e) => setNewLetterCodes(e.target.value)}
										/>
									</div>
									<div
										style={{
											display: "flex",
											justifyContent: "flex-end",
											gap: 10,
										}}
									>
										<button
											type="button"
											className="dms-btn-action dms-btn-secondary"
											onClick={() => setIsAddingLetter(false)}
										>
											Отмена
										</button>
										<button
											type="submit"
											className="dms-btn-action dms-btn-success"
										>
											Сохранить гарантийное письмо
										</button>
									</div>
								</form>
							)}

							{/* Список карточек гарантийных писем */}
							<div className="dms-table-container">
								<table className="dms-table">
									<thead>
										<tr>
											<th>Номер ГП / Страховая</th>
											<th>Пациент / Полис</th>
											<th>Диагноз / Зубы</th>
											<th>Лимит и использование</th>
											<th>Срок действия</th>
											<th>Статус</th>
											<th>Куратор</th>
										</tr>
									</thead>
									<tbody>
										{filteredLetters.length === 0 ? (
											<tr>
												<td
													colSpan={7}
													style={{
														textAlign: "center",
														padding: 30,
														color: "var(--muted)",
													}}
												>
													Гарантийные письма не найдены.
												</td>
											</tr>
										) : (
											filteredLetters.map((l) => {
												const pct = Math.min(
													100,
													Math.round(
														(l.usedAmountKopecks /
															Math.max(1, l.totalLimitKopecks)) *
															100,
													),
												);
												const progressColorClass =
													pct > 90
														? "dms-progress-fill--red"
														: pct > 60
															? "dms-progress-fill--orange"
															: "dms-progress-fill--green";

												return (
													<tr key={l.id}>
														<td>
															<div style={{ fontWeight: 700 }}>
																{l.letterNumber}
															</div>
															<div
																style={{
																	fontSize: "0.75rem",
																	color: "var(--muted)",
																}}
															>
																{l.insurerName}
															</div>
														</td>
														<td>
															<div style={{ fontWeight: 600 }}>
																{l.patientFullName}
															</div>
															<div
																style={{
																	fontSize: "0.75rem",
																	color: "var(--muted)",
																}}
															>
																{l.policyNumber}
															</div>
														</td>
														<td>
															<div style={{ fontWeight: 600 }}>
																МКБ: {l.diagnosisMkb10.join(", ")}
															</div>
															<div
																style={{
																	fontSize: "0.75rem",
																	color: "var(--teal)",
																}}
															>
																Зубы: {l.approvedTeeth.join(", ") || "Все"}
															</div>
														</td>
														<td style={{ minWidth: 160 }}>
															<div
																style={{
																	display: "flex",
																	justifyContent: "space-between",
																	fontSize: "0.75rem",
																	fontWeight: 600,
																}}
															>
																<span>
																	{formatKopecks(l.usedAmountKopecks)}
																</span>
																<span style={{ color: "var(--muted)" }}>
																	{formatKopecks(l.totalLimitKopecks)}
																</span>
															</div>
															<div className="dms-progress-track">
																<div
																	className={`dms-progress-fill ${progressColorClass}`}
																	style={{ width: `${pct}%` }}
																/>
															</div>
														</td>
														<td>
															<div style={{ fontSize: "0.8125rem" }}>
																до {l.validUntil}
															</div>
															<div
																style={{
																	fontSize: "0.75rem",
																	color: "var(--muted)",
																}}
															>
																от {l.issueDate}
															</div>
														</td>
														<td>
															{l.status === "active" && (
																<span className="dms-badge dms-badge--approved">
																	<CheckCircle2 size={12} />
																	Активно
																</span>
															)}
															{l.status === "expired" && (
																<span className="dms-badge dms-badge--rejected">
																	<XCircle size={12} />
																	Истекло
																</span>
															)}
															{l.status === "exhausted" && (
																<span className="dms-badge dms-badge--exceeded">
																	<AlertTriangle size={12} />
																	Исчерпан
																</span>
															)}
														</td>
														<td>
															<div
																style={{
																	fontSize: "0.8125rem",
																	fontWeight: 500,
																}}
															>
																{l.curatorFullName}
															</div>
															<div
																style={{
																	fontSize: "0.75rem",
																	color: "var(--muted)",
																}}
															>
																{l.curatorPhone}
															</div>
														</td>
													</tr>
												);
											})
										)}
									</tbody>
								</table>
							</div>
						</>
					)}

					{/* =========================================================
					    ВКЛАДКА 2: СОГЛАСОВАНИЕ УСЛУГ (PRE-AUTH STUDIO)
					   ========================================================= */}
					{activeTab === "preauth" && (
						<div
							style={{ display: "flex", flexDirection: "column", gap: 16 }}
						>
							{/* ⚡ 1-КЛИК: ЭКСТРЕННАЯ ПОМОЩЬ ПО ОСТРОЙ БОЛИ (МАНДАТ 8e) */}
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: 12,
									background:
										"linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)",
									border: "1.5px solid rgba(239, 68, 68, 0.35)",
									borderRadius: 12,
									padding: "12px 16px",
									flexWrap: "wrap",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 10,
										flex: 1,
										minWidth: 260,
									}}
								>
									<Zap size={22} color="#ef4444" style={{ flexShrink: 0 }} />
									<div>
										<div
											style={{
												fontWeight: 700,
												fontSize: "0.875rem",
												color: "var(--ink, #0f172a)",
											}}
										>
											⚡ 1-Клик: Острая боль (согласование депульпирования / анестезии)
										</div>
										<div
											style={{
												fontSize: "0.75rem",
												color: "var(--muted, #64748b)",
												marginTop: 2,
											}}
										>
											Мгновенно одобряет Pre-Auth статус (K04.0 / A16.07.030.001) без ожидания ответа страховой
										</div>
									</div>
								</div>
								<button
									type="button"
									className="dms-btn-action"
									style={{
										background: "#ef4444",
										color: "#ffffff",
										border: "none",
										fontWeight: 700,
										padding: "10px 18px",
										minHeight: 44,
										borderRadius: 8,
										cursor: "pointer",
										display: "inline-flex",
										alignItems: "center",
										gap: 8,
									}}
									onClick={handleActivateEmergencyPreAuth}
								>
									<Zap size={16} />
									⚡ Согласовать экстренно
								</button>
							</div>

							<div className="dms-kpi-grid">
								<div className="dms-kpi-card">
									<span className="dms-kpi-label">Статус проверки</span>
									<span
										className={`dms-badge dms-badge--${preAuthVerification.status}`}
										style={{ alignSelf: "flex-start", marginTop: 4 }}
									>
										{preAuthVerification.status === "approved" && (
											<CheckCircle2 size={14} />
										)}
										{preAuthVerification.status === "pending_preauth" && (
											<AlertCircle size={14} />
										)}
										{preAuthVerification.status === "rejected_exclusion" && (
											<XCircle size={14} />
										)}
										{preAuthVerification.status === "limit_exceeded" && (
											<AlertTriangle size={14} />
										)}
										{preAuthVerification.statusLabel}
									</span>
									<span className="dms-kpi-sub">
										{preAuthVerification.reason}
									</span>
								</div>

								<div className="dms-kpi-card">
									<span className="dms-kpi-label">Тариф услуги (804н)</span>
									<span className="dms-kpi-val">
										{formatKopecks(
											selectedNomenclatureItem?.defaultPriceKopecks ?? 0,
										)}
									</span>
									<span className="dms-kpi-sub">
										Код: {preAuthServiceCode}
									</span>
								</div>

								<div className="dms-kpi-card">
									<span className="dms-kpi-label">Покрытие ДМС</span>
									<span className="dms-kpi-val" style={{ color: "#16a34a" }}>
										{formatKopecks(preAuthVerification.dmsPayableKopecks)}
									</span>
									<span className="dms-kpi-sub">
										Доплата:{" "}
										{formatKopecks(preAuthVerification.patientPayableKopecks)}
									</span>
								</div>
							</div>

							{/* Интерактивная форма предсогласования */}
							<div
								style={{
									background: "var(--surface, #f8fafc)",
									border: "1px solid var(--line, #e2e8f0)",
									borderRadius: 14,
									padding: 18,
									display: "flex",
									flexDirection: "column",
									gap: 14,
								}}
							>
								<div
									style={{
										fontWeight: 700,
										fontSize: "0.9375rem",
										display: "flex",
										alignItems: "center",
										gap: 8,
									}}
								>
									<ShieldCheck size={18} color="var(--teal)" />
									Параметры клинического согласования (Pre-Auth Request)
								</div>

								<div className="dms-form-grid">
									<div className="dms-field-group">
										<label className="dms-label">Пациент</label>
										<input
											type="text"
											className="dms-input"
											value={preAuthPatientName}
											onChange={(e) => setPreAuthPatientName(e.target.value)}
										/>
									</div>
									<div className="dms-field-group">
										<label className="dms-label">Полис ДМС</label>
										<input
											type="text"
											className="dms-input"
											value={preAuthPolicyNumber}
											onChange={(e) => setPreAuthPolicyNumber(e.target.value)}
										/>
									</div>
									<div className="dms-field-group">
										<label className="dms-label">Страховая компания</label>
										<select
											className="dms-select"
											value={preAuthInsurerId}
											onChange={(e) =>
												setPreAuthInsurerId(e.target.value as DmsInsurerId)
											}
										>
											{STATUTORY_DMS_INSURERS.map((ins) => (
												<option key={ins.id} value={ins.id}>
													{ins.shortName}
												</option>
											))}
										</select>
									</div>
									<div className="dms-field-group">
										<label className="dms-label">Программа полиса</label>
										<select
											className="dms-select"
											value={preAuthProgramKey}
											onChange={(e) =>
												setPreAuthProgramKey(e.target.value as DmsProgramKey)
											}
										>
											{Object.values(STATUTORY_DMS_PROGRAMS).map((prog) => (
												<option key={prog.key} value={prog.key}>
													{prog.title}
												</option>
											))}
										</select>
									</div>
									<div className="dms-field-group">
										<label className="dms-label">Номер зуба (FDI)</label>
										<input
											type="text"
											className="dms-input"
											value={preAuthTooth}
											onChange={(e) => setPreAuthTooth(e.target.value)}
											placeholder="1.6"
										/>
									</div>
									<div className="dms-field-group">
										<label className="dms-label">Диагноз (МКБ-10)</label>
										<select
											className="dms-select"
											value={preAuthDiagnosisCode}
											onChange={(e) => {
												setPreAuthDiagnosisCode(e.target.value);
												if (e.target.value === "K04.0")
													setPreAuthDiagnosisTitle(
														"Пульпит зуба (острый/необратимый)",
													);
												if (e.target.value === "K02.1")
													setPreAuthDiagnosisTitle("Кариес дентина");
												if (e.target.value === "K04.4")
													setPreAuthDiagnosisTitle(
														"Острый апикальный периодонтит",
													);
												if (e.target.value === "K01.1")
													setPreAuthDiagnosisTitle("Ретинированный зуб");
											}}
										>
											<option value="K04.0">K04.0 — Пульпит зуба</option>
											<option value="K02.1">K02.1 — Кариес дентина</option>
											<option value="K04.4">
												K04.4 — Острый периодонтит
											</option>
											<option value="K01.1">
												K01.1 — Ретинированный зуб
											</option>
										</select>
									</div>
								</div>

								<div className="dms-field-group">
									<label className="dms-label">
										Услуга по номенклатуре Минздрава РФ № 804н
									</label>
									<select
										className="dms-select"
										value={preAuthServiceCode}
										onChange={(e) => setPreAuthServiceCode(e.target.value)}
									>
										{STATUTORY_804N_NOMENCLATURE.map((srv) => (
											<option key={srv.code} value={srv.code}>
												{srv.code} — {srv.name} (
												{formatKopecks(srv.defaultPriceKopecks)})
											</option>
										))}
									</select>
								</div>

								<div className="dms-field-group">
									<label className="dms-label">
										Клиническое обоснование для врача-эксперта страховой
									</label>
									<textarea
										className="dms-textarea"
										value={preAuthClinicalNotes}
										onChange={(e) => setPreAuthClinicalNotes(e.target.value)}
									/>
								</div>

								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 12,
										marginTop: 4,
									}}
								>
									<label
										style={{
											display: "flex",
											alignItems: "center",
											gap: 8,
											cursor: "pointer",
											fontSize: "0.875rem",
											fontWeight: 600,
										}}
									>
										<input
											type="checkbox"
											checked={preAuthAttachingXray}
											onChange={(e) =>
												setPreAuthAttachingXray(e.target.checked)
											}
											style={{ width: 18, height: 18 }}
										/>
										Приложить радиовизиографический снимок зуба {preAuthTooth} к
										запросу
									</label>
								</div>

								{/* 1-Click Статусные кнопки (Touch-First) */}
								<div style={{ marginTop: 8 }}>
									<label
										className="dms-label"
										style={{ display: "block", marginBottom: 8 }}
									>
										1-Click Решение куратора / Статус согласования:
									</label>
									<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
										<button
											type="button"
											className={`dms-btn-action ${preAuthOverrideStatus === "approved" || (!preAuthOverrideStatus && preAuthVerification.status === "approved") ? "dms-btn-success" : "dms-btn-secondary"}`}
											onClick={() => setPreAuthOverrideStatus("approved")}
										>
											<CheckCircle2 size={16} />
											Согласовано
										</button>
										<button
											type="button"
											className={`dms-btn-action ${preAuthOverrideStatus === "pending_preauth" || (!preAuthOverrideStatus && preAuthVerification.status === "pending_preauth") ? "dms-btn-warning" : "dms-btn-secondary"}`}
											onClick={() =>
												setPreAuthOverrideStatus("pending_preauth")
											}
										>
											<AlertCircle size={16} />
											На рассмотрении
										</button>
										<button
											type="button"
											className={`dms-btn-action ${preAuthOverrideStatus === "rejected_exclusion" || (!preAuthOverrideStatus && preAuthVerification.status === "rejected_exclusion") ? "dms-btn-danger" : "dms-btn-secondary"}`}
											onClick={() =>
												setPreAuthOverrideStatus("rejected_exclusion")
											}
										>
											<XCircle size={16} />
											Отказ страховой
										</button>
										<button
											type="button"
											className={`dms-btn-action ${preAuthOverrideStatus === "limit_exceeded" ? "dms-btn-warning" : "dms-btn-secondary"}`}
											onClick={() => setPreAuthOverrideStatus("limit_exceeded")}
										>
											<AlertTriangle size={16} />
											Превышен лимит
										</button>
										{preAuthOverrideStatus && (
											<button
												type="button"
												className="dms-btn-action dms-btn-secondary"
												onClick={() => setPreAuthOverrideStatus(null)}
											>
												<RefreshCw size={14} />
												Сбросить в авто
											</button>
										)}
									</div>
								</div>

								{/* Кнопка формирования и печати */}
								<div
									style={{
										display: "flex",
										justifyContent: "flex-end",
										marginTop: 10,
									}}
								>
									<button
										className="dms-btn-action dms-btn-primary"
										onClick={handlePrintPreAuthRequest}
									>
										<Printer size={18} />
										1-Click Печать Запроса в страховую (А4)
									</button>
								</div>
							</div>
						</div>
					)}

					{/* =========================================================
					    ВКЛАДКА 3: СПЛИТ-ОПЛАТА (SPLIT BILLING CASHIER)
					   ========================================================= */}
					{activeTab === "split" && (
						<div
							style={{ display: "flex", flexDirection: "column", gap: 16 }}
						>
							{/* Метрики сплита */}
							<div className="dms-kpi-grid">
								<div className="dms-kpi-card">
									<span className="dms-kpi-label">Сумма по прайсу</span>
									<span className="dms-kpi-val">
										{formatKopecks(splitSummary.totalBillKopecks)}
									</span>
									<span className="dms-kpi-sub">
										{splitItems.length} позиций в счете
									</span>
								</div>

								<div className="dms-kpi-card">
									<span className="dms-kpi-label">Оплачивает ДМС</span>
									<span className="dms-kpi-val" style={{ color: "#16a34a" }}>
										{formatKopecks(splitSummary.totalDmsCoveredKopecks)}
									</span>
									<span className="dms-kpi-sub">Возмещение страховщиком</span>
								</div>

								<div className="dms-kpi-card">
									<span className="dms-kpi-label">Доплата пациента</span>
									<span className="dms-kpi-val" style={{ color: "#dc2626" }}>
										{formatKopecks(splitSummary.totalPatientCoPayKopecks)}
									</span>
									<span className="dms-kpi-sub">К оплате в кассу клиники</span>
								</div>

								<div className="dms-kpi-card">
									<span className="dms-kpi-label">Остаток по ГП</span>
									<span className="dms-kpi-val" style={{ color: "#0284c7" }}>
										{formatKopecks(splitSummary.letterRemainingLimitKopecks)}
									</span>
									<span className="dms-kpi-sub">
										{splitSummary.balanceInvariantHolds ? (
											<span style={{ color: "#16a34a", fontWeight: 700 }}>
												✓ Баланс копейка-в-копейку
											</span>
										) : (
											<span style={{ color: "#dc2626" }}>⚠ Дисбаланс</span>
										)}
									</span>
								</div>
							</div>

							{/* Управление гарантийным письмом и франшизой */}
							<div
								style={{
									display: "flex",
									gap: 12,
									flexWrap: "wrap",
									background: "var(--surface)",
									padding: 14,
									borderRadius: 14,
									border: "1px solid var(--line)",
								}}
							>
								<div className="dms-field-group" style={{ flex: 1 }}>
									<label className="dms-label">
										Применяемое гарантийное письмо:
									</label>
									<select
										className="dms-select"
										value={selectedLetterIdForSplit}
										onChange={(e) =>
											setSelectedLetterIdForSplit(e.target.value)
										}
									>
										<option value="">Без гарантийного письма (базовое покрытие)</option>
										{letters.map((l) => (
											<option key={l.id} value={l.id}>
												{l.letterNumber} — {l.insurerName} ({l.patientFullName},{" "}
												{formatKopecks(l.totalLimitKopecks)})
											</option>
										))}
									</select>
								</div>

								<div className="dms-field-group" style={{ width: 180 }}>
									<label className="dms-label">Франшиза (% сооплаты):</label>
									<select
										className="dms-select"
										value={splitFranchisePct}
										onChange={(e) =>
											setSplitFranchisePct(Number(e.target.value))
										}
									>
										<option value={0}>0% (100% ДМС)</option>
										<option value={10}>10% сооплата</option>
										<option value={20}>20% сооплата</option>
										<option value={30}>30% сооплата</option>
									</select>
								</div>

								<div className="dms-field-group" style={{ width: 200 }}>
									<label className="dms-label">Фикс. франшиза (руб):</label>
									<input
										type="number"
										className="dms-input"
										value={splitFixedFranchiseRub}
										onChange={(e) =>
											setSplitFixedFranchiseRub(Number(e.target.value))
										}
										min={0}
										step={500}
										placeholder="0"
									/>
								</div>
							</div>

							{/* Таблица разделения счета по позициям */}
							<div className="dms-table-container">
								<table className="dms-table">
									<thead>
										<tr>
											<th>Код 804н</th>
											<th>Наименование услуги</th>
											<th>Зуб</th>
											<th>Кол-во</th>
											<th>Тариф</th>
											<th>Сумма</th>
											<th>Оплата ДМС</th>
											<th>Доплата пациента</th>
											<th>Статус покрытия</th>
										</tr>
									</thead>
									<tbody>
										{splitSummary.lineItems.map((line) => (
											<tr key={line.itemId}>
												<td style={{ fontWeight: 600 }}>
													{line.serviceCode804n}
												</td>
												<td>{line.serviceName}</td>
												<td>{line.toothNumber || "—"}</td>
												<td>{line.quantity}</td>
												<td>{formatKopecks(line.unitPriceKopecks)}</td>
												<td style={{ fontWeight: 600 }}>
													{formatKopecks(line.lineTotalKopecks)}
												</td>
												<td style={{ color: "#16a34a", fontWeight: 700 }}>
													{formatKopecks(line.dmsCoveredKopecks)}
												</td>
												<td style={{ color: "#dc2626", fontWeight: 700 }}>
													{formatKopecks(line.patientCoPayKopecks)}
												</td>
												<td>
													<span
														className={`dms-badge dms-badge--${line.status}`}
													>
														{line.statusLabel}
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* =========================================================
					    ВКЛАДКА 4: РЕЕСТРЫ СТРАХОВОЙ & АКТЫ 804Н
					   ========================================================= */}
					{activeTab === "registry" && (
						<div
							style={{ display: "flex", flexDirection: "column", gap: 16 }}
						>
							{/* Панель выбора реестра */}
							<div
								style={{
									display: "flex",
									gap: 12,
									flexWrap: "wrap",
									background: "var(--surface)",
									padding: 14,
									borderRadius: 14,
									border: "1px solid var(--line)",
									alignItems: "flex-end",
								}}
							>
								<div className="dms-field-group" style={{ flex: 1 }}>
									<label className="dms-label">Страховая компания</label>
									<select
										className="dms-select"
										value={registryInsurerId}
										onChange={(e) =>
											setRegistryInsurerId(e.target.value as DmsInsurerId)
										}
									>
										{STATUTORY_DMS_INSURERS.map((ins) => (
											<option key={ins.id} value={ins.id}>
												{ins.shortName}
											</option>
										))}
									</select>
								</div>
								<div className="dms-field-group">
									<label className="dms-label">Период с</label>
									<input
										type="date"
										className="dms-input"
										value={registryPeriodStart}
										onChange={(e) => setRegistryPeriodStart(e.target.value)}
									/>
								</div>
								<div className="dms-field-group">
									<label className="dms-label">Период по</label>
									<input
										type="date"
										className="dms-input"
										value={registryPeriodEnd}
										onChange={(e) => setRegistryPeriodEnd(e.target.value)}
									/>
								</div>
								<button
									className="dms-btn-action dms-btn-secondary"
									onClick={handleDownloadRegistryCsv}
								>
									<Download size={18} />
									Скачать реестр (CSV для 1C/Excel)
								</button>
								<button
									className="dms-btn-action dms-btn-primary"
									onClick={handlePrintAcceptanceAct}
								>
									<Printer size={18} />
									Печать двустороннего Акта (А4)
								</button>
							</div>

							{/* Сводные KPI реестра */}
							<div className="dms-kpi-grid">
								<div className="dms-kpi-card">
									<span className="dms-kpi-label">Всего услуг в реестре</span>
									<span className="dms-kpi-val">
										{statutoryRegistry.totalVisitsCount} ед.
									</span>
									<span className="dms-kpi-sub">
										Застрахованных: {statutoryRegistry.uniquePatientsCount} чел.
									</span>
								</div>

								<div className="dms-kpi-card">
									<span className="dms-kpi-label">Сумма ДМС к возмещению</span>
									<span className="dms-kpi-val" style={{ color: "#0284c7" }}>
										{formatKopecks(statutoryRegistry.grandTotalDmsKopecks)}
									</span>
									<span className="dms-kpi-sub">Без НДС (ст. 149 НК РФ)</span>
								</div>

								<div className="dms-kpi-card">
									<span className="dms-kpi-label">Сооплата пациентов</span>
									<span className="dms-kpi-val">
										{formatKopecks(statutoryRegistry.grandTotalPatientKopecks)}
									</span>
									<span className="dms-kpi-sub">Оплачено в кассу</span>
								</div>
							</div>

							{/* Таблица реестра */}
							<div className="dms-table-container">
								<table className="dms-table">
									<thead>
										<tr>
											<th>№</th>
											<th>Дата</th>
											<th>Пациент / Полис</th>
											<th>№ ГП</th>
											<th>Код 804н</th>
											<th>Услуга</th>
											<th>Зуб</th>
											<th>Тариф</th>
											<th>Принято ДМС</th>
										</tr>
									</thead>
									<tbody>
										{statutoryRegistry.items.map((item, idx) => (
											<tr key={item.visitId + idx}>
												<td>{idx + 1}</td>
												<td>{item.visitDate}</td>
												<td>
													<div style={{ fontWeight: 600 }}>
														{item.patientFullName}
													</div>
													<div
														style={{
															fontSize: "0.75rem",
															color: "var(--muted)",
														}}
													>
														{item.policyNumber}
													</div>
												</td>
												<td>{item.guaranteeLetterNumber || "—"}</td>
												<td style={{ fontWeight: 600 }}>
													{item.serviceCode804n}
												</td>
												<td>{item.serviceName}</td>
												<td>{item.toothNumber || "—"}</td>
												<td>{formatKopecks(item.unitPriceKopecks)}</td>
												<td style={{ color: "#16a34a", fontWeight: 700 }}>
													{formatKopecks(item.dmsAcceptedKopecks)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>

				{/* Футер модального окна */}
				<div className="dms-manager-footer">
					<div
						style={{
							fontSize: "0.8125rem",
							color: "var(--muted, #64748b)",
							display: "flex",
							alignItems: "center",
							gap: 6,
						}}
					>
						<Building2 size={16} />
						{clinicInfo.legalName} • Лицензия: {clinicInfo.licenseNumber}
					</div>
					<button
						className="dms-btn-action dms-btn-secondary"
						onClick={onClose}
					>
						Закрыть окно
					</button>
				</div>
			</div>
		</div>
	);
};
