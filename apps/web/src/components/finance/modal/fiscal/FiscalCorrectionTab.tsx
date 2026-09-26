import React from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { formatMoneyRu } from "./fiscalModalRefundLogic";

export interface FiscalCorrectionTabProps {
	readonly correctionType: "self_initiated" | "by_instruction";
	readonly setCorrectionType: (t: "self_initiated" | "by_instruction") => void;
	readonly correctionDocDate: string;
	readonly setCorrectionDocDate: (d: string) => void;
	readonly correctionDocNumber: string;
	readonly setCorrectionDocNumber: (n: string) => void;
	readonly correctionReason: string;
	readonly setCorrectionReason: (r: string) => void;
	readonly handleExecuteFiscalization: () => Promise<void>;
	readonly isFiscalizing: boolean;
	readonly totalSumRub: number;
}

export const FiscalCorrectionTab: React.FC<FiscalCorrectionTabProps> = ({
	correctionType,
	setCorrectionType,
	correctionDocDate,
	setCorrectionDocDate,
	correctionDocNumber,
	setCorrectionDocNumber,
	correctionReason,
	setCorrectionReason,
	handleExecuteFiscalization,
	isFiscalizing,
	totalSumRub,
}) => {
	return (
		<div className="space-y-6">
			<div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 flex items-start gap-3">
				<ShieldAlert size={24} className="text-amber-600 shrink-0 mt-0.5" />
				<div>
					<h4 className="font-extrabold text-sm text-amber-950 dark:text-amber-200">
						Кассовый чек коррекции по 54-ФЗ (ФФД 1.2)
					</h4>
					<p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
						Применяется при исправлении ошибок кассира или оформлении расчетов, произведенных без применения ККТ (с указанием документа-основания: Теги 1173, 1178, 1179).
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
						Тип коррекции (Тег 1173):
					</label>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => setCorrectionType("self_initiated")}
							className={`flex-1 min-h-[44px] px-3 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
								correctionType === "self_initiated"
									? "bg-amber-600 text-white border-amber-600"
									: "bg-[var(--paper-strong,var(--paper,#ffffff))] border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)]"
							}`}
						>
							Самостоятельно (0)
						</button>
						<button
							type="button"
							onClick={() => setCorrectionType("by_instruction")}
							className={`flex-1 min-h-[44px] px-3 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
								correctionType === "by_instruction"
									? "bg-amber-600 text-white border-amber-600"
									: "bg-[var(--paper-strong,var(--paper,#ffffff))] border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)]"
							}`}
						>
							По предписанию (1)
						</button>
					</div>
				</div>

				<div>
					<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
						Дата документа-основания (Тег 1178):
					</label>
					<input
						type="date"
						value={correctionDocDate}
						onChange={(e) => setCorrectionDocDate(e.target.value)}
						className="w-full min-h-[44px] px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] font-mono"
					/>
				</div>

				<div>
					<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
						Номер документа-основания (Тег 1179):
					</label>
					<input
						type="text"
						value={correctionDocNumber}
						onChange={(e) => setCorrectionDocNumber(e.target.value)}
						placeholder="АКТ-1 или Предписание №12"
						className="w-full min-h-[44px] px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
					/>
				</div>

				<div>
					<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
						Описание причины коррекции:
					</label>
					<input
						type="text"
						value={correctionReason}
						onChange={(e) => setCorrectionReason(e.target.value)}
						placeholder="Сбой ККТ / Ошибка оператора"
						className="w-full min-h-[44px] px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
					/>
				</div>
			</div>

			<button
				type="button"
				onClick={() => handleExecuteFiscalization()}
				disabled={isFiscalizing}
				title={isFiscalizing ? "Идет фискализация чека коррекции в ККТ..." : undefined}
				className="w-full min-h-[52px] flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 shadow-md cursor-pointer transition-all active:scale-[0.99]"
			>
				<ShieldCheck size={18} />
				<span>
					{isFiscalizing
						? "Фискализация чека коррекции..."
						: `Пробить чек коррекции на ${formatMoneyRu(totalSumRub)}`}
				</span>
			</button>
		</div>
	);
};
