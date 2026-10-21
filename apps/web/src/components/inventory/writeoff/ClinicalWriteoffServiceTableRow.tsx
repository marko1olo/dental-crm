import { Trash2 } from "lucide-react";
import type React from "react";
import { type ClinicalWriteoffLine, kopecksToRubles } from "./clinicalWriteoffEngine.js";
import { DISCREPANCY_REASONS, type DiscrepancyReasonCode } from "./clinicalWriteoffPresets.js";
import { ClinicalWriteoffLineNameCell } from "./ClinicalWriteoffLineNameCell.js";
import { ClinicalWriteoffRowStepper } from "./ClinicalWriteoffRowStepper.js";

export interface ClinicalWriteoffServiceTableRowProps {
	readonly line: ClinicalWriteoffLine;
	readonly onQuantityChange: (lineId: string, newQty: number) => void;
	readonly onReasonChange: (lineId: string, reasonCode: DiscrepancyReasonCode) => void;
	readonly onSerialNumberChange: (lineId: string, serial: string) => void;
	readonly onResetToNorm: (lineId: string) => void;
	readonly onRemoveLine: (lineId: string) => void;
}

export const ClinicalWriteoffServiceTableRow: React.FC<ClinicalWriteoffServiceTableRowProps> = ({
	line, onQuantityChange, onReasonChange, onSerialNumberChange, onResetToNorm, onRemoveLine,
}) => {
	const unitRub = kopecksToRubles(line.unitCostKopecks);
	const totalRub = kopecksToRubles(line.totalCostKopecks);

	return (
		<tr>
			<ClinicalWriteoffLineNameCell
				line={line}
				onSerialNumberChange={onSerialNumberChange}
			/>

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

			<ClinicalWriteoffRowStepper
				line={line}
				onQuantityChange={onQuantityChange}
				onResetToNorm={onResetToNorm}
			/>

			<td className="text-center">
				{line.discrepancyQuantity !== 0 ? (
					<span
						className={`text-xs font-bold px-2 py-0.5 rounded-full ${
							line.discrepancyQuantity > 0 ? "bg-amber-100 text-amber-900" : "bg-teal-100 text-teal-900"
						}`}
					>
						{line.discrepancyQuantity > 0 ? `+${line.discrepancyQuantity}` : `${line.discrepancyQuantity}`}{" "}
						{line.unit}
					</span>
				) : (
					<span className="text-xs font-semibold text-ok-fg">Норма</span>
				)}
			</td>

			<td>
				{line.discrepancyQuantity !== 0 ? (
					<select
						value={line.discrepancyReasonCode}
						onChange={(e) => onReasonChange(line.id, e.target.value as DiscrepancyReasonCode)}
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

			<td className="text-right font-medium text-muted">{unitRub.toFixed(2)}</td>
			<td className="text-right font-black text-ink">{totalRub.toFixed(2)}</td>

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
};
