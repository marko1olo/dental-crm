import React from "react";

interface PresetButtonProps {
	readonly title: string;
	readonly subtitle: string;
	readonly isActive: boolean;
	readonly onClick: () => void;
	readonly icon: React.ReactNode;
	readonly testId?: string;
}

export const PresetButton: React.FC<PresetButtonProps> = ({
	title,
	subtitle,
	isActive,
	onClick,
	icon,
	testId,
}) => {
	return (
		<button
			type="button"
			onClick={onClick}
			data-testid={testId}
			className={`h-[44px] min-h-[44px] px-3 py-1.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
				isActive
					? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs font-bold"
					: "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--line-strong,var(--primary))] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
			}`}
		>
			<div
				className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
					isActive
						? "bg-white/20 text-white"
						: "bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)]"
				}`}
			>
				{icon}
			</div>
			<div className="min-w-0 flex-1">
				<div className="text-[12.5px] font-bold leading-tight">{title}</div>
				<div
					className={`text-[11.5px] truncate leading-tight ${
						isActive ? "text-white/80" : "text-[var(--muted)]"
					}`}
				>
					{subtitle}
				</div>
			</div>
		</button>
	);
};
