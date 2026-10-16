import React from "react";

export interface DocumentIssueAttestationGridProps {
	signatureMode: string;
	onSignatureModeChange: (val: string) => void;
	signatureModeLabels: Record<string, string>;
	signedAt: string;
	onSignedAtChange: (val: string) => void;
	recipientFullName: string;
	onRecipientFullNameChange: (val: string) => void;
	recipientRole: string;
	onRecipientRoleChange: (val: string) => void;
	staffFullName: string;
	onStaffFullNameChange: (val: string) => void;
	staffRole: string;
	onStaffRoleChange: (val: string) => void;
	note: string;
	onNoteChange: (val: string) => void;
	defaultStaffName?: string | undefined;
}

const inputClass = "w-full p-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]";

export const DocumentIssueAttestationGrid: React.FC<DocumentIssueAttestationGridProps> = React.memo(
	function DocumentIssueAttestationGrid({
		signatureMode, onSignatureModeChange, signatureModeLabels,
		signedAt, onSignedAtChange,
		recipientFullName, onRecipientFullNameChange,
		recipientRole, onRecipientRoleChange,
		staffFullName, onStaffFullNameChange,
		staffRole, onStaffRoleChange,
		note, onNoteChange, defaultStaffName,
	}) {
		return (
			<div className="document-issue-attestation-grid">
				<label>
					<span className="text-xs font-semibold text-[var(--ink)]">Способ фиксации подписи</span>
					<select value={signatureMode} onChange={(e) => onSignatureModeChange(e.target.value)} className={inputClass}>
						{Object.entries(signatureModeLabels).map(([mode, label]) => (
							<option key={mode} value={mode}>{label}</option>
						))}
					</select>
				</label>
				<label>
					<span className="text-xs font-semibold text-[var(--ink)]">Дата и время фиксации</span>
					<input type="datetime-local" value={signedAt} onChange={(e) => onSignedAtChange(e.target.value)} className={inputClass} />
				</label>
				<label>
					<span className="text-xs font-semibold text-[var(--ink)]">Получатель документа</span>
					<input value={recipientFullName} onChange={(e) => onRecipientFullNameChange(e.target.value)} placeholder="ФИО получателя" className={inputClass} />
				</label>
				<label>
					<span className="text-xs font-semibold text-[var(--ink)]">Статус получателя</span>
					<input value={recipientRole} onChange={(e) => onRecipientRoleChange(e.target.value)} placeholder="пациент / представитель" className={inputClass} />
				</label>
				<label>
					<span className="text-xs font-semibold text-[var(--ink)]">Сотрудник клиники</span>
					<input value={staffFullName} onChange={(e) => onStaffFullNameChange(e.target.value)} placeholder={defaultStaffName || "ФИО сотрудника"} className={inputClass} />
				</label>
				<label>
					<span className="text-xs font-semibold text-[var(--ink)]">Роль сотрудника</span>
					<input value={staffRole} onChange={(e) => onStaffRoleChange(e.target.value)} placeholder="врач / администратор" className={inputClass} />
				</label>
				<label className="document-issue-attestation-note" style={{ gridColumn: "1 / -1" }}>
					<span className="text-xs font-semibold text-[var(--ink)]">Примечание</span>
					<textarea value={note} onChange={(e) => onNoteChange(e.target.value)} placeholder="паспорт предъявлен, код подтверждения проверен" className={`${inputClass} min-h-[56px] resize-y`} />
				</label>
			</div>
		);
	},
);
