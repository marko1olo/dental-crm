import React from "react";
import { Printer } from "lucide-react";
import type { PaidContractRequiredFieldsReview } from "./paidContractRequiredFields";
import { printBlankMedicalContract, type BlankContractPatientInfo } from "../patients/blankContractPrint";

export interface PaidContractRequiredFieldsPanelProps {
	review: PaidContractRequiredFieldsReview;
	fieldsBlockTitle: string;
	onPrintBlankContract?: (() => void) | undefined;
	patient?: BlankContractPatientInfo | null | undefined;
	doctorName?: string | null | undefined;
}

export function PaidContractRequiredFieldsPanel({
	review,
	fieldsBlockTitle,
	onPrintBlankContract,
	patient,
	doctorName,
}: PaidContractRequiredFieldsPanelProps) {
	if (!review) return null;
	const requiredCount = review.requiredCount ?? 0;
	const missing = review.missing ?? [];

	if (missing.length === 0) {
		return (
			<p className="document-required-fields-ready p-3 my-3 text-xs rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
				Обязательные поля договора заполнены, все {requiredCount}. Дата и время проставятся автоматически.
			</p>
		);
	}

	return (
		<div className="document-required-fields-missing my-2.5 p-2.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs" role="status">
			<div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
				<strong className="text-[var(--ink,#0f172a)] font-semibold">
					Подсказка для стойки регистрации: не заполнено {missing.length} из {requiredCount} реквизитов
				</strong>
				<span className="text-[11px] text-[var(--muted,#64748b)]">Печать не блокируется (линии _______)</span>
			</div>
			<ul className="list-disc pl-4 space-y-0.5 text-[var(--ink-secondary,#334155)] text-[11px]">
				{missing.slice(0, 5).map((entry) => (
					<li key={entry.field}>
						<span className="font-medium">{entry.label}</span> — {entry.hint}
					</li>
				))}
				{missing.length > 5 && (
					<li className="text-[var(--muted,#64748b)] list-none -ml-4 mt-1">
						... и ещё {missing.length - 5} полей в блоке «{fieldsBlockTitle}»
					</li>
				)}
			</ul>
			<div className="mt-2.5 flex items-center gap-2 flex-wrap">
				<button
					type="button"
					data-testid="btn-missing-fields-print-blank-contract"
					style={{ minHeight: "44px" }}
					className="btn-missing-fields-print-blank-contract secondary-button inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-medium text-xs cursor-pointer hover:border-[var(--teal,#0d9488)] transition-colors"
					onClick={() => {
						if (onPrintBlankContract) onPrintBlankContract();
						else void printBlankMedicalContract(patient, { doctorName: doctorName ?? undefined });
					}}
					title="Распечатать пустой бланк договора со строками _______ для ручного заполнения"
				>
					<Printer size={14} aria-hidden="true" className="text-[var(--muted,#64748b)]" />
					<span>Бланк со строками _______</span>
				</button>
				<span className="text-[11px] text-[var(--muted,#64748b)]">Ручная подпись на бумаге до приёма</span>
			</div>
		</div>
	);
}
