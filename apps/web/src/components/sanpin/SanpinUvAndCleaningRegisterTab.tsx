import { Sparkles, Wind } from "lucide-react";
import React, { useState } from "react";
import { BactericidalRegisterTab } from "./BactericidalRegisterTab";
import { GeneralCleaningRegisterTab } from "./GeneralCleaningRegisterTab";

export type UvAndCleaningSubTab = "bactericidal" | "cleaning";

export interface SanpinUvAndCleaningRegisterTabProps {
	initialSubTab?: UvAndCleaningSubTab;
}

export function SanpinUvAndCleaningRegisterTab({
	initialSubTab = "bactericidal",
}: SanpinUvAndCleaningRegisterTabProps) {
	const [activeSubTab, setActiveSubTab] = useState<UvAndCleaningSubTab>(initialSubTab);

	return (
		<div className="sanpin-uv-cleaning-container">
			{/* Apple-style Segmented Sub-Header for Air Disinfection vs General Cleaning */}
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
						gap: "2px",
						alignItems: "center",
					}}
					role="tablist"
					aria-label="Разделы обеззараживания и уборок"
				>
					<button
						type="button"
						role="tab"
						aria-selected={activeSubTab === "bactericidal"}
						onClick={() => setActiveSubTab("bactericidal")}
						className="touch-manipulation"
						style={{
							padding: "5px 12px",
							borderRadius: "7px",
							fontSize: "12px",
							fontWeight: activeSubTab === "bactericidal" ? 600 : 500,
							color: activeSubTab === "bactericidal" ? "var(--ink, #0f172a)" : "var(--muted, #64748b)",
							border: "none",
							background: activeSubTab === "bactericidal" ? "var(--paper, #ffffff)" : "transparent",
							boxShadow: activeSubTab === "bactericidal" ? "0 1px 3px rgba(0, 0, 0, 0.08)" : "none",
							cursor: "pointer",
							whiteSpace: "nowrap",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
							transition: "all 0.15s ease",
						}}
						data-testid="subtab-bactericidal-btn"
					>
						<Wind size={14} color={activeSubTab === "bactericidal" ? "var(--teal, #0d9488)" : "currentColor"} />
						<span>Обеззараживание воздуха (рециркуляторы)</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeSubTab === "cleaning"}
						onClick={() => setActiveSubTab("cleaning")}
						className="touch-manipulation"
						style={{
							padding: "5px 12px",
							borderRadius: "7px",
							fontSize: "12px",
							fontWeight: activeSubTab === "cleaning" ? 600 : 500,
							color: activeSubTab === "cleaning" ? "var(--ink, #0f172a)" : "var(--muted, #64748b)",
							border: "none",
							background: activeSubTab === "cleaning" ? "var(--paper, #ffffff)" : "transparent",
							boxShadow: activeSubTab === "cleaning" ? "0 1px 3px rgba(0, 0, 0, 0.08)" : "none",
							cursor: "pointer",
							whiteSpace: "nowrap",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
							transition: "all 0.15s ease",
						}}
						data-testid="subtab-cleaning-btn"
					>
						<Sparkles size={14} color={activeSubTab === "cleaning" ? "var(--teal, #0d9488)" : "currentColor"} />
						<span>Генеральные уборки</span>
					</button>
				</div>

				<div className="text-xs text-[var(--muted,#64748b)] hidden md:block">
					Санитарный контроль: обеззараживание воздуха и режим чистоты
				</div>
			</div>

			{/* Sub-Tab Content Rendering */}
			{activeSubTab === "bactericidal" ? (
				<BactericidalRegisterTab />
			) : (
				<GeneralCleaningRegisterTab />
			)}
		</div>
	);
}

export default SanpinUvAndCleaningRegisterTab;
