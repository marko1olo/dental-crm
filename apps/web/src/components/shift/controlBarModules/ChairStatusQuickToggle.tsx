import React from "react";
import { Activity, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import type { ChairOperationalStatus } from "./shiftControlBarTypes";

export interface ChairStatusQuickToggleProps {
	readonly currentStatus?: ChairOperationalStatus | undefined;
	readonly onChangeStatus?: ((status: ChairOperationalStatus) => void) | undefined;
	readonly className?: string | undefined;
}

interface StatusItem {
	readonly id: ChairOperationalStatus;
	readonly label: string;
	readonly icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
	readonly activeColor: string;
	readonly activeBg: string;
}

const CHAIR_STATUS_OPTIONS: readonly StatusItem[] = [
	{
		id: "free",
		label: "Свободно",
		icon: CheckCircle2,
		activeColor: "var(--ok-fg, #15803d)",
		activeBg: "var(--ok-bg, rgba(21, 128, 61, 0.1))",
	},
	{
		id: "in_treatment",
		label: "Приём",
		icon: Activity,
		activeColor: "var(--teal, #0d9488)",
		activeBg: "var(--teal-soft, rgba(13, 148, 136, 0.1))",
	},
	{
		id: "disinfection",
		label: "Дезинфекция",
		icon: Sparkles,
		activeColor: "var(--warn-fg, #c2410c)",
		activeBg: "var(--warn-bg, rgba(234, 88, 12, 0.1))",
	},
	{
		id: "quartz",
		label: "Кварцевание",
		icon: ShieldCheck,
		activeColor: "var(--accent, #6366f1)",
		activeBg: "rgba(99, 102, 241, 0.1)",
	},
];

export const ChairStatusQuickToggle: React.FC<ChairStatusQuickToggleProps> = React.memo(
	({ currentStatus = "free", onChangeStatus, className = "" }) => {
		return (
			<div
				className={`chair-status-quick-toggle ${className}`.trim()}
				role="radiogroup"
				aria-label="Оперативный статус стоматологического кресла"
				style={{
					display: "inline-flex",
					alignItems: "center",
					background: "var(--paper-soft)",
					border: "1px solid var(--line)",
					borderRadius: "8px",
					padding: "2px",
					gap: "2px",
					flexShrink: 0,
				}}
				data-testid="chair-status-quick-toggle"
			>
				{CHAIR_STATUS_OPTIONS.map((item) => {
					const isSelected = currentStatus === item.id;
					const Icon = item.icon;

					return (
						<button
							key={item.id}
							type="button"
							role="radio"
							aria-checked={isSelected}
							onClick={() => onChangeStatus?.(item.id)}
							title={`Статус кресла: ${item.label}`}
							data-testid={`chair-status-btn-${item.id}`}
							style={{
								minHeight: "28px",
								minWidth: "32px",
								padding: "0 8px",
								borderRadius: "6px",
								fontSize: "11px",
								fontWeight: isSelected ? 700 : 500,
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "4px",
								border: isSelected ? "1px solid var(--line)" : "1px solid transparent",
								background: isSelected ? "var(--paper)" : "transparent",
								color: isSelected ? item.activeColor : "var(--muted)",
								cursor: "pointer",
								whiteSpace: "nowrap",
								transition: "all 0.15s ease",
							}}
						>
							<Icon size={12} style={{ flexShrink: 0, color: isSelected ? item.activeColor : "inherit" }} />
							<span>{item.label}</span>
						</button>
					);
				})}
			</div>
		);
	},
);

ChairStatusQuickToggle.displayName = "ChairStatusQuickToggle";
