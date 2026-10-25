/**
 * apps/web/src/components/settings/clinic/legalModules/ClinicRequisitesCard.tsx
 *
 * Clinic legal & banking requisites: INN, KPP, OGRN/OGRNIP,
 * bank details (BIK, settlement account), and contract signatories.
 * Decomposed facade strictly <= 120 lines following Mandate 8b.
 */

import React from "react";
import { Building } from "lucide-react";
import { validateInn } from "./clinicLegalTypes";
import { ClinicRegistrationInputs } from "./requisites/ClinicRegistrationInputs";
import { ClinicBankingInputs } from "./requisites/ClinicBankingInputs";
import { ClinicSignatoryInputs } from "./requisites/ClinicSignatoryInputs";

export interface ClinicRequisitesCardProps {
	clinicProfileDraft: Record<string, any>;
	updateClinicProfileDraft: (field: string, value: any) => void;
}

export const ClinicRequisitesCard: React.FC<ClinicRequisitesCardProps> = ({
	clinicProfileDraft,
	updateClinicProfileDraft,
}) => {
	const inn = clinicProfileDraft.inn || "";
	const kpp = clinicProfileDraft.kpp || "";
	const ogrn = clinicProfileDraft.ogrn || "";
	const bik = clinicProfileDraft.bik || "";
	const checkingAccount = clinicProfileDraft.checkingAccount || "";

	const innValidation = validateInn(inn);
	const isIp = innValidation.type === "physical" || inn.length === 12;

	return (
		<article
			className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-5"
			data-testid="clinic-requisites-card"
		>
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] flex items-center justify-center shrink-0">
						<Building size={18} aria-hidden="true" />
					</div>
					<div>
						<h4 className="text-sm font-bold text-[var(--ink)] m-0">
							Юридические и банковские реквизиты
						</h4>
						<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
							Данные для автоматической генерации договоров, актов, счетов и фискальных чеков
						</p>
					</div>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]">
						{isIp ? "Форма: ИП (Соло-врач)" : "Форма: Юрлицо (ООО/АО)"}
					</span>
				</div>
			</div>

			<ClinicRegistrationInputs
				clinicProfileDraft={clinicProfileDraft}
				updateClinicProfileDraft={updateClinicProfileDraft}
				isIp={isIp}
				inn={inn}
				kpp={kpp}
				ogrn={ogrn}
			/>

			<ClinicBankingInputs
				clinicProfileDraft={clinicProfileDraft}
				updateClinicProfileDraft={updateClinicProfileDraft}
				bik={bik}
				checkingAccount={checkingAccount}
			/>

			<ClinicSignatoryInputs
				clinicProfileDraft={clinicProfileDraft}
				updateClinicProfileDraft={updateClinicProfileDraft}
				isIp={isIp}
			/>
		</article>
	);
};

export default ClinicRequisitesCard;
