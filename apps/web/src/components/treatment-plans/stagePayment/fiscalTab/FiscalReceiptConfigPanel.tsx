import React from "react";
import { QrCode } from "lucide-react";
import { formatKopecksRu } from "@dental/shared";
import type { MilestoneStage } from "../stagePaymentEngine.js";

export interface FiscalReceiptConfigPanelProps {
	readonly stages: readonly MilestoneStage[];
	readonly selectedStageForFiscalId: string;
	readonly onSelectStageForFiscal: (stageId: string) => void;
	readonly fiscalPaymentType: "advance" | "completion" | "full";
	readonly onFiscalPaymentTypeChange: (type: "advance" | "completion" | "full") => void;
	readonly fiscalPaymentMethod: "CASH" | "BANK_CARD" | "PATIENT_DEPOSIT" | "SBP_QR";
	readonly onFiscalPaymentMethodChange: (method: "CASH" | "BANK_CARD" | "PATIENT_DEPOSIT" | "SBP_QR") => void;
	readonly onGenerateFiscalReceipt: () => void;
}

export const FiscalReceiptConfigPanel: React.FC<FiscalReceiptConfigPanelProps> = ({
	stages,
	selectedStageForFiscalId,
	onSelectStageForFiscal,
	fiscalPaymentType,
	onFiscalPaymentTypeChange,
	fiscalPaymentMethod,
	onFiscalPaymentMethodChange,
	onGenerateFiscalReceipt,
}) => {
	return (
		<div className="flex-1 w-full rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-5 flex flex-col gap-4">
			<h3 className="font-bold text-base text-[var(--ink,#0f172a)] flex items-center gap-2">
				<QrCode className="h-5 w-5 text-[var(--teal,var(--brand-primary))]" />
				Параметры кассового чека
			</h3>

			<div>
				<label className="text-xs font-semibold text-[var(--muted,#64748b)] block mb-1.5">
					Этап плана лечения:
				</label>
				<select
					value={selectedStageForFiscalId}
					onChange={(e) => onSelectStageForFiscal(e.target.value)}
					className="w-full rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 py-2 text-sm text-[var(--ink,#0f172a)] focus:border-[var(--teal,var(--brand-primary))] focus:outline-none"
				>
					{stages.map((s) => (
						<option key={s.id} value={s.id}>
							Этап №{s.stageNumber}: {s.title} ({formatKopecksRu(s.totalKopecks)})
						</option>
					))}
				</select>
			</div>

			<div>
				<label className="text-xs font-semibold text-[var(--muted,#64748b)] block mb-1.5">
					Формат расчета:
				</label>
				<div className="grid grid-cols-3 gap-2">
					<button
						type="button"
						onClick={() => onFiscalPaymentTypeChange("advance")}
						className={`stage-action-btn ${fiscalPaymentType === "advance" ? "primary" : "secondary"} text-xs`}
					>
						Аванс / Предоплата
					</button>
					<button
						type="button"
						onClick={() => onFiscalPaymentTypeChange("completion")}
						className={`stage-action-btn ${fiscalPaymentType === "completion" ? "primary" : "secondary"} text-xs`}
					>
						Окончательный расчет
					</button>
					<button
						type="button"
						onClick={() => onFiscalPaymentTypeChange("full")}
						className={`stage-action-btn ${fiscalPaymentType === "full" ? "primary" : "secondary"} text-xs`}
					>
						Полная оплата 100%
					</button>
				</div>
			</div>

			<div>
				<label className="text-xs font-semibold text-[var(--muted,#64748b)] block mb-1.5">
					Способ оплаты:
				</label>
				<select
					value={fiscalPaymentMethod}
					onChange={(e) => onFiscalPaymentMethodChange(e.target.value as any)}
					className="w-full rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 py-2 text-sm text-[var(--ink,#0f172a)] focus:border-[var(--teal,var(--brand-primary))] focus:outline-none"
				>
					<option value="BANK_CARD">Банковская карта (Эквайринг)</option>
					<option value="SBP_QR">СБП QR-код</option>
					<option value="CASH">Наличные в кассу</option>
					<option value="PATIENT_DEPOSIT">Списание с депозита</option>
				</select>
			</div>

			<div className="rounded-xl bg-[var(--paper-soft)] p-3 text-xs text-[var(--muted)] border border-[var(--line-subtle)]">
				<div>• Система налогообложения: <strong>УСН Доходы</strong></div>
				<div>• Налоговая ставка: <strong>Без НДС (ст. 149 НК РФ пп. 2 п. 2)</strong></div>
				<div>• Предмет расчета: <strong>Стоматологические услуги</strong></div>
			</div>

			<button
				type="button"
				onClick={onGenerateFiscalReceipt}
				className="stage-action-btn primary w-full"
			>
				<QrCode className="h-4 w-4" />
				Сформировать фискальный чек
			</button>
		</div>
	);
};
