import React from "react";
import { AlertCircle } from "lucide-react";

export interface DocumentIssueChecklistSectionProps {
	identityChecked: boolean;
	onIdentityCheckedChange: (v: boolean) => void;
	documentOpened: boolean;
	onDocumentOpenedChange: (v: boolean) => void;
	recipientSigned: boolean;
	onRecipientSignedChange: (v: boolean) => void;
	clinicSigned: boolean;
	onClinicSignedChange: (v: boolean) => void;
	attestationReady: boolean;
	missingSteps: string[];
	missingGuidanceId: string;
}

export const DocumentIssueChecklistSection: React.FC<DocumentIssueChecklistSectionProps> = React.memo(
	function DocumentIssueChecklistSection({
		identityChecked, onIdentityCheckedChange,
		documentOpened, onDocumentOpenedChange,
		recipientSigned, onRecipientSignedChange,
		clinicSigned, onClinicSignedChange,
		attestationReady, missingSteps, missingGuidanceId,
	}) {
		const allChecked = identityChecked && documentOpened && recipientSigned && clinicSigned;

		const toggleAll = () => {
			const next = !allChecked;
			onIdentityCheckedChange(next);
			onDocumentOpenedChange(next);
			onRecipientSignedChange(next);
			onClinicSignedChange(next);
		};

		return (
			<>
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2">
					<div className="flex items-center justify-between pb-1.5 border-b border-[var(--line)]">
						<span className="text-xs font-bold text-[var(--ink)]">Чек-лист аттестации выдачи</span>
						<button
							type="button"
							className="px-2 py-0.5 text-[11px] font-semibold rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)] cursor-pointer"
							onClick={toggleAll}
						>
							{allChecked ? "Снять отметки" : "Выбрать все пункты"}
						</button>
					</div>
					<div className="document-issue-checkboxes flex flex-col gap-1.5">
						<label className="flex items-center gap-2 text-xs text-[var(--ink)] cursor-pointer">
							<input type="checkbox" checked={identityChecked} onChange={(e) => onIdentityCheckedChange(e.target.checked)} />
							<span>Личность получателя проверена</span>
						</label>
						<label className="flex items-center gap-2 text-xs text-[var(--ink)] cursor-pointer">
							<input type="checkbox" checked={documentOpened} onChange={(e) => onDocumentOpenedChange(e.target.checked)} />
							<span>HTML/PDF открыт и проверен</span>
						</label>
						<label className="flex items-center gap-2 text-xs text-[var(--ink)] cursor-pointer">
							<input type="checkbox" checked={recipientSigned} onChange={(e) => onRecipientSignedChange(e.target.checked)} />
							<span>Получатель подписал выдачу</span>
						</label>
						<label className="flex items-center gap-2 text-xs text-[var(--ink)] cursor-pointer">
							<input type="checkbox" checked={clinicSigned} onChange={(e) => onClinicSignedChange(e.target.checked)} />
							<span>Представитель клиники подписал</span>
						</label>
					</div>
				</div>

				{!attestationReady && missingSteps?.length ? (
					<div id={missingGuidanceId} role="status" aria-live="polite" className="p-2.5 px-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex flex-col gap-1.5">
						<div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400">
							<AlertCircle className="w-4 h-4 shrink-0" />
							<span>Для завершения осталось:</span>
						</div>
						<div className="flex flex-col gap-0.5 pl-5 text-xs text-rose-700 dark:text-rose-400">
							{missingSteps.map((s) => <span key={s}>· {s}</span>)}
						</div>
					</div>
				) : null}
			</>
		);
	},
);
