/**
 * DmsGuaranteeLetterModal.tsx — Модальное окно учета и редактирования гарантийных писем ДМС,
 * лимитов страхового покрытия, франшиз, исключений и согласования номенклатурных услуг 804н.
 */

import {
	AlertTriangle,
	Calculator,
	Check,
	CheckCircle2,
	FileCheck,
	Plus,
	Search,
	Shield,
	X,
	Zap,
} from "lucide-react";
import React, { useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast";
import "./insurance.css";
import {
	formatRubKopecks,
	RUSSIAN_DMS_INSURERS,
	type DmsGuaranteeLetter,
} from "./insuranceMath";
import { DmsBillSplitCalculatorSection } from "./DmsBillSplitCalculatorSection";
import { DmsExclusionsSelectorCard } from "./DmsExclusionsSelectorCard";
import { DmsNomenclatureSelectorCard } from "./DmsNomenclatureSelectorCard";
import { DmsLimitsAndFranchiseSection } from "./DmsLimitsAndFranchiseSection";
import { DmsQuickActionBanners } from "./DmsQuickActionBanners";

import {
	type PatientGuaranteeLetter,
	type BillItemToSplit,
	type ExpressDmsGuaranteePreset,
	COMMON_DENTAL_ICD10_DIAGNOSES,
	FDI_ADULT_TEETH_UPPER,
	FDI_ADULT_TEETH_LOWER,
	DEFAULT_BILL_ITEMS_TO_SPLIT,
	EXPRESS_GUARANTEE_LETTER_PRESETS,
} from "./dmsInsurancePresets";

export type { DmsGuaranteeLetter, PatientGuaranteeLetter, BillItemToSplit, ExpressDmsGuaranteePreset };
export {
	COMMON_DENTAL_ICD10_DIAGNOSES,
	FDI_ADULT_TEETH_UPPER,
	FDI_ADULT_TEETH_LOWER,
	DEFAULT_BILL_ITEMS_TO_SPLIT,
	EXPRESS_GUARANTEE_LETTER_PRESETS,
};

export interface PatientDmsProfile {
	readonly id: string;
	readonly fullName: string;
	readonly birthDate?: string | undefined;
	readonly policyNumber?: string | undefined;
	readonly insuranceCompany?: string | undefined;
	readonly phone?: string | undefined;
}

export interface DmsGuaranteeLetterModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: PatientDmsProfile | undefined;
	readonly initialLetter?: DmsGuaranteeLetter | null | undefined;
	readonly onSave?: ((letter: DmsGuaranteeLetter) => void) | undefined;
}

/** Преобразование ответа бэкенда в модель интерфейса гарантийного письма */
export function mapBackendLetterToPatientGuaranteeLetter(item: any): PatientGuaranteeLetter {
	return {
		id: String(item.id),
		letterNumber: String(item.letterNumber || ""),
		insurerKey: String(item.insurerKey || "custom"),
		insurerName: String(item.insurerName || "Страховая компания ДМС"),
		patientId: String(item.patientId || ""),
		patientFullName: String(item.patientFullName || ""),
		policyNumber: String(item.policyNumber || ""),
		issueDate: String(item.issueDate || "").slice(0, 10),
		validFrom: String(item.validFrom || "").slice(0, 10),
		validUntil: String(item.validUntil || "").slice(0, 10),
		maxCoverageKopecks: Math.round(Number(item.maxCoverageRub || 0) * 100),
		usedAmountKopecks: Math.round(Number(item.usedAmountRub || 0) * 100),
		franchisePct: Number(item.franchisePct) || 0,
		franchiseType: item.franchiseType === "fixed_rub" ? "fixed_kopecks" : "percent",
		franchiseFixedKopecks: Math.round(Number(item.franchiseFixedRub || 0) * 100),
		approvedTeethFdi: Array.isArray(item.approvedTeethFdi) ? item.approvedTeethFdi : [],
		approvedServiceCodes804n: Array.isArray(item.approvedServiceCodes)
			? item.approvedServiceCodes
			: Array.isArray(item.approvedServiceCodes804n)
			? item.approvedServiceCodes804n
			: [],
		approvedDiagnosisMkb10: Array.isArray(item.approvedDiagnosisCodes)
			? item.approvedDiagnosisCodes
			: Array.isArray(item.approvedDiagnosisMkb10)
			? item.approvedDiagnosisMkb10
			: [],
		curatorFullName: String(item.curatorFullName || ""),
		curatorPhone: String(item.curatorPhone || ""),
		curatorEmail: item.curatorEmail ? String(item.curatorEmail) : undefined,
		notes: String(item.notes || ""),
		status: (item.status as PatientGuaranteeLetter["status"]) || "active",
	};
}

export function DmsGuaranteeLetterModal({
	isOpen,
	onClose,
	patient,
	initialLetter,
	onSave,
}: DmsGuaranteeLetterModalProps) {
	const insurerSelectId = useId();
	const policyNumberInputId = useId();
	const letterNumberInputId = useId();
	const issueDateInputId = useId();
	const validFromInputId = useId();
	const validUntilInputId = useId();
	const notesTextareaId = useId();


	const todayStr = useMemo(() => new Date().toISOString().split("T")[0] ?? "2026-08-22", []);
	const nextMonthStr = useMemo(() => {
		const d = new Date();
		d.setMonth(d.getMonth() + 1);
		return d.toISOString().split("T")[0] ?? "2026-09-22";
	}, []);

	// Основные поля
	const [insurerKey, setInsurerKey] = useState<string>(
		initialLetter?.insurerKey ||
			(patient?.insuranceCompany ? "custom" : RUSSIAN_DMS_INSURERS[0]?.key || "sogaz"),
	);
	const [customInsurerName, setCustomInsurerName] = useState<string>(
		initialLetter?.insurerName || patient?.insuranceCompany || "",
	);
	const [policyNumber, setPolicyNumber] = useState<string>(
		initialLetter?.policyNumber || patient?.policyNumber || "",
	);
	const [letterNumber, setLetterNumber] = useState<string>(
		initialLetter?.letterNumber || `ГП-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
	);
	const [isEmergencyCare, setIsEmergencyCare] = useState<boolean>(false);
	const [isDeferredScan, setIsDeferredScan] = useState<boolean>(false);
	const [issueDate, setIssueDate] = useState<string>(
		initialLetter?.issueDate ?? todayStr ?? "",
	);
	const [validFrom, setValidFrom] = useState<string>(
		initialLetter?.validFrom ?? todayStr ?? "",
	);
	const [validUntil, setValidUntil] = useState<string>(
		initialLetter?.validUntil ?? nextMonthStr ?? "",
	);

	// Лимиты и франшиза
	const [maxCoverageRub, setMaxCoverageRub] = useState<number>(
		initialLetter?.maxCoverageRub ?? 50000,
	);
	const [usedAmountRub, setUsedAmountRub] = useState<number>(
		initialLetter?.usedAmountRub ?? 0,
	);
	const [franchiseType, setFranchiseType] = useState<"percent" | "fixed_rub">(
		initialLetter?.franchiseType ?? "percent",
	);
	const [franchisePct, setFranchisePct] = useState<number>(
		initialLetter?.franchisePct ?? 0,
	);
	const [franchiseFixedRub, setFranchiseFixedRub] = useState<number>(
		initialLetter?.franchiseFixedRub ?? 0,
	);

	// Исключения и одобренные услуги
	const [selectedExclusions, setSelectedExclusions] = useState<string[]>(
		initialLetter?.programExclusions
			? [...initialLetter.programExclusions]
			: [
					"orthodontics",
					"implantology",
					"whitening",
					"veneers",
					"prosthetics_precious",
				],
	);
	const [approvedServiceCodes, setApprovedServiceCodes] = useState<string[]>(
		initialLetter?.approvedServiceCodes
			? [...initialLetter.approvedServiceCodes]
			: [
					"A16.07.002.001",
					"A16.07.030.001",
					"A16.07.008.001",
					"B01.003.004.001",
				],
	);
	const [approvedDiagnosisCodes, setApprovedDiagnosisCodes] = useState<string[]>(
		initialLetter?.approvedDiagnosisCodes
			? [...initialLetter.approvedDiagnosisCodes]
			: ["K02.1", "K04.0"],
	);
	const [notes, setNotes] = useState<string>(initialLetter?.notes || "");
	const [status, setStatus] = useState<"active" | "expired" | "exhausted" | "cancelled">(
		initialLetter?.status || "active",
	);

	if (!isOpen) return null;

	const activeInsurer = RUSSIAN_DMS_INSURERS.find((i) => i.key === insurerKey);
	const insurerDisplayName =
		insurerKey === "custom"
			? customInsurerName || "Пользовательская страховая компания"
			: activeInsurer?.shortName || "Страховая компания";

	const remainingLimitRub = Math.max(0, maxCoverageRub - usedAmountRub);

	const letterForSplit: import("./dmsSplitEngine").DmsGuaranteeLetter = useMemo(
		() => ({
			id: initialLetter?.id || "preview-letter",
			patientId: patient?.id || "preview-patient",
			patientFullName: patient?.fullName || "Пациент ДМС",
			insurerId: insurerKey,
			insurerName: insurerDisplayName,
			letterNumber: letterNumber || "ГП-ПРЕВЬЮ",
			policyNumber: policyNumber || "ПОЛИС",
			issueDate: issueDate || todayStr,
			validFrom: validFrom || todayStr,
			validUntil: validUntil || nextMonthStr,
			maxCoverageKopecks: Math.round(maxCoverageRub * 100),
			usedAmountKopecks: Math.round(usedAmountRub * 100),
			franchisePercent: franchiseType === "percent" ? franchisePct : 0,
			franchiseFixedKopecks:
				franchiseType === "fixed_rub" ? Math.round(franchiseFixedRub * 100) : 0,
			approvedTeethFdi: [],
			approvedServiceCodes804n: approvedServiceCodes,
			programExclusions: selectedExclusions,
			notes: notes,
			status: status,
		}),
		[
			initialLetter?.id,
			patient?.id,
			patient?.fullName,
			insurerKey,
			insurerDisplayName,
			letterNumber,
			policyNumber,
			issueDate,
			todayStr,
			validFrom,
			validUntil,
			nextMonthStr,
			maxCoverageRub,
			usedAmountRub,
			franchiseType,
			franchisePct,
			franchiseFixedRub,
			approvedServiceCodes,
			selectedExclusions,
			notes,
			status,
		],
	);


	// Переключение исключения
	const toggleExclusion = (exclusionKey: string) => {
		setSelectedExclusions((prev) =>
			prev.includes(exclusionKey)
				? prev.filter((k) => k !== exclusionKey)
				: [...prev, exclusionKey],
		);
	};

	// Переключение согласованной услуги 804н
	const toggleApprovedService = (code: string) => {
		setApprovedServiceCodes((prev) =>
			prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
		);
	};

	// Переключение диагноза МКБ-10
	const toggleDiagnosis = (code: string) => {
		setApprovedDiagnosisCodes((prev) =>
			prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
		);
	};

	const handleActivateEmergencyPainMode = () => {
		setIsEmergencyCare(true);
		const emergencyLetterNumber =
			letterNumber.trim() && !letterNumber.startsWith("ГП-")
				? letterNumber
				: `ГП-ЭКСТРЕННО-${Date.now().toString().slice(-6)} (ГАРАНТИЯ В ПУТИ)`;
		setLetterNumber(emergencyLetterNumber);
		if (!policyNumber.trim()) {
			setPolicyNumber(patient?.policyNumber || "ПОЛИС-ДМС-ОСТРАЯ-БОЛЬ");
		}
		setMaxCoverageRub((prev) => (prev < 35000 ? 50000 : prev));
		setStatus("active");
		// Неотложные манипуляции по острой боли (Номенклатура 804н)
		const acuteServiceCodes = [
			"A16.07.030.001", // депульпирование / инструментальная обработка канала
			"A11.07.010", // инъекционная анестезия
			"A16.07.011", // вскрытие абсцесса / поднадкостничного очага
			"A16.07.008.001", // пломбирование корневого канала / временная повязка
			"A16.07.002.001", // светоотверждаемая пломба
			"B01.003.004.001", // прием врача при острой боли
		];
		setApprovedServiceCodes((prev) => Array.from(new Set([...prev, ...acuteServiceCodes])));
		const acuteDiagnoses = ["K04.0", "K04.4"];
		setApprovedDiagnosisCodes((prev) => Array.from(new Set([...prev, ...acuteDiagnoses])));
		setNotes(
			"Экстренный приём / Гарантия в пути (лечение начато без ожидания письма, устное подтверждение куратора). Временное согласование неотложных манипуляций (депульпирование, анестезия, вскрытие абсцесса) без блокировки кассы или приёма.",
		);
		showToast(
			"Экстренный приём / Гарантия в пути: лечение начато без ожидания письма, устное подтверждение куратора зафиксировано, приём разблокирован!",
			"success",
		);
	};

	const handleApplyExpressPreset = (preset: ExpressDmsGuaranteePreset) => {
		setInsurerKey(preset.insurerKey);
		setCustomInsurerName(preset.insurerNameRu);
		setMaxCoverageRub(preset.maxCoverageRub);
		setFranchisePct(preset.franchisePct);
		setFranchiseType("percent");
		setApprovedServiceCodes([...preset.approvedServiceCodes804n]);
		setApprovedDiagnosisCodes([...preset.approvedDiagnosisMkb10]);
		setNotes(preset.noteRu);
		if (!letterNumber || letterNumber.startsWith("ГП-") || letterNumber.startsWith("ГП-ЭКСТРЕННО-")) {
			const prefixMap: Record<string, string> = {
				sogaz: "СОГАЗ-ГП",
				ingosstrakh: "ИНГОС-ГП",
				alfastrakhovanie: "АЛЬФА-ГП",
				reso_garantiya: "РЕСО-ГП",
			};
			const pfx = prefixMap[preset.insurerKey] ?? "ГП";
			setLetterNumber(`${pfx}-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`);
		}
		showToast(`Экспресс-шаблон «${preset.labelRu}» применен в 1 клик`, "info");
	};

	const handleSave = () => {
		// Мандат 8e: если пациент пришел с острой болью или скан отложен (гарантия в пути), программа НЕ блокирует врача и не требует обязательного наличия скана!
		const resolvedPolicy =
			policyNumber.trim() ||
			patient?.policyNumber ||
			(isEmergencyCare
				? "ЭКСТРЕННЫЙ-ДМС-ОСТРАЯ-БОЛЬ"
				: isDeferredScan
				? "ДМС-ДОСЫЛКА-СКАНА"
				: "ПОЛИС-ДМС-БЕЗ-НОМЕРА");
		const resolvedLetterNum =
			letterNumber.trim() ||
			(isEmergencyCare
				? `ГП-ЭКСТРЕННО-${Date.now().toString().slice(-6)} (ДОСЫЛКА)`
				: isDeferredScan
				? `ГП-В-ПУТИ-${Date.now().toString().slice(-6)} (ДОСЫЛКА)`
				: `ГП-ДМС-${Date.now().toString().slice(-6)}`);
		const resolvedCoverage = maxCoverageRub > 0 ? maxCoverageRub : 50000;
		const resolvedNotes =
			isDeferredScan && !notes.includes("досылка")
				? `${notes.trim() ? notes.trim() + " • " : ""}Отложенный ввод скана (гарантия в пути / устное подтверждение куратора)`.trim()
				: notes.trim();

		const letter: DmsGuaranteeLetter = {
			id: initialLetter?.id || `letter-${Date.now()}`,
			organizationId: initialLetter?.organizationId,
			patientId: patient?.id || initialLetter?.patientId || "pat-1",
			patientFullName: patient?.fullName || initialLetter?.patientFullName || "Пациент",
			patientBirthDate: patient?.birthDate ?? initialLetter?.patientBirthDate,
			policyNumber: resolvedPolicy,
			insurerKey,
			insurerName: insurerDisplayName,
			letterNumber: resolvedLetterNum,
			issueDate,
			validFrom,
			validUntil,
			maxCoverageRub: resolvedCoverage,
			usedAmountRub,
			franchisePct: franchiseType === "percent" ? franchisePct : 0,
			franchiseType,
			franchiseFixedRub: franchiseType === "fixed_rub" ? franchiseFixedRub : 0,
			programExclusions: selectedExclusions,
			approvedServiceCodes,
			approvedDiagnosisCodes,
			notes: resolvedNotes,
			status,
		};

		if (onSave) {
			onSave(letter);
		}
		showToast(
			isEmergencyCare
				? `Временное согласование по острой боли № ${letter.letterNumber} сохранено. Приём и касса разблокированы!`
				: isDeferredScan
				? `Гарантийное письмо № ${letter.letterNumber} сохранено с отложенным сканом (приём разблокирован)`
				: `Гарантийное письмо № ${letter.letterNumber} (${letter.insurerName}) успешно сохранено`,
			"success",
		);
		onClose();
	};

	const modalContent = (
		<div className="dms-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
			<div
				className="dms-modal-window"
				onClick={(e) => e.stopPropagation()}
				style={{ maxWidth: "1020px" }}
			>
				{/* Header */}
				<div className="dms-modal-header">
					<h2 className="dms-modal-title">
						<FileCheck className="text-sky-600 dark:text-sky-400" size={24} />
						Гарантийное письмо ДМС и лимиты страховой программы
					</h2>
					<button
						type="button"
						className="dms-btn dms-btn-secondary dms-btn-icon"
						onClick={onClose}
						aria-label="Закрыть модальное окно"
					>
						<X size={18} />
					</button>
				</div>

				{/* Body */}
				<div className="dms-modal-body">
					{/* Patient Header Card */}
					{patient && (
						<div className="dms-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
							<div style={{ minWidth: 0, flex: 1 }}>
								<div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted, #64748b)" }}>Застрахованное лицо (Пациент)</div>
								<div style={{ fontSize: "1.05rem", fontWeight: 700 }} className="truncate" title={patient.fullName}>{patient.fullName}</div>
								{patient.birthDate && (
									<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>Дата рождения: {patient.birthDate}</div>
								)}
							</div>
							<div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
								<span className={`dms-badge dms-badge-${status}`}>
									<CheckCircle2 size={12} />
									{status === "active" ? "Активно" : status === "expired" ? "Истекло" : status === "exhausted" ? "Исчерпано" : "Отозвано"}
								</span>
							</div>
						</div>
					)}

					<DmsQuickActionBanners
						isEmergencyCare={isEmergencyCare}
						onActivateEmergency={handleActivateEmergencyPainMode}
						onApplyExpressPreset={handleApplyExpressPreset}
						presets={EXPRESS_GUARANTEE_LETTER_PRESETS}
					/>


					{/* 1. Блок страховщика и реквизитов письма */}
					<div className="dms-card">
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
							<h3 className="dms-card-title" style={{ margin: 0 }}>
								<Shield size={18} className="text-sky-600" />
								1. Страховая компания и реквизиты гарантийного письма
							</h3>

							<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
								<label
									style={{
										display: "flex",
										alignItems: "center",
										gap: "6px",
										cursor: "pointer",
										padding: "4px 8px",
										borderRadius: "6px",
										background: isEmergencyCare ? "rgba(245, 158, 11, 0.15)" : "transparent",
										border: isEmergencyCare ? "1px solid var(--warn-fg, #d97706)" : "1px solid var(--line, #e2e8f0)",
										fontSize: "0.8125rem",
										fontWeight: 600,
									}}
								>
									<input
										type="checkbox"
										checked={isEmergencyCare}
										onChange={(e) => setIsEmergencyCare(e.target.checked)}
										style={{ width: "15px", height: "15px", cursor: "pointer" }}
									/>
									<span style={{ color: isEmergencyCare ? "var(--warn-fg, #d97706)" : "inherit" }}>
										<AlertTriangle size={14} className="inline mr-1 text-amber-500" /> Острая боль / Экстренная помощь
									</span>
								</label>

								<label
									style={{
										display: "flex",
										alignItems: "center",
										gap: "6px",
										cursor: "pointer",
										padding: "4px 8px",
										borderRadius: "6px",
										background: isDeferredScan ? "rgba(16, 185, 129, 0.15)" : "transparent",
										border: isDeferredScan ? "1px solid var(--ok-fg, #10b981)" : "1px solid var(--line, #e2e8f0)",
										fontSize: "0.8125rem",
										fontWeight: 600,
									}}
									title="Отложенный ввод скана: отсутствие файла в базе не блокирует прием пациента и расчет счетов"
								>
									<input
										type="checkbox"
										checked={isDeferredScan}
										onChange={(e) => setIsDeferredScan(e.target.checked)}
										style={{ width: "15px", height: "15px", cursor: "pointer" }}
									/>
									<span style={{ color: isDeferredScan ? "var(--ok-fg, #059669)" : "inherit" }}>
										<CheckCircle2 size={14} className="inline mr-1 text-emerald-600" /> Отложенный ввод скана (досылка)
									</span>
								</label>
							</div>
						</div>

						{isEmergencyCare && (
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									padding: "8px 12px",
									borderRadius: "8px",
									background: "rgba(245, 158, 11, 0.1)",
									color: "var(--warn-fg, #d97706)",
									fontSize: "0.8125rem",
									fontWeight: 600,
									marginBottom: "12px",
								}}
							>
								<AlertTriangle size={16} />
								<span>
									Задержка гарантийного письма ДМС или превышение франшизы не блокирует приём врача. Требуется досылка гарантийного письма ДМС.
								</span>
							</div>
						)}

						{isDeferredScan && !isEmergencyCare && (
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									padding: "8px 12px",
									borderRadius: "8px",
									background: "rgba(16, 185, 129, 0.1)",
									color: "var(--ok-fg, #059669)",
									fontSize: "0.8125rem",
									fontWeight: 600,
									marginBottom: "12px",
								}}
							>
								<CheckCircle2 size={16} />
								<span>
									Режим досылки активен: отсутствие скана гарантийного письма не блокирует приём врача и оформление визита.
								</span>
							</div>
						)}

						{/* 1-клик быстрый выбор топ-страховщиков РФ по Закону Хика (32–36px) */}
						<div className="dms-quick-toolbar" style={{ marginBottom: "14px" }}>
							<span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted, #64748b)", whiteSpace: "nowrap", flexShrink: 0 }}>
								1-Клик выбор:
							</span>
							{[
								{ key: "sogaz", name: "СОГАЗ" },
								{ key: "ingosstrakh", name: "Ингосстрах" },
								{ key: "reso", name: "РЕСО-Гарантия" },
								{ key: "alfastrakh", name: "АльфаСтрахование" },
								{ key: "vsk", name: "ВСК" },
								{ key: "soglasie", name: "Согласие" },
							].map((ins) => (
								<button
									key={ins.key}
									type="button"
									onClick={() => setInsurerKey(ins.key)}
									className={`dms-quick-chip ${insurerKey === ins.key ? "active" : ""}`}
									title={`Выбрать страховую компанию ${ins.name}`}
								>
									{insurerKey === ins.key && <Check size={12} />}
									<span>{ins.name}</span>
								</button>
							))}
						</div>

						<div className="dms-grid-3">
							<div className="dms-field-group">
								<label htmlFor={insurerSelectId} className="dms-label">Страховая компания (ДМС) *</label>
								<select
									id={insurerSelectId}
									value={insurerKey}
									onChange={(e) => setInsurerKey(e.target.value)}
									className="dms-select"
								>
									{RUSSIAN_DMS_INSURERS.map((ins) => (
										<option key={ins.key} value={ins.key}>
											{ins.shortName}
										</option>
									))}
									<option value="custom">Другая страховая компания...</option>
								</select>
							</div>

							{insurerKey === "custom" ? (
								<div className="dms-field-group">
									<label htmlFor={policyNumberInputId} className="dms-label">Наименование компании *</label>
									<input
										id={policyNumberInputId}
										type="text"
										placeholder="Например, САО «МедСтрах»"
										value={customInsurerName}
										onChange={(e) => setCustomInsurerName(e.target.value)}
										className="dms-input"
									/>
								</div>
							) : (
								<div className="dms-field-group">
									<label htmlFor={policyNumberInputId} className="dms-label">Номер полиса ДМС *</label>
									<input
										id={policyNumberInputId}
										type="text"
										placeholder="000-00-000000"
										value={policyNumber}
										onChange={(e) => setPolicyNumber(e.target.value)}
										className="dms-input"
									/>
								</div>
							)}

							<div className="dms-field-group">
								<label htmlFor={letterNumberInputId} className="dms-label">Номер гарантийного письма *</label>
								<input
									id={letterNumberInputId}
									type="text"
									placeholder="ГП-123456"
									value={letterNumber}
									onChange={(e) => setLetterNumber(e.target.value)}
									className="dms-input"
								/>
							</div>
						</div>

						{insurerKey !== "custom" && activeInsurer && (
							<div style={{ marginTop: "12px", fontSize: "0.8125rem", color: "var(--muted, #64748b)", background: "rgba(2, 132, 199, 0.05)", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(2, 132, 199, 0.15)" }}>
								<strong>{activeInsurer.fullName}</strong> (ИНН: {activeInsurer.inn}) &bull; Куратор ДМС: {activeInsurer.phone} &bull; {activeInsurer.standardDmsTerms}
							</div>
						)}

						<div className="dms-grid-3" style={{ marginTop: "14px" }}>
							<div className="dms-field-group">
								<label htmlFor={issueDateInputId} className="dms-label">Дата выдачи письма</label>
								<input
									id={issueDateInputId}
									type="date"
									value={issueDate}
									onChange={(e) => setIssueDate(e.target.value)}
									className="dms-input"
								/>
							</div>

							<div className="dms-field-group">
								<label htmlFor={validFromInputId} className="dms-label">Действует с</label>
								<input
									id={validFromInputId}
									type="date"
									value={validFrom}
									onChange={(e) => setValidFrom(e.target.value)}
									className="dms-input"
								/>
							</div>

							<div className="dms-field-group">
								<label htmlFor={validUntilInputId} className="dms-label">Действует по (срок)</label>
								<input
									id={validUntilInputId}
									type="date"
									value={validUntil}
									onChange={(e) => setValidUntil(e.target.value)}
									className="dms-input"
								/>
							</div>
						</div>
					</div>

					{/* 2. Лимиты покрытия и франшиза (софинансирование) */}
					<DmsLimitsAndFranchiseSection
						maxCoverageRub={maxCoverageRub}
						usedAmountRub={usedAmountRub}
						remainingLimitRub={remainingLimitRub}
						franchiseType={franchiseType}
						franchisePct={franchisePct}
						franchiseFixedRub={franchiseFixedRub}
						status={status}
						onMaxCoverageChange={setMaxCoverageRub}
						onUsedAmountChange={setUsedAmountRub}
						onFranchiseTypeChange={setFranchiseType}
						onFranchisePctChange={setFranchisePct}
						onFranchiseFixedRubChange={setFranchiseFixedRub}
						onStatusChange={setStatus}
					/>


					{/* 3. Исключения страховой программы */}
					<DmsExclusionsSelectorCard
						selectedExclusions={selectedExclusions}
						onToggleExclusion={toggleExclusion}
					/>

					{/* 4. Согласованные услуги Номенклатуры 804н и диагнозы МКБ-10 */}
					<DmsNomenclatureSelectorCard
						approvedServiceCodes={approvedServiceCodes}
						approvedDiagnosisCodes={approvedDiagnosisCodes}
						onToggleApprovedService={toggleApprovedService}
						onToggleDiagnosis={toggleDiagnosis}
					/>


					{/* 5. Интерактивный калькулятор распределения счета визита (ДМС / Пациент) */}
					<DmsBillSplitCalculatorSection
						letter={letterForSplit}
						billItems={DEFAULT_BILL_ITEMS_TO_SPLIT}
					/>

					{/* Примечания */}
					<div className="dms-field-group">
						<label htmlFor={notesTextareaId} className="dms-label">Служебные примечания и комментарии куратора страховой компании</label>
						<textarea
							id={notesTextareaId}
							rows={2}
							placeholder="Например: Согласовано депульпирование зуба 1.6 по острой боли куратором страховой компании"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							className="dms-textarea"
						/>
					</div>
				</div>

				{/* Footer — Закон Миллера: ровно 2 кнопки прямого действия */}
				<div className="dms-modal-footer">
					<button
						type="button"
						className="dms-btn dms-btn-secondary"
						onClick={onClose}
					>
						Отмена
					</button>
					{isEmergencyCare ? (
						<button
							type="button"
							className="dms-btn dms-btn-primary"
							style={{ background: "var(--ok-fg, #059669)", borderColor: "var(--ok-fg, #059669)", fontWeight: 700 }}
							onClick={handleSave}
							title="1-клик: Применить экстренное согласование по острой боли и разблокировать приём"
						>
							<Zap size={18} />
							1-Клик: Сохранить экстренное согласование
						</button>
					) : (
						<button
							type="button"
							className="dms-btn dms-btn-primary"
							onClick={handleSave}
							title="Сохранить параметры гарантийного письма ДМС"
						>
							<FileCheck size={18} />
							Сохранить гарантийное письмо
						</button>
					)}
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
