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
	<div className="form-span-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 flex-wrap mb-2">
		<div className="text-xs text-amber-950 dark:text-amber-100">
			<strong>Бланки договора и согласий со строками _______</strong>
			<p className="m-0 text-[11px] text-amber-800 dark:text-amber-300">
				Регистратор имеет право распечатать пустой договор и бланк ИДС для ручного заполнения пациентом до приема врача.
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
				className="min-h-[44px] sm:min-h-[32px] px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
				data-testid="admin-form-print-blank-contract-btn"
			>
				<FileText size={15} className="shrink-0" />
				<span>Распечатать пустой договор (_______)</span>
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
				className="min-h-[44px] sm:min-h-[32px] px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
				data-testid="admin-form-print-blank-consent-btn"
			>
				<FileText size={15} className="shrink-0" />
				<span>Распечатать пустой бланк ИДС (_______)</span>
			</button>
		</div>
	</div>
);
