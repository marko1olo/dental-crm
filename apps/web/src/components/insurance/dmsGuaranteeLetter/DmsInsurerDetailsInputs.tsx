/**
 * DmsInsurerDetailsInputs.tsx — Поля выбора страховой компании, номера полиса и номера гарантийного письма
 */

import React from "react";
import { RUSSIAN_DMS_INSURERS, type DmsInsurerItem } from "../insuranceMath.js";

export interface DmsInsurerDetailsInputsProps {
	readonly insurerKey: string;
	readonly customInsurerName: string;
	readonly policyNumber: string;
	readonly letterNumber: string;
	readonly activeInsurer?: DmsInsurerItem | undefined;
	readonly onInsurerKeyChange: (key: string) => void;
	readonly onCustomInsurerNameChange: (val: string) => void;
	readonly onPolicyNumberChange: (val: string) => void;
	readonly onLetterNumberChange: (val: string) => void;
	readonly insurerSelectId: string;
	readonly policyNumberInputId: string;
	readonly letterNumberInputId: string;
}

export function DmsInsurerDetailsInputs({
	insurerKey,
	customInsurerName,
	policyNumber,
	letterNumber,
	activeInsurer,
	onInsurerKeyChange,
	onCustomInsurerNameChange,
	onPolicyNumberChange,
	onLetterNumberChange,
	insurerSelectId,
	policyNumberInputId,
	letterNumberInputId,
}: DmsInsurerDetailsInputsProps) {
	return (
		<>
			<div className="dms-grid-3">
				<div className="dms-field-group">
					<label htmlFor={insurerSelectId} className="dms-label">Страховая компания (ДМС) *</label>
					<select
						id={insurerSelectId}
						value={insurerKey}
						onChange={(e) => onInsurerKeyChange(e.target.value)}
						className="dms-select"
					>
						{RUSSIAN_DMS_INSURERS.map((ins) => (
							<option key={ins.key} value={ins.key}>{ins.shortName}</option>
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
							onChange={(e) => onCustomInsurerNameChange(e.target.value)}
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
							onChange={(e) => onPolicyNumberChange(e.target.value)}
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
						onChange={(e) => onLetterNumberChange(e.target.value)}
						className="dms-input"
					/>
				</div>
			</div>
			{insurerKey !== "custom" && activeInsurer && (
				<div style={{ marginTop: "12px", fontSize: "0.8125rem", color: "var(--muted, #64748b)", background: "rgba(13, 148, 136, 0.06)", padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(13, 148, 136, 0.2)" }}>
					<strong>{activeInsurer.fullName}</strong> (ИНН: {activeInsurer.inn}) &bull; Куратор ДМС: {activeInsurer.phone} &bull; {activeInsurer.standardDmsTerms}
				</div>
			)}
		</>
	);
}
