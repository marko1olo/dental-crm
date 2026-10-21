/**
 * DmsRegistryActParametersSection.tsx — Параметры договора и акта сдачи-приемки
 */

import { FileText } from "lucide-react";
import React, { useId } from "react";
import type { ClinicLegalInfo } from "./types.js";

export interface DmsRegistryActParametersSectionProps {
	readonly actNumber: string;
	readonly onActNumberChange: (val: string) => void;
	readonly contractNumber: string;
	readonly onContractNumberChange: (val: string) => void;
	readonly contractDate: string;
	readonly onContractDateChange: (val: string) => void;
	readonly representative: string;
	readonly onRepresentativeChange: (val: string) => void;
	readonly activeClinic: ClinicLegalInfo;
}

export function DmsRegistryActParametersSection(props: DmsRegistryActParametersSectionProps) {
	const actNumberInputId = useId();
	const contractNumberInputId = useId();
	const contractDateInputId = useId();
	const representativeInputId = useId();

	return (
		<div className="dms-card">
			<h3 className="dms-card-title">
				<FileText size={18} className="text-sky-600" />
				Параметры двустороннего акта сдачи-приемки по ДМС
			</h3>

			<div className="dms-grid-3">
				<div className="dms-field-group">
					<label htmlFor={actNumberInputId} className="dms-label">Номер акта сдачи-приемки</label>
					<input
						id={actNumberInputId}
						type="text"
						value={props.actNumber}
						onChange={(e) => props.onActNumberChange(e.target.value)}
						className="dms-input"
					/>
				</div>

				<div className="dms-field-group">
					<label htmlFor={contractNumberInputId} className="dms-label">Номер договора ДМС со страховой</label>
					<input
						id={contractNumberInputId}
						type="text"
						value={props.contractNumber}
						onChange={(e) => props.onContractNumberChange(e.target.value)}
						className="dms-input"
					/>
				</div>

				<div className="dms-field-group">
					<label htmlFor={contractDateInputId} className="dms-label">Дата договора ДМС</label>
					<input
						id={contractDateInputId}
						type="text"
						value={props.contractDate}
						onChange={(e) => props.onContractDateChange(e.target.value)}
						className="dms-input"
					/>
				</div>
			</div>

			<div className="dms-grid-2" style={{ marginTop: "12px" }}>
				<div className="dms-field-group">
					<label htmlFor={representativeInputId} className="dms-label">Представитель страховой компании (для подписи)</label>
					<input
						id={representativeInputId}
						type="text"
						value={props.representative}
						onChange={(e) => props.onRepresentativeChange(e.target.value)}
						className="dms-input"
					/>
				</div>

				<div className="dms-field-group">
					<span className="dms-label">Реквизиты клиники (Исполнитель)</span>
					<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)", padding: "10px", background: "var(--paper, #fff)", borderRadius: "10px", border: "1px solid var(--line, #cbd5e1)" }}>
						{props.activeClinic.name} &bull; ИНН: {props.activeClinic.inn} &bull; Гл. врач: {props.activeClinic.chiefDoctor}
					</div>
				</div>
			</div>
		</div>
	);
}
