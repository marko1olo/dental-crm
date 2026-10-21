import type React from "react";
import {
	WAREHOUSE_BRANCHES,
	type WarehouseBranchId,
} from "./warehouseTransferPresets.js";

export interface WarehouseTransferRouteBarProps {
	readonly sourceBranchId: WarehouseBranchId;
	readonly targetBranchId: WarehouseBranchId;
	readonly onSourceBranchChange: (branchId: WarehouseBranchId) => void;
	readonly onTargetBranchChange: (branchId: WarehouseBranchId) => void;
	readonly docNumber: string;
	readonly onDocNumberChange: (num: string) => void;
	readonly docDate: string;
	readonly onDocDateChange: (date: string) => void;
}

export const WarehouseTransferRouteBar: React.FC<WarehouseTransferRouteBarProps> = ({
	sourceBranchId,
	targetBranchId,
	onSourceBranchChange,
	onTargetBranchChange,
	docNumber,
	onDocNumberChange,
	docDate,
	onDocDateChange,
}) => {
	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl border border-line bg-paper-soft">
			<div>
				<label htmlFor="wh-source-branch" className="text-xs font-semibold text-muted block mb-1">
					Склад-отправитель (Списание)
				</label>
				<select
					id="wh-source-branch"
					value={sourceBranchId}
					onChange={(e) => onSourceBranchChange(e.target.value as WarehouseBranchId)}
					className="w-full h-9 sm:h-9 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-focus-ring"
				>
					{WAREHOUSE_BRANCHES.map((b) => (
						<option key={b.id} value={b.id}>
							{b.nameRu}
						</option>
					))}
				</select>
			</div>

			<div>
				<label htmlFor="wh-target-branch" className="text-xs font-semibold text-muted block mb-1">
					Склад-получатель (Оприходование)
				</label>
				<select
					id="wh-target-branch"
					value={targetBranchId}
					onChange={(e) => onTargetBranchChange(e.target.value as WarehouseBranchId)}
					className="w-full h-9 sm:h-9 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-focus-ring"
				>
					{WAREHOUSE_BRANCHES.map((b) => (
						<option key={b.id} value={b.id}>
							{b.nameRu}
						</option>
					))}
				</select>
			</div>

			<div>
				<label htmlFor="wh-doc-number" className="text-xs font-semibold text-muted block mb-1">
					Номер накладной и Дата
				</label>
				<div className="flex gap-2">
					<input
						id="wh-doc-number"
						type="text"
						value={docNumber}
						onChange={(e) => onDocNumberChange(e.target.value)}
						className="flex-1 h-9 sm:h-9 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-mono font-bold"
					/>
					<input
						type="date"
						value={docDate}
						onChange={(e) => onDocDateChange(e.target.value)}
						className="w-36 h-9 sm:h-9 px-2 rounded-lg border border-line bg-paper text-ink text-sm"
					/>
				</div>
			</div>
		</div>
	);
};
