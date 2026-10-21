/**
 * DmsLetterDateInputs.tsx — Поля дат выдачи и срока действия гарантийного письма ДМС
 */

import React from "react";

export interface DmsLetterDateInputsProps {
	readonly issueDate: string;
	readonly validFrom: string;
	readonly validUntil: string;
	readonly onIssueDateChange: (val: string) => void;
	readonly onValidFromChange: (val: string) => void;
	readonly onValidUntilChange: (val: string) => void;
	readonly issueDateInputId: string;
	readonly validFromInputId: string;
	readonly validUntilInputId: string;
}

export function DmsLetterDateInputs({
	issueDate,
	validFrom,
	validUntil,
	onIssueDateChange,
	onValidFromChange,
	onValidUntilChange,
	issueDateInputId,
	validFromInputId,
	validUntilInputId,
}: DmsLetterDateInputsProps) {
	return (
		<div className="dms-grid-3" style={{ marginTop: "14px" }}>
			<div className="dms-field-group">
				<label htmlFor={issueDateInputId} className="dms-label">Дата выдачи письма</label>
				<input
					id={issueDateInputId}
					type="date"
					value={issueDate}
					onChange={(e) => onIssueDateChange(e.target.value)}
					className="dms-input"
				/>
			</div>
			<div className="dms-field-group">
				<label htmlFor={validFromInputId} className="dms-label">Действует с</label>
				<input
					id={validFromInputId}
					type="date"
					value={validFrom}
					onChange={(e) => onValidFromChange(e.target.value)}
					className="dms-input"
				/>
			</div>
			<div className="dms-field-group">
				<label htmlFor={validUntilInputId} className="dms-label">Действует по (срок)</label>
				<input
					id={validUntilInputId}
					type="date"
					value={validUntil}
					onChange={(e) => onValidUntilChange(e.target.value)}
					className="dms-input"
				/>
			</div>
		</div>
	);
}
