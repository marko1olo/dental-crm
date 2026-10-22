import React from "react";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";

export function PanelHeader({
	expanded,
	onToggle,
	toothFdi,
}: {
	expanded: boolean;
	onToggle: () => void;
	toothFdi?: number | undefined;
}) {
	return (
		<button
			type="button"
			onClick={onToggle}
			className="w-full flex justify-between items-center cursor-pointer min-h-[44px] pb-1.5 border-b select-none"
			style={{
				borderColor: "var(--line)",
				background: "none",
				borderLeft: "none",
				borderRight: "none",
				borderTop: "none",
			}}
		>
			<span className="text-xs font-bold flex items-center gap-1.5 text-[var(--teal)]">
				<Activity className="w-4 h-4 text-[var(--teal)]" />
				Плотность кости (HU){toothFdi ? ` • Зуб #${toothFdi}` : ""}
			</span>
			<span style={{ color: "var(--muted)" }}>
				{expanded ? (
					<ChevronUp className="w-4 h-4" />
				) : (
					<ChevronDown className="w-4 h-4" />
				)}
			</span>
		</button>
	);
}

export function ZoneCard({ label, hu }: { label: string; hu: number }) {
	if (!Number.isFinite(hu)) {
		return (
			<div
				className="p-2 rounded-lg text-center"
				style={{ background: "var(--paper-soft)" }}
			>
				<div
					className="text-xs truncate"
					title={label}
					style={{ color: "var(--muted)" }}
				>
					{label}
				</div>
				<div className="text-xs font-bold" style={{ color: "var(--muted)" }}>
					— HU
				</div>
			</div>
		);
	}

	const color =
		hu > 1250
			? "var(--red, #ef4444)"
			: hu >= 850
				? "var(--teal, #0d9488)"
				: hu >= 350
					? "var(--amber, #f59e0b)"
					: hu >= 150
						? "var(--orange, #f97316)"
						: "var(--purple, #a855f7)";
	const boneClass =
		hu > 1250
			? "D1"
			: hu >= 850
				? "D2"
				: hu >= 350
					? "D3"
					: hu >= 150
						? "D4"
						: "D5";
	return (
		<div
			className="p-2 rounded-lg text-center"
			style={{ background: "var(--paper-soft)" }}
		>
			<div
				className="text-xs truncate"
				title={label}
				style={{ color: "var(--muted)" }}
			>
				{label}
			</div>
			<div className="text-xs font-bold" style={{ color }}>
				{Math.round(hu)} HU ({boneClass})
			</div>
		</div>
	);
}
