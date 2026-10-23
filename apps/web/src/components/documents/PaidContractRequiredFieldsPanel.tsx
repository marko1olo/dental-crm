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
		<div className="schedule-create-missing document-required-fields-missing my-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs" role="status">
			<strong className="text-amber-800 dark:text-amber-300 font-semibold block mb-1">
				Подсказка: не заполнено {missing.length} из {requiredCount} полей:
			</strong>
			<ul className="list-disc pl-4 space-y-0.5 text-slate-700 dark:text-slate-300">
				{missing.map((entry) => (
					<li key={entry.field}>
						<span className="font-medium">{entry.label}</span> — {entry.hint}
					</li>
				))}
			</ul>
			<small className="text-slate-500 block mt-1">Поля доступны в блоке «{fieldsBlockTitle}».</small>
			<div className="mt-3 flex items-center gap-2 flex-wrap">
				<button
					type="button"
					data-testid="btn-missing-fields-print-blank-contract"
					style={{ minHeight: "44px" }}
					className="btn-missing-fields-print-blank-contract inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg bg-[var(--teal,#0d9488)] text-white font-semibold text-xs cursor-pointer shadow-xs"
					onClick={() => {
						if (onPrintBlankContract) onPrintBlankContract();
						else void printBlankMedicalContract(patient, { doctorName: doctorName ?? undefined });
					}}
					title="Распечатать пустой бланк договора со строками _______ для ручного заполнения"
				>
					<Printer size={16} aria-hidden="true" />
					<span>Печать договора (бланк со строками _______)</span>
				</button>
				<span className="text-xs text-slate-500">0 ₽ · Ручная подпись до приёма</span>
			</div>
		</div>
	);
}
