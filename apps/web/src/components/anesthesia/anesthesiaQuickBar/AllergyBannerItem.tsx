import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface AllergyBannerItemProps {
	variant: "rose" | "amber";
	testId: string;
	buttonTestId: string;
	buttonTitle: string;
	Icon: LucideIcon;
	children: ReactNode;
	onSwitchToScandonest: () => void;
}

export function AllergyBannerItem({
	variant,
	testId,
	buttonTestId,
	buttonTitle,
	Icon,
	children,
	onSwitchToScandonest,
}: AllergyBannerItemProps) {
	const isRose = variant === "rose";
	const containerCls = isRose
		? "bg-rose-600/15 border-rose-600/50 text-rose-950 dark:text-rose-100 animate-pulse"
		: "bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200";
	const iconCls = isRose
		? "text-rose-600 dark:text-rose-400"
		: "text-amber-600 dark:text-amber-400";

	return (
		<div
			className={`flex items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg border text-xs font-medium ${containerCls}`}
			role="alert"
			data-testid={testId}
		>
			<div className="flex items-center gap-2">
				<Icon size={16} className={`${iconCls} shrink-0`} />
				<span>{children}</span>
			</div>
			<button
				type="button"
				onClick={onSwitchToScandonest}
				className="px-2.5 py-1 min-h-[44px] rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shrink-0 transition-colors cursor-pointer"
				title={buttonTitle}
				data-testid={buttonTestId}
			>
				Выбрать Скандонест 3%
			</button>
		</div>
	);
}
