import React from "react";
import { FileText, Printer, Plus } from "lucide-react";

export interface PatientContractsHeaderProps {
	onPrintBlank: () => void;
	onCreateContract?: (() => void) | undefined;
}

export const PatientContractsHeader: React.FC<PatientContractsHeaderProps> = ({
	onPrintBlank,
	onCreateContract,
}) => {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--line)] pb-3">
			<div className="flex items-center gap-2.5">
				<div className="w-8 h-8 rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] flex items-center justify-center font-bold shrink-0">
					<FileText size={18} />
				</div>
				<div>
					<h3 className="text-[14px] font-bold text-[var(--ink)] leading-tight flex items-center gap-2">
						<span>Договоры на оказание платных медицинских услуг</span>
						<span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]" title="Постановление Правительства РФ № 736">
							ПП РФ № 736
						</span>
					</h3>
					<p className="text-[12px] text-[var(--muted)]">
						Официальные договоры, акты и соглашения пациента
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={onPrintBlank}
					className="secondary-button h-8 px-3 text-xs inline-flex items-center gap-1.5"
					data-testid="btn-print-blank-contract-section"
					title="Распечатать чистый бланк договора со строками «________» для ручного заполнения"
				>
					<Printer size={14} className="text-teal-600 dark:text-teal-400" />
					<span>Бланк со строками «________»</span>
				</button>

				{onCreateContract && (
					<button
						type="button"
						onClick={onCreateContract}
						className="primary-button h-8 px-3 text-xs inline-flex items-center gap-1.5"
						data-testid="btn-create-new-contract-section"
					>
						<Plus size={14} />
						<span>Новый договор</span>
					</button>
				)}
			</div>
		</div>
	);
};
