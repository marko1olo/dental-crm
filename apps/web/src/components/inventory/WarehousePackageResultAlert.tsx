import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { OneClickPackageWriteOffResult } from "./warehousePackageWriteOffEngine.js";

export interface WarehousePackageResultAlertProps {
	readonly lastResult: OneClickPackageWriteOffResult | null;
	readonly compact?: boolean | undefined;
}

export const WarehousePackageResultAlert: React.FC<WarehousePackageResultAlertProps> = ({
	lastResult,
	compact = false,
}) => {
	if (!lastResult || compact) return null;

	return (
		<div
			className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 min-w-0 ${
				lastResult.isOverdraft
					? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
					: "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
			}`}
			data-testid="warehouse-writeoff-last-result"
		>
			{lastResult.isOverdraft ? (
				<AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
			) : (
				<CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
			)}
			<span className="font-semibold truncate min-w-0">{lastResult.toastMessage}</span>
		</div>
	);
};

export default WarehousePackageResultAlert;
