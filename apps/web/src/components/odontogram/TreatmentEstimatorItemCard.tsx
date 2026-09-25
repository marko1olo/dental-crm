import type React from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import {
	calculateTreatmentWarranty,
	type EstimatorContract,
	estimatorRowMoney,
	isDeciduousFdiToothNumber,
	type PlanItem,
} from "./treatmentEstimatorPricing";

export interface TreatmentEstimatorItemCardProps {
	item: PlanItem;
	globalIdx: number;
	contract: EstimatorContract;
	onRemove: (idx: number) => void;
	onSetPhase: (idx: number, phase: number) => void;
	formatRub: (kopecks: number) => string;
}

export const TreatmentEstimatorItemCard: React.FC<TreatmentEstimatorItemCardProps> = ({
	item,
	globalIdx,
	contract,
	onRemove,
	onSetPhase,
	formatRub,
}) => {
	const warranty = calculateTreatmentWarranty(item);
	const rowMoney = estimatorRowMoney(item, contract);

	return (
		<div className="plan-item-card">
			<div className="plan-item-row">
				<div className="plan-item-info">
					<div className="plan-item-header flex items-center justify-between gap-2 flex-wrap">
						<div className="flex items-center gap-1.5 flex-wrap">
							{item.toothNumber && (
								<span
									className={`tooth-badge ${isDeciduousFdiToothNumber(item.toothNumber) ? "baby" : "adult"}`}
								>
									[{item.toothNumber}]
								</span>
							)}
							<span className="plan-item-name font-bold">{item.name}</span>
						</div>
						<span
							className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 shrink-0 flex items-center gap-1"
							title={warranty.termsDescription}
						>
							<ShieldCheck size={12} className="text-blue-500 shrink-0" />
							<span>Гарантия {warranty.warrantyMonths} мес.</span>
						</span>
					</div>
					<div className="plan-item-price-quantity">
						{!rowMoney.known ? (
							<span className="text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1.5 flex-wrap">
								<span>Цена не назначена</span>
								<span className="text-xs font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
									{item.issue ? "нет в вашем прайсе" : "сумма в плане не читается"}
								</span>
							</span>
						) : rowMoney.hasContract && rowMoney.coveragePct === 0 ? (
							<span className="text-rose-500 font-semibold flex items-center gap-1.5 flex-wrap">
								<span>{formatRub(rowMoney.unitKopecks)}</span>
								<span className="text-xs font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/25">
									Вне покрытия ДМС
								</span>
							</span>
						) : rowMoney.hasContract && rowMoney.coveragePct < 100 ? (
							<span className="flex items-center gap-1.5 flex-wrap">
								<span className="line-through text-slate-400 dark:text-zinc-500">
									{formatRub(rowMoney.unitKopecks)}
								</span>
								<span className="text-teal-500 dark:text-teal-400 font-bold">
									{formatRub(rowMoney.unitPayableKopecks)}
								</span>
								<span className="text-xs font-bold bg-teal-500/10 text-teal-500 dark:text-teal-400 px-1.5 py-0.5 rounded border border-teal-500/20">
									Со-оплата {rowMoney.copayPct}%
								</span>
							</span>
						) : rowMoney.hasContract ? (
							<span className="flex items-center gap-1.5 flex-wrap">
								<span className="line-through text-slate-400 dark:text-zinc-500">
									{formatRub(rowMoney.unitKopecks)}
								</span>
								<span className="text-teal-500 dark:text-teal-400 font-bold">
									{formatRub(rowMoney.unitPayableKopecks)}
								</span>
								<span className="text-xs font-bold bg-teal-500/10 text-teal-500 dark:text-teal-400 px-1.5 py-0.5 rounded border border-teal-500/20">
									ДМС 100%
								</span>
							</span>
						) : (
							<span>
								{formatRub(rowMoney.unitKopecks)} x {item.quantity}
							</span>
						)}
					</div>
				</div>
				<button
					type="button"
					onClick={() => onRemove(globalIdx)}
					className="btn-remove-item"
					title="Удалить"
				>
					<Trash2 size={14} />
				</button>
			</div>
			<div className="plan-item-footer">
				<select
					value={item.phase}
					onChange={(e) => onSetPhase(globalIdx, parseInt(e.target.value, 10))}
					className="select-phase"
				>
					<option value={1}>Этап I: Терапия</option>
					<option value={2}>Этап II: Хирургия</option>
					<option value={3}>Этап III: Ортопедия</option>
				</select>
				<span className="plan-item-total-price">
					{rowMoney.known ? formatRub(rowMoney.payableKopecks) : "цены нет"}
				</span>
			</div>
		</div>
	);
};
