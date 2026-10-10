/**
 * DmsInsurerAndPolicyForm.tsx — Форма выбора страховой компании РФ в 1 клик,
 * реквизитов полиса ДМС, сроков действия гарантийного письма и прикрепления PDF-скана.
 */

import {
	AlertTriangle,
	Building2,
	Check,
	CheckCircle2,
	FileCheck2,
	Shield,
} from "lucide-react";
import React, { useId, useRef } from "react";
import { DmsQuickActionBanners } from "../DmsQuickActionBanners";
import { RUSSIAN_DMS_INSURERS, type DmsInsurerItem } from "../insuranceMath";
import {
	EXPRESS_GUARANTEE_LETTER_PRESETS,
	QUICK_RUSSIAN_DMS_INSURER_CHIPS,
	type ExpressDmsGuaranteePreset,
} from "./types";

export interface DmsInsurerAndPolicyFormProps {
	readonly insurerKey: string;
	readonly customInsurerName: string;
	readonly policyNumber: string;
	readonly letterNumber: string;
	readonly issueDate: string;
	readonly validFrom: string;
	readonly validUntil: string;
	readonly isEmergencyCare: boolean;
	readonly isDeferredScan: boolean;
	readonly attachedScanFileName: string;
	readonly activeInsurer?: DmsInsurerItem | undefined;
	readonly onInsurerKeyChange: (key: string) => void;
	readonly onCustomInsurerNameChange: (val: string) => void;
	readonly onPolicyNumberChange: (val: string) => void;
	readonly onLetterNumberChange: (val: string) => void;
	readonly onIssueDateChange: (val: string) => void;
	readonly onValidFromChange: (val: string) => void;
	readonly onValidUntilChange: (val: string) => void;
	readonly onEmergencyCareChange: (val: boolean) => void;
	readonly onDeferredScanChange: (val: boolean) => void;
	readonly onAttachedScanFileNameChange: (fileName: string) => void;
	readonly onActivateEmergency: () => void;
	readonly onApplyExpressPreset: (preset: ExpressDmsGuaranteePreset) => void;
}

export function DmsInsurerAndPolicyForm({
	insurerKey,
	customInsurerName,
	policyNumber,
	letterNumber,
	issueDate,
	validFrom,
	validUntil,
	isEmergencyCare,
	isDeferredScan,
	attachedScanFileName,
	activeInsurer,
	onInsurerKeyChange,
	onCustomInsurerNameChange,
	onPolicyNumberChange,
	onLetterNumberChange,
	onIssueDateChange,
	onValidFromChange,
	onValidUntilChange,
	onEmergencyCareChange,
	onDeferredScanChange,
	onAttachedScanFileNameChange,
	onActivateEmergency,
	onApplyExpressPreset,
}: DmsInsurerAndPolicyFormProps) {
	const insurerSelectId = useId();
	const policyNumberInputId = useId();
	const letterNumberInputId = useId();
	const issueDateInputId = useId();
	const validFromInputId = useId();
	const validUntilInputId = useId();
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	return (
		<>
			<DmsQuickActionBanners
				isEmergencyCare={isEmergencyCare}
				onActivateEmergency={onActivateEmergency}
				onApplyExpressPreset={onApplyExpressPreset}
				presets={EXPRESS_GUARANTEE_LETTER_PRESETS}
			/>

			{/* 1. Блок страховщика и реквизитов письма */}
			<div className="dms-card" data-testid="dms-insurer-policy-form">
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						flexWrap: "wrap",
						gap: "8px",
						marginBottom: "12px",
					}}
				>
					<h3 className="dms-card-title" style={{ margin: 0 }}>
						<Shield size={18} style={{ color: "var(--teal, #0d9488)" }} />
						<span>1. Страховая компания и реквизиты гарантийного письма</span>
					</h3>

					<div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
						<label
							style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								cursor: "pointer",
								padding: "4px 8px",
								borderRadius: "6px",
								background: isEmergencyCare ? "rgba(245, 158, 11, 0.15)" : "transparent",
								border: isEmergencyCare
									? "1px solid var(--warn-fg, #d97706)"
									: "1px solid var(--line, #e2e8f0)",
								fontSize: "0.8125rem",
								fontWeight: 600,
							}}
						>
							<input
								type="checkbox"
								checked={isEmergencyCare}
								onChange={(e) => onEmergencyCareChange(e.target.checked)}
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
								border: isDeferredScan
									? "1px solid var(--ok-fg, #10b981)"
									: "1px solid var(--line, #e2e8f0)",
								fontSize: "0.8125rem",
								fontWeight: 600,
							}}
							title="Отложенный ввод скана: отсутствие файла в базе не блокирует прием пациента и расчет счетов"
						>
							<input
								type="checkbox"
								checked={isDeferredScan}
								onChange={(e) => onDeferredScanChange(e.target.checked)}
								style={{ width: "15px", height: "15px", cursor: "pointer" }}
							/>
							<span style={{ color: isDeferredScan ? "var(--ok-fg, #059669)" : "inherit" }}>
								<CheckCircle2 size={14} className="inline mr-1 text-emerald-600" /> Отложенный ввод скана (досылка)
							</span>
						</label>

						<input
							ref={fileInputRef}
							type="file"
							accept=".pdf,image/*"
							style={{ display: "none" }}
							onChange={(e) => {
								const file = e.target.files?.[0];
								if (file) {
									onAttachedScanFileNameChange(file.name);
								}
							}}
						/>
						<button
							type="button"
							className="dms-btn dms-btn-secondary"
							onClick={() => fileInputRef.current?.click()}
							title="Прикрепить скан гарантийного письма в формате PDF или изображения"
						>
							<FileCheck2 size={14} />
							<span>
								{attachedScanFileName
									? `Скан: ${attachedScanFileName}`
									: "Скан ГП (PDF)"}
							</span>
						</button>
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
					<span
						style={{
							fontSize: "0.75rem",
							fontWeight: 600,
							color: "var(--muted, #64748b)",
							whiteSpace: "nowrap",
							flexShrink: 0,
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<Building2 size={13} />
						<span>1-Клик выбор:</span>
					</span>
					{QUICK_RUSSIAN_DMS_INSURER_CHIPS.map((ins) => (
						<button
							key={ins.key}
							type="button"
							onClick={() => onInsurerKeyChange(ins.key)}
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
						<label htmlFor={insurerSelectId} className="dms-label">
							Страховая компания (ДМС) *
						</label>
						<select
							id={insurerSelectId}
							value={insurerKey}
							onChange={(e) => onInsurerKeyChange(e.target.value)}
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
							<label htmlFor={policyNumberInputId} className="dms-label">
								Наименование компании *
							</label>
							<input
								id={policyNumberInputId}
								type="text"
								placeholder="Например, САО «МедСтрах»"
								value={customInsurerName}
								onChange={(e) => onCustomInsurerNameChange(e.target.value)}
								className="dms-input"
							/>
						</div>
					) : (
						<div className="dms-field-group">
							<label htmlFor={policyNumberInputId} className="dms-label">
								Номер полиса ДМС *
							</label>
							<input
								id={policyNumberInputId}
								type="text"
								placeholder="000-00-000000"
								value={policyNumber}
								onChange={(e) => onPolicyNumberChange(e.target.value)}
								className="dms-input"
							/>
						</div>
					)}

					<div className="dms-field-group">
						<label htmlFor={letterNumberInputId} className="dms-label">
							Номер гарантийного письма *
						</label>
						<input
							id={letterNumberInputId}
							type="text"
							placeholder="ГП-123456"
							value={letterNumber}
							onChange={(e) => onLetterNumberChange(e.target.value)}
							className="dms-input"
						/>
					</div>
				</div>

				{insurerKey !== "custom" && activeInsurer && (
					<div
						style={{
							marginTop: "12px",
							fontSize: "0.8125rem",
							color: "var(--muted, #64748b)",
							background: "rgba(13, 148, 136, 0.06)",
							padding: "10px 14px",
							borderRadius: "10px",
							border: "1px solid rgba(13, 148, 136, 0.2)",
						}}
					>
						<strong>{activeInsurer.fullName}</strong> (ИНН: {activeInsurer.inn}) &bull; Куратор ДМС: {activeInsurer.phone} &bull; {activeInsurer.standardDmsTerms}
					</div>
				)}

				<div className="dms-grid-3" style={{ marginTop: "14px" }}>
					<div className="dms-field-group">
						<label htmlFor={issueDateInputId} className="dms-label">
							Дата выдачи письма
						</label>
						<input
							id={issueDateInputId}
							type="date"
							value={issueDate}
							onChange={(e) => onIssueDateChange(e.target.value)}
							className="dms-input"
						/>
					</div>

					<div className="dms-field-group">
						<label htmlFor={validFromInputId} className="dms-label">
							Действует с
						</label>
						<input
							id={validFromInputId}
							type="date"
							value={validFrom}
							onChange={(e) => onValidFromChange(e.target.value)}
							className="dms-input"
						/>
					</div>

					<div className="dms-field-group">
						<label htmlFor={validUntilInputId} className="dms-label">
							Действует по (срок)
						</label>
						<input
							id={validUntilInputId}
							type="date"
							value={validUntil}
							onChange={(e) => onValidUntilChange(e.target.value)}
							className="dms-input"
						/>
					</div>
				</div>
			</div>
		</>
	);
}
