/**
 * DmsGuaranteeLetterModal.tsx — Модальное окно учета и редактирования гарантийных писем ДМС,
 * лимитов страхового покрытия, франшиз, исключений и согласования номенклатурных услуг 804н.
 */

import {
	AlertCircle,
	AlertTriangle,
	Calculator,
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	Clock,
	FileCheck,
	FileText,
	Info,
	Percent,
	Plus,
	Search,
	Shield,
	Trash2,
	X,
	Zap,
} from "lucide-react";
import React, { useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast";
import "./insurance.css";
import {
	calculateServiceDmsDistribution,
	DMS_STANDARD_EXCLUSIONS,
	formatRubKopecks,
	NOMENCLATURE_804N_CATALOG,
	Nomenclature804nItem,
	RUSSIAN_DMS_INSURERS,
	search804nServices,
	type DmsGuaranteeLetter,
} from "./insuranceMath";

export interface DmsGuaranteeLetterModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: {
		readonly id: string;
		readonly fullName: string;
		readonly birthDate?: string | undefined;
		readonly policyNumber?: string | undefined;
		readonly insuranceCompany?: string | undefined;
	} | undefined;
	readonly initialLetter?: DmsGuaranteeLetter | null | undefined;
	readonly onSave?: ((letter: DmsGuaranteeLetter) => void) | undefined;
}

const COMMON_ICD10_DENTAL_DIAGNOSES = [
	{ code: "K02.1", name: "Кариес дентина" },
	{ code: "K02.2", name: "Кариес цемента" },
	{ code: "K04.0", name: "Пульпит (острый/хронический)" },
	{ code: "K04.4", name: "Острый апикальный периодонтит" },
	{ code: "K04.5", name: "Хронический апикальный периодонтит" },
	{ code: "K05.1", name: "Хронический гингивит" },
	{ code: "K05.3", name: "Хронический пародонтит" },
	{ code: "K08.1", name: "Потеря зубов вследствие удаления/травмы" },
];

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
	const maxCoverageInputId = useId();
	const usedAmountInputId = useId();
	const franchiseTypeSelectId = useId();
	const franchiseValueInputId = useId();
	const statusSelectId = useId();
	const serviceSearchInputId = useId();
	const notesTextareaId = useId();
	const simPriceInputId = useId();
	const simQtyInputId = useId();

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
		initialLetter?.letterNumber || `ГП-${Math.floor(100000 + Math.random() * 900000)}`,
	);
	const [isEmergencyCare, setIsEmergencyCare] = useState<boolean>(false);
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
		initialLetter?.programExclusions || [
			"orthodontics",
			"implantology",
			"whitening",
			"veneers",
			"prosthetics_precious",
		],
	);
	const [approvedServiceCodes, setApprovedServiceCodes] = useState<string[]>(
		initialLetter?.approvedServiceCodes || [
			"A16.07.002.001",
			"A16.07.030.001",
			"A16.07.008.001",
			"B01.003.004.001",
		],
	);
	const [approvedDiagnosisCodes, setApprovedDiagnosisCodes] = useState<string[]>(
		initialLetter?.approvedDiagnosisCodes || ["K02.1", "K04.0"],
	);
	const [notes, setNotes] = useState<string>(initialLetter?.notes || "");
	const [status, setStatus] = useState<"active" | "expired" | "exhausted" | "cancelled">(
		initialLetter?.status || "active",
	);

	// Поиск услуг 804н
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("all");

	// Интерактивный симулятор доплаты
	const [simulatedPriceRub, setSimulatedPriceRub] = useState<number>(12500);
	const [simulatedQuantity, setSimulatedQuantity] = useState<number>(1);
	const [simulatedIsExcluded, setSimulatedIsExcluded] = useState<boolean>(false);

	if (!isOpen) return null;

	const activeInsurer = RUSSIAN_DMS_INSURERS.find((i) => i.key === insurerKey);
	const insurerDisplayName =
		insurerKey === "custom"
			? customInsurerName || "Пользовательская страховая компания"
			: activeInsurer?.shortName || "Страховая компания";

	const remainingLimitRub = Math.max(0, maxCoverageRub - usedAmountRub);

	// Фильтрация каталога 804н
	const filteredCatalog = search804nServices(searchQuery).filter((item) => {
		if (selectedCategoryTab === "all") return true;
		return item.category === selectedCategoryTab;
	});

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

	// Результат симулятора доплаты (Copay)
	const simulationResult = calculateServiceDmsDistribution({
		priceRub: simulatedPriceRub,
		quantity: simulatedQuantity,
		isExcluded: simulatedIsExcluded,
		franchisePct: franchiseType === "percent" ? franchisePct : 0,
		franchiseFixedRub: franchiseType === "fixed_rub" ? franchiseFixedRub : 0,
		remainingLetterLimitRub: remainingLimitRub,
		isExplicitlyApproved: true,
	});

	const handleSave = () => {
		if (!policyNumber.trim() && !isEmergencyCare) {
			showToast("Укажите номер полиса ДМС", "warning");
			return;
		}
		if (!letterNumber.trim() && !isEmergencyCare) {
			showToast("Укажите номер гарантийного письма", "warning");
			return;
		}
		if (maxCoverageRub <= 0 && !isEmergencyCare) {
			showToast("Лимит покрытия должен быть больше 0 ₽", "warning");
			return;
		}

		const resolvedPolicy = policyNumber.trim() || (patient?.policyNumber || "ЭКСТРЕННЫЙ-ДМС");
		const resolvedLetterNum = letterNumber.trim() || `ГП-ЭКСТРЕННЫЙ-${Date.now()}`;
		const resolvedCoverage = maxCoverageRub > 0 ? maxCoverageRub : 50000;

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
			maxCoverageRub,
			usedAmountRub,
			franchisePct: franchiseType === "percent" ? franchisePct : 0,
			franchiseType,
			franchiseFixedRub: franchiseType === "fixed_rub" ? franchiseFixedRub : 0,
			programExclusions: selectedExclusions,
			approvedServiceCodes,
			approvedDiagnosisCodes,
			notes: notes.trim(),
			status,
		};

		if (onSave) {
			onSave(letter);
		}
		showToast(
			`Гарантийное письмо № ${letter.letterNumber} (${letter.insurerName}) успешно сохранено`,
			"success",
		);
		onClose();
	};

	return createPortal(
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
							<div>
								<div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted, #64748b)" }}>Застрахованное лицо (Пациент)</div>
								<div style={{ fontSize: "1.05rem", fontWeight: 700 }}>{patient.fullName}</div>
								{patient.birthDate && (
									<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>Дата рождения: {patient.birthDate}</div>
								)}
							</div>
							<div style={{ display: "flex", gap: "8px" }}>
								<span className={`dms-badge dms-badge-${status}`}>
									<CheckCircle2 size={12} />
									{status === "active" ? "Активно" : status === "expired" ? "Истекло" : status === "exhausted" ? "Исчерпано" : "Отозвано"}
								</span>
							</div>
						</div>
					)}

					{/* 1. Блок страховщика и реквизитов письма */}
					<div className="dms-card">
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
							<h3 className="dms-card-title" style={{ margin: 0 }}>
								<Shield size={18} className="text-sky-600" />
								1. Страховая компания и реквизиты гарантийного письма
							</h3>

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
									🚨 Острая боль / Экстренная помощь
								</span>
							</label>
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
									Мандат 8e: Задержка гарантийного письма ДМС или превышение франшизы НЕ блокирует приём врача. Требуется досылка гарантийного письма ДМС.
								</span>
							</div>
						)}

						{/* 1-клик быстрый выбор топ-4 страховщиков РФ */}
						<div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", marginBottom: "14px" }}>
							<span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted, #64748b)" }}>
								1-Клик выбор:
							</span>
							{[
								{ key: "sogaz", name: "СОГАЗ" },
								{ key: "ingosstrakh", name: "Ингосстрах" },
								{ key: "reso", name: "РЕСО-Гарантия" },
								{ key: "alfastrakh", name: "АльфаСтрахование" },
							].map((ins) => (
								<button
									key={ins.key}
									type="button"
									onClick={() => setInsurerKey(ins.key)}
									style={{
										padding: "4px 10px",
										borderRadius: "6px",
										border: insurerKey === ins.key ? "1px solid var(--teal, #0d9488)" : "1px solid var(--line, #e2e8f0)",
										background: insurerKey === ins.key ? "var(--teal, #0d9488)" : "var(--paper, #ffffff)",
										color: insurerKey === ins.key ? "#ffffff" : "inherit",
										fontWeight: 600,
										fontSize: "0.75rem",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: "4px",
									}}
								>
									{insurerKey === ins.key && <Check size={12} />}
									{ins.name}
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
					<div className="dms-card">
						<h3 className="dms-card-title">
							<Calculator size={18} className="text-emerald-600" />
							2. Лимиты страхового покрытия и франшиза (Copay)
						</h3>

						<div className="dms-grid-3">
							<div className="dms-field-group">
								<label htmlFor={maxCoverageInputId} className="dms-label">Согласованный лимит ГП (₽) *</label>
								<input
									id={maxCoverageInputId}
									type="number"
									min="0"
									step="500"
									value={maxCoverageRub}
									onChange={(e) => setMaxCoverageRub(Number(e.target.value) || 0)}
									className="dms-input font-mono font-bold"
								/>
							</div>

							<div className="dms-field-group">
								<label htmlFor={usedAmountInputId} className="dms-label">Израсходовано по ГП (₽)</label>
								<input
									id={usedAmountInputId}
									type="number"
									min="0"
									step="100"
									value={usedAmountRub}
									onChange={(e) => setUsedAmountRub(Number(e.target.value) || 0)}
									className="dms-input font-mono"
								/>
							</div>

							<div className="dms-field-group">
								<span className="dms-label">Остаток лимита</span>
								<div className="dms-input font-mono font-bold flex items-center bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
									{formatRubKopecks(remainingLimitRub)}
								</div>
							</div>
						</div>

						{/* Франшиза */}
						<div className="dms-grid-3" style={{ marginTop: "14px" }}>
							<div className="dms-field-group">
								<label htmlFor={franchiseTypeSelectId} className="dms-label">Тип франшизы / доплаты</label>
								<select
									id={franchiseTypeSelectId}
									value={franchiseType}
									onChange={(e) => setFranchiseType(e.target.value as "percent" | "fixed_rub")}
									className="dms-select"
								>
									<option value="percent">Процентная франшиза (% доплаты пациента)</option>
									<option value="fixed_rub">Фиксированная франшиза (₽ за визит)</option>
								</select>
							</div>

							{franchiseType === "percent" ? (
								<div className="dms-field-group">
									<label htmlFor={franchiseValueInputId} className="dms-label">Размер франшизы (%)</label>
									<input
										id={franchiseValueInputId}
										type="number"
										min="0"
										max="100"
										value={franchisePct}
										onChange={(e) => setFranchisePct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
										className="dms-input font-mono"
										placeholder="0 — 100%"
									/>
								</div>
							) : (
								<div className="dms-field-group">
									<label htmlFor={franchiseValueInputId} className="dms-label">Сумма франшизы (₽)</label>
									<input
										id={franchiseValueInputId}
										type="number"
										min="0"
										step="100"
										value={franchiseFixedRub}
										onChange={(e) => setFranchiseFixedRub(Number(e.target.value) || 0)}
										className="dms-input font-mono"
									/>
								</div>
							)}

							<div className="dms-field-group">
								<label htmlFor={statusSelectId} className="dms-label">Статус гарантийного письма</label>
								<select
									id={statusSelectId}
									value={status}
									onChange={(e) => setStatus(e.target.value as "active" | "expired" | "exhausted" | "cancelled")}
									className="dms-select"
								>
									<option value="active">Активно (в работе)</option>
									<option value="exhausted">Исчерпан лимит</option>
									<option value="expired">Истек срок действия</option>
									<option value="cancelled">Отозвано / Аннулировано</option>
								</select>
							</div>
						</div>
					</div>

					{/* 3. Исключения страховой программы */}
					<div className="dms-card">
						<h3 className="dms-card-title">
							<AlertTriangle size={18} className="text-[var(--warn-fg,#d97706)]" />
							3. Исключения из программы ДМС (100% доплата пациента)
						</h3>
						<p style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)", margin: "0 0 12px 0" }}>
							Услуги из отмеченных категорий не покрываются страховщиком и автоматически выставляются в счет пациенту.
						</p>

						<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
							{DMS_STANDARD_EXCLUSIONS.map((ex) => {
								const isChecked = selectedExclusions.includes(ex.key);
								return (
									<label
										key={ex.key}
										className={`dms-checkbox-pill ${isChecked ? "active" : ""}`}
										title={ex.description}
									>
										<input
											type="checkbox"
											checked={isChecked}
											onChange={() => toggleExclusion(ex.key)}
										/>
										<span>{ex.title}</span>
									</label>
								);
							})}
						</div>
					</div>

					{/* 4. Согласованные услуги Номенклатуры 804н и диагнозы МКБ-10 */}
					<div className="dms-card">
						<h3 className="dms-card-title">
							<CheckCircle2 size={18} className="text-[var(--brand-primary,#0d9488)]" />
							4. Номенклатура Минздрава 804н: Согласованные услуги и диагнозы МКБ-10
						</h3>

						{/* Диагнозы МКБ-10 */}
						<div style={{ marginBottom: "16px" }}>
							<div className="dms-label" style={{ marginBottom: "8px" }}>Разрешенные диагнозы (МКБ-10):</div>
							<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
								{COMMON_ICD10_DENTAL_DIAGNOSES.map((diag) => {
									const isApproved = approvedDiagnosisCodes.includes(diag.code);
									return (
										<button
											key={diag.code}
											type="button"
											className={`dms-btn ${isApproved ? "dms-btn-primary" : "dms-btn-secondary"}`}
											onClick={() => toggleDiagnosis(diag.code)}
											style={{ padding: "6px 12px", fontSize: "0.75rem", minHeight: "44px" }}
										>
											{isApproved && <Check size={14} />}
											<strong>{diag.code}</strong> — {diag.name}
										</button>
									);
								})}
							</div>
						</div>

						{/* Поиск услуг 804н */}
						<div className="dms-field-group" style={{ marginBottom: "12px" }}>
							<label htmlFor={serviceSearchInputId} className="dms-label">Поиск номенклатурных услуг 804н для добавления в ГП</label>
							<div style={{ position: "relative" }}>
								<Search size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "var(--muted, #64748b)" }} />
								<input
									id={serviceSearchInputId}
									type="text"
									placeholder="Поиск по коду (A16.07...) или названию (пломба, эндодонтия, удаление)..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="dms-input"
									style={{ paddingLeft: "42px" }}
								/>
							</div>
						</div>

						{/* Список услуг */}
						<div style={{ maxHeight: "240px", overflowY: "auto", border: "1px solid var(--line, #e2e8f0)", borderRadius: "12px", padding: "8px" }}>
							{filteredCatalog.map((item) => {
								const isSelected = approvedServiceCodes.includes(item.code);
								return (
									<div
										key={item.code}
										className={`dms-service-item ${isSelected ? "selected" : ""}`}
									>
										<div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, paddingRight: "12px" }}>
											<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
												<span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary, #0284c7)" }}>
													{item.code}
												</span>
												<span className="dms-badge dms-badge-active" style={{ fontSize: "0.6875rem", padding: "2px 8px" }}>
													{item.categoryTitleRu}
												</span>
											</div>
											<div style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{item.name}</div>
											<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
												Тариф: {formatRubKopecks(item.defaultPriceRub)} {item.uet ? `(${item.uet} УЕТ)` : ""}
											</div>
										</div>

										<button
											type="button"
											className={`dms-btn ${isSelected ? "dms-btn-primary" : "dms-btn-secondary"}`}
											onClick={() => toggleApprovedService(item.code)}
											style={{ minHeight: "44px", minWidth: "120px" }}
										>
											{isSelected ? (
												<>
													<Check size={16} /> Согласовано
												</>
											) : (
												<>
													<Plus size={16} /> Согласовать
												</>
											)}
										</button>
									</div>
								);
							})}
						</div>
					</div>

					{/* 5. Интерактивный калькулятор-симулятор доплаты (Live Copay Preview) */}
					<div className="dms-card" style={{ background: "rgba(2, 132, 199, 0.03)", borderColor: "rgba(2, 132, 199, 0.2)" }}>
						<h3 className="dms-card-title">
							<Calculator size={18} className="text-[var(--brand-primary,#0d9488)]" />
							5. Проверка распределения сумм (Live Copay Simulator)
						</h3>

						<div className="dms-grid-3">
							<div className="dms-field-group">
								<label htmlFor={simPriceInputId} className="dms-label">Пример стоимости приема (₽)</label>
								<input
									id={simPriceInputId}
									type="number"
									value={simulatedPriceRub}
									onChange={(e) => setSimulatedPriceRub(Number(e.target.value) || 0)}
									className="dms-input font-mono"
								/>
							</div>

							<div className="dms-field-group">
								<label htmlFor={simQtyInputId} className="dms-label">Количество услуг</label>
								<input
									id={simQtyInputId}
									type="number"
									min="1"
									value={simulatedQuantity}
									onChange={(e) => setSimulatedQuantity(Number(e.target.value) || 1)}
									className="dms-input font-mono"
								/>
							</div>

							<div className="dms-field-group">
								<span className="dms-label">Исключение из ДМС?</span>
								<label className={`dms-checkbox-pill ${simulatedIsExcluded ? "active" : ""}`} style={{ marginTop: "0" }}>
									<input
										type="checkbox"
										checked={simulatedIsExcluded}
										onChange={(e) => setSimulatedIsExcluded(e.target.checked)}
									/>
									<span>{simulatedIsExcluded ? "Да (Исключение)" : "Нет (Покрывается)"}</span>
								</label>
							</div>
						</div>

						{/* Результат расчета */}
						<div className="dms-stats-row" style={{ marginTop: "14px" }}>
							<div className="dms-stat-card">
								<span className="dms-stat-label">Итого стоимость</span>
								<span className="dms-stat-value">{formatRubKopecks(simulationResult.lineTotalRub)}</span>
							</div>
							<div className="dms-stat-card" style={{ borderColor: "#10b981" }}>
								<span className="dms-stat-label">Покрыто ДМС</span>
								<span className="dms-stat-value text-[var(--ok-fg,#059669)]">
									{formatRubKopecks(simulationResult.dmsCoveredRub)}
								</span>
							</div>
							<div className="dms-stat-card" style={{ borderColor: "#f59e0b" }}>
								<span className="dms-stat-label">Доплата пациента (Copay)</span>
								<span className="dms-stat-value text-[var(--warn-fg,#d97706)]">
									{formatRubKopecks(simulationResult.patientPaidRub)}
								</span>
							</div>
							<div className="dms-stat-card">
								<span className="dms-stat-label">Эффективное покрытие</span>
								<span className="dms-stat-value">{simulationResult.effectiveCoveragePct}%</span>
							</div>
						</div>
						<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", marginTop: "6px" }}>
							{simulationResult.reason}
						</div>
					</div>

					{/* Примечания */}
					<div className="dms-field-group">
						<label htmlFor={notesTextareaId} className="dms-label">Служебные примечания и комментарии куратора страховой компании</label>
						<textarea
							id={notesTextareaId}
							rows={2}
							placeholder="Например: Согласовано депульпирование 16 зуба по острой боли куратором Ивановой Е.В."
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							className="dms-textarea"
						/>
					</div>
				</div>

				{/* Footer */}
				<div className="dms-modal-footer">
					<button
						type="button"
						className="dms-btn dms-btn-secondary"
						onClick={onClose}
					>
						Отмена
					</button>
					<button
						type="button"
						className="dms-btn dms-btn-primary"
						onClick={handleSave}
					>
						<FileCheck size={18} />
						Сохранить гарантийное письмо
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
