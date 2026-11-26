import React from "react";
import { Monitor, Smartphone } from "lucide-react";

export type LanWizardMode = "host" | "client";

export interface LanWizardModeTabsProps {
	readonly mode: LanWizardMode;
	readonly onChange: (mode: LanWizardMode) => void;
}

export const LanWizardModeTabs: React.FC<LanWizardModeTabsProps> = ({
	mode,
	onChange,
}) => {
	return (
		<div
			className="flex items-center p-1 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] gap-1"
			role="tablist"
			aria-label="Режим настройки локальной сети"
		>
			<button
				type="button"
				role="tab"
				aria-selected={mode === "host"}
				onClick={() => onChange("host")}
				data-testid="lan-wizard-mode-host"
				className={`flex-1 min-h-[44px] px-2.5 py-1.5 rounded-lg text-xs text-center leading-tight inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
					mode === "host"
						? "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-xs font-semibold"
						: "bg-transparent border border-transparent text-[var(--ink-muted,var(--muted))] hover:text-[var(--ink)] font-medium"
				}`}
			>
				<Monitor className="w-4 h-4 shrink-0" />
				<span>Главный ПК клиники</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={mode === "client"}
				onClick={() => onChange("client")}
				data-testid="lan-wizard-mode-client"
				className={`flex-1 min-h-[44px] px-2.5 py-1.5 rounded-lg text-xs text-center leading-tight inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
					mode === "client"
						? "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-xs font-semibold"
						: "bg-transparent border border-transparent text-[var(--ink-muted,var(--muted))] hover:text-[var(--ink)] font-medium"
				}`}
			>
				<Smartphone className="w-4 h-4 shrink-0" />
				<span>Подключиться к клинике</span>
			</button>
		</div>
	);
};
