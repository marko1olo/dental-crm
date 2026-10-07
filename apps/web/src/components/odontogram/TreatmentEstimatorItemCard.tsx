import type React from "react";
import { AlertTriangle, ArrowRightLeft, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import {
	calculateTreatmentWarranty,
	type EstimatorContract,
	estimatorRowMoney,
	type GhostToothConflict,
	isDeciduousFdiToothNumber,
	type PlanItem,
	type PlanItemCollision,
} from "./treatmentEstimatorPricing";

export interface TreatmentEstimatorItemCardProps {
	item: PlanItem;
	globalIdx: number;
	contract: EstimatorContract;
	onRemove: (idx: number) => void;
	onSetPhase: (idx: number, phase: number) => void;
	formatRub: (kopecks: number) => string;
	ghostConflict?: GhostToothConflict | null | undefined;
	collision?: PlanItemCollision | null | undefined;
	onReplaceWithImplant?: ((toothNumber: number) => void) | undefined;
	onRestoreToothStatus?: ((toothNumber: number) => void) | undefined;
}

export const TreatmentEstimatorItemCard: React.FC<TreatmentEstimatorItemCardProps> = ({
	item,
	globalIdx,
	contract,
	onRemove,
	onSetPhase,
	formatRub,
	ghostConflict,
	collision,
	onReplaceWithImplant,
	onRestoreToothStatus,
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

					{/* Янтарный бейдж защиты от «зубов-призраков» (Ghost Teeth Invalidation) */}
					{ghostConflict && (
						<div
							className="mt-2 p-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/90 dark:bg-amber-950/60 text-amber-900 dark:text-amber-100 text-xs"
							role="alert"
							data-testid={`ghost-tooth-warning-${item.toothNumber}`}
						>
							<div className="flex items-start gap-2">
								<AlertTriangle
									size={15}
									className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
									aria-hidden="true"
								/>
								<div className="flex-1 min-w-0">
									<div className="font-bold leading-snug">
										{ghostConflict.warningBadgeText}
									</div>
									<div className="mt-2 flex items-center gap-2 flex-wrap">
										{onReplaceWithImplant &&
											item.toothNumber !== undefined &&
											!isDeciduousFdiToothNumber(item.toothNumber) && (
												<button
													type="button"
													onClick={() => onReplaceWithImplant(item.toothNumber!)}
													className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer"
													title="Заменить позицию на дентальную имплантацию"
													data-testid={`btn-ghost-replace-implant-${item.toothNumber}`}
												>
													<ArrowRightLeft size={12} />
													<span>Заменить на имплантацию</span>
												</button>
											)}
										{onRestoreToothStatus && item.toothNumber !== undefined && (
											<button
												type="button"
												onClick={() => onRestoreToothStatus(item.toothNumber!)}
												className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md bg-white dark:bg-zinc-800 border border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
												title="Восстановить статус зуба на формуле (врачебная автономия)"
												data-testid={`btn-ghost-restore-tooth-${item.toothNumber}`}
											>
												<RotateCcw size={12} />
												<span>Восстановить статус на формуле</span>
											</button>
										)}
										<button
											type="button"
											onClick={() => onRemove(globalIdx)}
											className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 hover:bg-rose-200 dark:hover:bg-rose-900/70 transition-colors cursor-pointer"
											title="Удалить недействительную услугу"
											data-testid={`btn-ghost-remove-item-${item.toothNumber}`}
										>
											<Trash2 size={12} />
											<span>Удалить услугу</span>
										</button>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Предупреждение о коллизии альтернативных планов на один зуб */}
					{collision && (
						<div
							className="mt-1.5 flex items-center gap-1.5 p-2 rounded-md bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/30 text-xs font-semibold"
							data-testid={`card-collision-badge-${item.toothNumber}`}
						>
							<AlertTriangle size={13} className="text-amber-600 shrink-0" />
							<span className="truncate">{collision.messageRu}</span>
						</div>
					)}
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
