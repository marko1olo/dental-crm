import React from "react";
import type { ClinicalWriteoffLine } from "./clinicalWriteoffEngine.js";
import type { DiscrepancyReasonCode } from "./clinicalWriteoffPresets.js";
import { ClinicalWriteoffServiceTableRow } from "./ClinicalWriteoffServiceTableRow.js";

export interface ClinicalWriteoffServiceTableProps {
	readonly serviceLines: readonly ClinicalWriteoffLine[];
	readonly onQuantityChange: (lineId: string, newQty: number) => void;
	readonly onReasonChange: (lineId: string, reasonCode: DiscrepancyReasonCode) => void;
	readonly onSerialNumberChange: (lineId: string, serial: string) => void;
	readonly onResetToNorm: (lineId: string) => void;
	readonly onRemoveLine: (lineId: string) => void;
}

export const ClinicalWriteoffServiceTable: React.FC<ClinicalWriteoffServiceTableProps> = ({
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
					{serviceLines.map((line) => (
						<ClinicalWriteoffServiceTableRow
							key={line.id}
							line={line}
							onQuantityChange={onQuantityChange}
							onReasonChange={onReasonChange}
							onSerialNumberChange={onSerialNumberChange}
							onResetToNorm={onResetToNorm}
							onRemoveLine={onRemoveLine}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
};

export default ClinicalWriteoffServiceTable;
