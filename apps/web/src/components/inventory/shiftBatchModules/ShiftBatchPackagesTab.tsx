import { AlertTriangle, CheckCircle2 } from "lucide-react";
import React from "react";
import type { ClinicalPackageId, OneClickPackageWriteOffResult } from "../warehousePackageWriteOffEngine.js";
import { ShiftBatchMultiplierBar } from "./ShiftBatchMultiplierBar.js";
import { ShiftBatchPackageCardsGrid } from "./ShiftBatchPackageCardsGrid.js";

export interface ShiftBatchPackagesTabProps {
	readonly packageQuantityMultiplier: number;
	readonly setPackageQuantityMultiplier: React.Dispatch<React.SetStateAction<number>>;
	readonly submittingPackageId: string | null;
	readonly onPackageClick: (packageId: ClinicalPackageId) => Promise<void>;
	readonly lastPackageResult: OneClickPackageWriteOffResult | null;
}

export const ShiftBatchPackagesTab: React.FC<ShiftBatchPackagesTabProps> = ({
	packageQuantityMultiplier,
	setPackageQuantityMultiplier,
	submittingPackageId,
	onPackageClick,
	lastPackageResult,
}) => {
	return (
		<div className="space-y-4">
			<ShiftBatchMultiplierBar
				multiplier={packageQuantityMultiplier}
				setMultiplier={setPackageQuantityMultiplier}
			/>

			<ShiftBatchPackageCardsGrid
				multiplier={packageQuantityMultiplier}
				submittingPackageId={submittingPackageId}
				onPackageClick={onPackageClick}
			/>

			{lastPackageResult && (
				<div
					className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
						lastPackageResult.isOverdraft
							? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
							: "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
					}`}
				>
					{lastPackageResult.isOverdraft ? (
						<AlertTriangle size={15} className="text-amber-600 shrink-0" />
					) : (
						<CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
					)}
					<span className="font-semibold">{lastPackageResult.toastMessage}</span>
				</div>
			)}
		</div>
	);
};

export default ShiftBatchPackagesTab;
