import React from "react";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";

export interface FinanceTabsNavBarProps {
	readonly activeTab: "cashbox" | "doctor_payroll" | "shift_journal";
	readonly onSelectTab: (tab: "cashbox" | "doctor_payroll" | "shift_journal") => void;
}

export function FinanceTabsNavBar({ activeTab, onSelectTab }: FinanceTabsNavBarProps): React.JSX.Element {
	const { hasPayrollModule } = useWorkspaceProfile();
	const showPayrollTab = hasPayrollModule || isDemoShowcaseMode();

	return (
		<div className="finance-tabs-nav-bar mb-3 max-w-full overflow-x-auto no-scrollbar" style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--line)", paddingBottom: "10px", marginTop: "4px" }}>
			<div className="dente-segmented-bar shrink-0" role="tablist" aria-label="Вкладки финансового раздела" style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 4px", background: "var(--paper-soft, #f1f5f9)", borderRadius: "10px", border: "1px solid var(--line-subtle, var(--line))" }}>
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "cashbox"}
					onClick={() => onSelectTab("cashbox")}
					className={`dente-segmented-item whitespace-nowrap shrink-0 ${activeTab === "cashbox" ? "active" : ""}`}
					style={{
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						minHeight: "44px",
						padding: "0 14px",
						borderRadius: "8px",
						fontSize: "13px",
						fontWeight: activeTab === "cashbox" ? 700 : 500,
						color: activeTab === "cashbox" ? "var(--primary, #0f766e)" : "var(--muted, #64748b)",
						background: activeTab === "cashbox" ? "var(--paper, #ffffff)" : "transparent",
						border: activeTab === "cashbox" ? "1px solid var(--primary, #0f766e)" : "1px solid transparent",
						boxShadow: activeTab === "cashbox" ? "0 1px 3px rgba(15, 118, 110, 0.15)" : "none",
						cursor: "pointer",
						transition: "all 0.15s ease",
					}}
				>
					Касса и платежи
				</button>
				{showPayrollTab && (
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "doctor_payroll"}
						onClick={() => onSelectTab("doctor_payroll")}
						className={`dente-segmented-item whitespace-nowrap shrink-0 ${activeTab === "doctor_payroll" ? "active" : ""}`}
						data-testid="tab-doctor-payroll"
						style={{
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							minHeight: "44px",
							padding: "0 14px",
							borderRadius: "8px",
							fontSize: "13px",
							fontWeight: activeTab === "doctor_payroll" ? 700 : 500,
							color: activeTab === "doctor_payroll" ? "var(--primary, #0f766e)" : "var(--muted, #64748b)",
							background: activeTab === "doctor_payroll" ? "var(--paper, #ffffff)" : "transparent",
							border: activeTab === "doctor_payroll" ? "1px solid var(--primary, #0f766e)" : "1px solid transparent",
							boxShadow: activeTab === "doctor_payroll" ? "0 1px 3px rgba(15, 118, 110, 0.15)" : "none",
							cursor: "pointer",
							transition: "all 0.15s ease",
						}}
					>
						Зарплата врачей
					</button>
				)}
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "shift_journal"}
					onClick={() => onSelectTab("shift_journal")}
					className={`dente-segmented-item whitespace-nowrap shrink-0 ${activeTab === "shift_journal" ? "active" : ""}`}
					data-testid="tab-shift-journal"
					style={{
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						minHeight: "44px",
						padding: "0 14px",
						borderRadius: "8px",
						fontSize: "13px",
						fontWeight: activeTab === "shift_journal" ? 700 : 500,
						color: activeTab === "shift_journal" ? "var(--primary, #0f766e)" : "var(--muted, #64748b)",
						background: activeTab === "shift_journal" ? "var(--paper, #ffffff)" : "transparent",
						border: activeTab === "shift_journal" ? "1px solid var(--primary, #0f766e)" : "1px solid transparent",
						boxShadow: activeTab === "shift_journal" ? "0 1px 3px rgba(15, 118, 110, 0.15)" : "none",
						cursor: "pointer",
						transition: "all 0.15s ease",
					}}
				>
					Журнал смен
				</button>
			</div>
		</div>
	);
}
