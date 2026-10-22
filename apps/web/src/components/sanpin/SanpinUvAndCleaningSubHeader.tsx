import { ShieldCheck, Sparkles, Wind } from "lucide-react";
import React from "react";

export type UvAndCleaningSubTab = "readiness" | "bactericidal" | "cleaning";

export interface SanpinUvAndCleaningSubHeaderProps {
	readonly activeSubTab: UvAndCleaningSubTab;
	readonly setActiveSubTab: (tab: UvAndCleaningSubTab) => void;
}

const getSubTabBtnStyle = (isActive: boolean): React.CSSProperties => ({
	padding: "6px 12px",
	borderRadius: "7px",
	fontSize: "12px",
	fontWeight: isActive ? 600 : 500,
	color: isActive ? "var(--ink, #0f172a)" : "var(--muted, #64748b)",
	border: "none",
	background: isActive ? "var(--paper, #ffffff)" : "transparent",
	boxShadow: isActive ? "0 1px 3px rgba(0, 0, 0, 0.08)" : "none",
	cursor: "pointer",
	whiteSpace: "nowrap",
	display: "inline-flex",
	alignItems: "center",
	gap: "6px",
	flexShrink: 0,
	transition: "all 0.15s ease",
});

export function SanpinUvAndCleaningSubHeader({
	activeSubTab,
	setActiveSubTab,
}: SanpinUvAndCleaningSubHeaderProps) {
	return (
		<div
			className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] min-w-0"
			style={{ minHeight: "44px" }}
		>
			<div
				style={{
					background: "var(--paper-soft, #f1f5f9)",
					padding: "3px",
					borderRadius: "10px",
					border: "1px solid var(--line-subtle, #e2e8f0)",
					display: "inline-flex",
					gap: "4px",
					alignItems: "center",
					overflowX: "auto",
					maxWidth: "100%",
					scrollbarWidth: "none",
				}}
				role="tablist"
				aria-label="Разделы готовности кабинетов, обеззараживания и уборок"
			>
				<button
					type="button"
					role="tab"
					aria-selected={activeSubTab === "readiness"}
					onClick={() => setActiveSubTab("readiness")}
					className="touch-manipulation shrink-0"
					style={getSubTabBtnStyle(activeSubTab === "readiness")}
					data-testid="subtab-readiness-btn"
				>
					<ShieldCheck size={14} color={activeSubTab === "readiness" ? "var(--teal, #0d9488)" : "currentColor"} />
					<span className="hidden md:inline">Готовность кабинетов</span>
					<span className="inline md:hidden">Готовность</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activeSubTab === "bactericidal"}
					onClick={() => setActiveSubTab("bactericidal")}
					className="touch-manipulation shrink-0"
					style={getSubTabBtnStyle(activeSubTab === "bactericidal")}
					data-testid="subtab-bactericidal-btn"
				>
					<Wind size={14} color={activeSubTab === "bactericidal" ? "var(--teal, #0d9488)" : "currentColor"} />
					<span className="hidden md:inline">Обеззараживание воздуха и УФ-облучатели</span>
					<span className="inline md:hidden">УФ-воздух</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activeSubTab === "cleaning"}
					onClick={() => setActiveSubTab("cleaning")}
					className="touch-manipulation shrink-0"
					style={getSubTabBtnStyle(activeSubTab === "cleaning")}
					data-testid="subtab-cleaning-btn"
				>
					<Sparkles size={14} color={activeSubTab === "cleaning" ? "var(--teal, #0d9488)" : "currentColor"} />
					<span className="hidden md:inline">Генеральные уборки</span>
					<span className="inline md:hidden">Генуборки</span>
				</button>
			</div>

			<div className="text-xs text-[var(--muted,#64748b)] hidden md:block">
				Санитарный режим: готовность кабинета, обеззараживание воздуха и УФ-облучатели
			</div>
		</div>
	);
}
