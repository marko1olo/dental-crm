import { CheckCircle2, CreditCard } from "lucide-react";
import React from "react";
import { validateBik, validateCheckingAccount } from "../clinicLegalTypes";

interface ClinicBankingInputsProps {
	clinicProfileDraft: Record<string, any>;
	updateClinicProfileDraft: (field: string, value: any) => void;
	bik: string;
	checkingAccount: string;
}

export function ClinicBankingInputs({
	clinicProfileDraft, updateClinicProfileDraft, bik, checkingAccount,
}: ClinicBankingInputsProps) {
	const bikValidation = validateBik(bik);
	const accValidation = validateCheckingAccount(checkingAccount, bik);

	return (
		<div className="pt-3 border-t border-[var(--line)] space-y-3">
			<div className="flex items-center gap-2">
				<CreditCard size={16} className="text-[var(--teal)]" aria-hidden="true" />
				<span className="text-xs font-bold text-[var(--ink)]">
					Банковские реквизиты для безналичных расчетов
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<label className="flex flex-col gap-1 text-xs font-medium text-[var(--ink)]">
					<div className="flex items-center justify-between">
						<span>БИК Банка</span>
						{bik && bikValidation.isValid && (
							<span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold inline-flex items-center gap-1">
								<CheckCircle2 size={12} /> Корректен
							</span>
						)}
					</div>
					<input
						type="text" inputMode="numeric" data-testid="input-clinic-bik" placeholder="044525225" value={bik}
						onChange={(e) => updateClinicProfileDraft("bik", e.target.value.replace(/[^\d]/g, "").slice(0, 9))}
						className={`w-full px-3 py-2 rounded-lg border text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${
							bik && !bikValidation.isValid ? "border-amber-500" : "border-[var(--line)]"
						}`}
					/>
					<small className="text-[11px] text-[var(--muted)]">9 цифр, код ЦБ РФ</small>
				</label>

				<label className="sm:col-span-2 flex flex-col gap-1 text-xs font-medium text-[var(--ink)]">
					<div className="flex items-center justify-between">
						<span>Расчетный счет (р/с)</span>
						{checkingAccount && accValidation.isValid && (
							<span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold inline-flex items-center gap-1">
								<CheckCircle2 size={12} /> Корректен
							</span>
						)}
					</div>
					<input
						type="text" inputMode="numeric" data-testid="input-clinic-checking-account" placeholder="40702810000000000000"
						value={checkingAccount}
						onChange={(e) => updateClinicProfileDraft("checkingAccount", e.target.value.replace(/[^\d]/g, "").slice(0, 20))}
						className={`w-full px-3 py-2 rounded-lg border text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${
							checkingAccount && !accValidation.isValid ? "border-amber-500" : "border-[var(--line)]"
						}`}
					/>
					<small className="text-[10px] text-[var(--muted)]">20 цифр в валюте РФ</small>
				</label>
			</div>
		</div>
	);
}
