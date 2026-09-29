import { Trash2 } from "lucide-react";
import type React from "react";
import {
	type ClinicalWriteoffLine,
	kopecksToRubles,
} from "./clinicalWriteoffEngine.js";
import {
	DISCREPANCY_REASONS,
	type DiscrepancyReasonCode,
} from "./clinicalWriteoffPresets.js";

export interface ClinicalWriteoffServiceTableProps {
	readonly serviceLines: readonly ClinicalWriteoffLine[];
	readonly onQuantityChange: (lineId: string, newQty: number) => void;
	readonly onReasonChange: (
		lineId: string,
		reasonCode: DiscrepancyReasonCode,
	) => void;
	readonly onSerialNumberChange: (lineId: string, serial: string) => void;
	readonly onResetToNorm: (lineId: string) => void;
	readonly onRemoveLine: (lineId: string) => void;
}

export const ClinicalWriteoffServiceTable: React.FC<
	ClinicalWriteoffServiceTableProps
> = ({
	serviceLines,
	onQuantityChange,
	onReasonChange,
	onSerialNumberChange,
	onResetToNorm,
	onRemoveLine,
}) => {
	return (
		<div className="cw-table-wrap">
			<table className="cw-table">
				<thead>
					<tr>
						<th>Материал / SKU</th>
						<th>Партия (LOT)</th>
						<th>Срок годности</th>
						<th className="text-center">Норма расхода</th>
						<th className="text-center">Факт расход</th>
						<th className="text-center">Отклонение</th>
						<th>Причина расхождения</th>
						<th className="text-right">Цена, ₽</th>
						<th className="text-right">Сумма, ₽</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{serviceLines.map((line) => {
						const unitRub = kopecksToRubles(line.unitCostKopecks);
						const totalRub = kopecksToRubles(line.totalCostKopecks);
						const isFractional = line.unit === "г" || line.unit === "мл";
						const stepVal = isFractional ? 0.1 : 1;

						return (
							<tr key={line.id}>
								<td className="min-w-0 max-w-xs">
									<div
										className="font-semibold text-ink leading-snug truncate"
										title={line.nameRu}
									>
										{line.nameRu}
									</div>
									<div className="text-xs text-muted font-mono truncate">
										{line.sku}
									</div>
									{line.requiresSerialNumber && (
										<div className="mt-1 flex items-center gap-1">
											<span className="text-[11px] font-bold text-teal-dark">
												SN:
											</span>
											<input
												type="text"
												placeholder="Введите серийный номер (МДЛП)"
												value={line.serialNumber || ""}
												onChange={(e) =>
													onSerialNumberChange(line.id, e.target.value)
												}
												className="min-h-[44px] px-2 rounded border border-line bg-paper text-xs font-mono w-48"
											/>
										</div>
									)}
								</td>

								<td>
									<span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-paper-soft border border-line">
										{line.lotNumber || "БЕЗ ПАРТИИ"}
									</span>
								</td>

								<td>
									{line.expirationDate ? (
										<span
											className={`text-xs font-semibold px-2 py-0.5 rounded ${
												line.isExpired
													? "bg-bad-bg text-bad-fg font-bold"
													: line.isExpiringSoon
														? "bg-amber-100 text-amber-900 font-bold"
														: "text-muted"
											}`}
										>
											{line.expirationDate}
											{line.isExpiringSoon && " (≤30 дн)"}
											{line.isExpired && " (ПРОСРОЧЕНО)"}
										</span>
									) : (
										<span className="text-xs text-muted">—</span>
									)}
								</td>

								<td className="text-center font-semibold text-muted">
									{line.standardQuantity} {line.unit}
								</td>

								<td className="text-center">
									<div className="flex items-center justify-center gap-1">
										<div className="cw-stepper-control">
											<button
												type="button"
												className="cw-stepper-btn"
												onClick={() =>
													onQuantityChange(
														line.id,
														Math.max(0, line.actualQuantity - stepVal),
													)
												}
												title="Уменьшить"
											>
												-
											</button>
											<input
												type="number"
												step={stepVal}
												min={0}
												value={line.actualQuantity}
												onChange={(e) =>
													onQuantityChange(line.id, Number(e.target.value))
												}
												className="cw-stepper-input"
											/>
											<button
												type="button"
												className="cw-stepper-btn"
												onClick={() =>
													onQuantityChange(
														line.id,
														line.actualQuantity + stepVal,
													)
												}
												title="Увеличить"
											>
												+
											</button>
										</div>
									</div>

									{/* Быстрые чипы приращения */}
									<div className="flex items-center justify-center gap-1 mt-1">
										{isFractional ? (
											<>
												<button
													type="button"
													className="cw-chip-btn"
													onClick={() =>
														onQuantityChange(
															line.id,
															Number((line.actualQuantity + 0.1).toFixed(2)),
														)
													}
												>
													+0.1
												</button>
												<button
													type="button"
													className="cw-chip-btn"
													onClick={() =>
														onQuantityChange(
															line.id,
															Number((line.actualQuantity + 0.2).toFixed(2)),
														)
													}
												>
													+0.2
												</button>
											</>
										) : (
											<>
												<button
													type="button"
													className="cw-chip-btn"
													onClick={() =>
														onQuantityChange(line.id, line.actualQuantity + 1)
													}
												>
													+1
												</button>
												<button
													type="button"
													className="cw-chip-btn"
													onClick={() =>
														onQuantityChange(line.id, line.actualQuantity + 2)
													}
												>
													+2
												</button>
											</>
										)}
										{line.discrepancyQuantity !== 0 && (
											<button
												type="button"
												className="cw-chip-btn text-teal-dark font-bold"
												onClick={() => onResetToNorm(line.id)}
												title="Сбросить к норме расхода"
											>
												Норма
											</button>
										)}
									</div>
								</td>

								<td className="text-center">
									{line.discrepancyQuantity !== 0 ? (
										<span
											className={`text-xs font-bold px-2 py-0.5 rounded-full ${
												line.discrepancyQuantity > 0
													? "bg-amber-100 text-amber-900"
													: "bg-teal-100 text-teal-900"
											}`}
										>
											{line.discrepancyQuantity > 0
												? `+${line.discrepancyQuantity}`
												: `${line.discrepancyQuantity}`}{" "}
											{line.unit}
										</span>
									) : (
										<span className="text-xs font-semibold text-ok-fg">
											Норма
										</span>
									)}
								</td>

								<td>
									{line.discrepancyQuantity !== 0 ? (
										<select
											value={line.discrepancyReasonCode}
											onChange={(e) =>
												onReasonChange(
													line.id,
													e.target.value as DiscrepancyReasonCode,
												)
											}
											className="min-h-[44px] px-2 rounded border border-line bg-paper text-ink text-xs max-w-[180px]"
										>
											{DISCREPANCY_REASONS.map((r) => (
												<option key={r.code} value={r.code}>
													{r.labelRu}
												</option>
											))}
										</select>
									) : (
										<span className="text-xs text-muted">—</span>
									)}
								</td>

								<td className="text-right font-medium text-muted">
									{unitRub.toFixed(2)}
								</td>

								<td className="text-right font-black text-ink">
									{totalRub.toFixed(2)}
								</td>

								<td className="text-center">
									<button
										type="button"
										onClick={() => onRemoveLine(line.id)}
										className="text-muted hover:text-bad-fg p-1.5 rounded transition-colors"
										title="Удалить позицию"
									>
										<Trash2 size={16} />
									</button>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};
