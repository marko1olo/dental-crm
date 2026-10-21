import type React from "react";
import type { ClinicalPackageId } from "../warehousePackageWriteOffEngine.js";

export interface ShiftBatchPackageCardProps {
	readonly title: string;
	readonly description: string;
	readonly icon: React.ReactNode;
	readonly packageId: ClinicalPackageId;
	readonly testId: string;
	readonly buttonClassName: string;
	readonly buttonLabel: string;
	readonly isSubmitting: boolean;
	readonly onPackageClick: (packageId: ClinicalPackageId) => Promise<void>;
}

export const ShiftBatchPackageCard: React.FC<ShiftBatchPackageCardProps> = ({
	title,
	description,
	icon,
	packageId,
	testId,
	buttonClassName,
	buttonLabel,
	isSubmitting,
	onPackageClick,
}) => {
	return (
		<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col justify-between gap-3 shadow-2xs">
			<div className="space-y-1">
				<div className="flex items-center gap-2 font-bold text-sm text-[var(--ink)]">
					{icon}
					<span>{title}</span>
				</div>
				<p className="text-xs text-[var(--muted)]">{description}</p>
			</div>
			<button
				type="button"
				onClick={() => onPackageClick(packageId)}
				disabled={isSubmitting}
				data-testid={testId}
				className={`${buttonClassName} h-11 min-h-[44px] px-4 rounded-xl border active:scale-98 transition-all font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50`}
			>
				{icon}
				<span>{isSubmitting ? "Списание..." : buttonLabel}</span>
			</button>
		</div>
	);
};
