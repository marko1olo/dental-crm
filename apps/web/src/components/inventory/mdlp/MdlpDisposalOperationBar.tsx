import { MDLP_OPERATION_CODES, type MdlpOperationCode } from "@dental/shared";
import { Plus, ShieldCheck } from "lucide-react";
import type React from "react";

export interface MdlpDisposalOperationBarProps {
	readonly operationCode: MdlpOperationCode;
	readonly onSelectOperationCode: (code: MdlpOperationCode) => void;
	readonly onAddCarpuleBatch: (
		drugType: "articaine_1_100000" | "articaine_1_200000" | "mepivacaine_plain",
		count: number,
		nameRu: string,
	) => void;
}

export const MdlpDisposalOperationBar: React.FC<MdlpDisposalOperationBarProps> = ({
	operationCode,
	onSelectOperationCode,
	onAddCarpuleBatch,
}) => {
	return (
		<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--line)]/60">
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold text-[var(--ink)]">Тип выбытия:</span>
					<div className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--paper)] p-0.5">
						<button
							type="button"
							className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
								operationCode === MDLP_OPERATION_CODES.DISPOSAL_MEDICAL_CARE
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							onClick={() => onSelectOperationCode(MDLP_OPERATION_CODES.DISPOSAL_MEDICAL_CARE)}
							data-testid="op-code-332-btn"
						>
							Медпомощь (лечение)
						</button>
						<button
							type="button"
							className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
								operationCode === MDLP_OPERATION_CODES.DISPOSAL_WRITE_OFF_OR_DEFECT
									? "bg-[var(--bad-fg,#dc2626)] text-white shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							onClick={() => onSelectOperationCode(MDLP_OPERATION_CODES.DISPOSAL_WRITE_OFF_OR_DEFECT)}
							data-testid="op-code-331-btn"
						>
							Списание (бой / брак / утиль)
						</button>
					</div>
				</div>

				<span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-500/20 font-medium">
					<ShieldCheck size={14} className="text-teal-600" />
					<span>Пакетное списание без поштучного сканирования</span>
				</span>
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<span className="text-xs font-semibold text-[var(--muted)]">Быстрое добавление упаковок:</span>
				<button
					type="button"
					onClick={() => onAddCarpuleBatch("articaine_1_100000", 10, "Артикаин 1:100 000")}
					className="h-8 min-h-[32px] px-3 rounded-lg text-xs font-bold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
					data-testid="add-barcode-btn"
					title="Пакетное добавление препаратов"
				>
					<Plus size={14} className="text-teal-600" />
					<span>+ 10 шт. Артикаин 1:100 000</span>
				</button>
				<button
					type="button"
					onClick={() => onAddCarpuleBatch("articaine_1_200000", 5, "Артикаин 1:200 000")}
					className="h-8 min-h-[32px] px-3 rounded-lg text-xs font-bold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
					data-testid="btn-add-batch-articaine-200"
				>
					<Plus size={14} className="text-teal-600" />
					<span>+ 5 шт. Артикаин 1:200 000</span>
				</button>
				<button
					type="button"
					onClick={() => onAddCarpuleBatch("mepivacaine_plain", 2, "Скандонест (Мепивакаин)")}
					className="h-8 min-h-[32px] px-3 rounded-lg text-xs font-bold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
					data-testid="btn-add-batch-scandonest"
				>
					<Plus size={14} className="text-teal-600" />
					<span>+ 2 шт. Скандонест (Мепивакаин)</span>
				</button>
			</div>
		</div>
	);
};
