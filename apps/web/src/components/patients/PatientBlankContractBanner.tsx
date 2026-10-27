import React from "react";
import { FileText } from "lucide-react";
import {
	printBlankMedicalContract,
	printBlankMedicalConsent,
} from "./blankContractPrint";
import type { PatientAdministrativeProfileDraft } from "./patientsViewModules";

export const PatientBlankContractBanner: React.FC<{
	draft: PatientAdministrativeProfileDraft;
}> = ({ draft }) => (
	<div className="form-span-2 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-3 flex-wrap mb-2">
		<div className="text-xs text-[var(--ink)]">
			<strong className="font-bold">Бланки договора и согласий</strong>
			<p className="m-0 text-[11px] text-[var(--muted)]">
				Печать чистых бланков договора и согласия на лечение для заполнения пациентом в зоне ожидания.
			</p>
		</div>
		<div className="flex items-center gap-2 flex-wrap">
			<button
				type="button"
				onClick={() => {
					void printBlankMedicalContract({
						administrativeProfile: {
							identityDocument: draft.identityDocument,
							registrationAddress: draft.registrationAddress,
							taxpayerInn: draft.taxpayerInn,
							snils: draft.snils,
						},
					});
				}}
				className="secondary-button min-h-[44px] sm:min-h-[32px] px-3.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
				data-testid="admin-form-print-blank-contract-btn"
				title="Распечатать чистый бланк договора"
			>
				<FileText size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
				<span>Печать бланка договора</span>
			</button>
			<button
				type="button"
				onClick={() => {
					void printBlankMedicalConsent({
						administrativeProfile: {
							identityDocument: draft.identityDocument,
							registrationAddress: draft.registrationAddress,
							taxpayerInn: draft.taxpayerInn,
							snils: draft.snils,
						},
					});
				}}
				className="secondary-button min-h-[44px] sm:min-h-[32px] px-3.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
				data-testid="admin-form-print-blank-consent-btn"
				title="Распечатать чистый бланк согласия на лечение"
			>
				<FileText size={15} className="shrink-0 text-teal-600 dark:text-teal-400" />
				<span>Печать бланка согласия</span>
			</button>
		</div>
	</div>
);
