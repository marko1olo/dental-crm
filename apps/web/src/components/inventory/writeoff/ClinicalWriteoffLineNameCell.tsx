import type React from "react";
import type { ClinicalWriteoffLine } from "./clinicalWriteoffEngine.js";

export interface ClinicalWriteoffLineNameCellProps {
	readonly line: ClinicalWriteoffLine;
	readonly onSerialNumberChange: (lineId: string, serial: string) => void;
}

export const ClinicalWriteoffLineNameCell: React.FC<ClinicalWriteoffLineNameCellProps> = ({
	line,
	onSerialNumberChange,
}) => {
	return (
		<td className="min-w-0 max-w-xs">
			<div className="font-semibold text-ink leading-snug truncate" title={line.nameRu}>
				{line.nameRu}
			</div>
			<div className="text-xs text-muted font-mono truncate">{line.sku}</div>
			{line.requiresSerialNumber && (
				<div className="mt-1 flex items-center gap-1">
					<span className="text-[11px] font-bold text-teal-dark">SN:</span>
					<input
						type="text"
						placeholder="Серийный номер / партия"
						value={line.serialNumber || ""}
						onChange={(e) => onSerialNumberChange(line.id, e.target.value)}
						className="min-h-[44px] px-2 rounded border border-line bg-paper text-xs font-mono w-48"
					/>
				</div>
			)}
		</td>
	);
};
