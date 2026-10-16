import React from "react";

export interface FinanceTabsNavBarProps {
	readonly activeTab: "cashbox" | "doctor_payroll";
	readonly onSelectTab: (tab: "cashbox" | "doctor_payroll") => void;
}

export function FinanceTabsNavBar({ activeTab, onSelectTab }: FinanceTabsNavBarProps): React.JSX.Element {
	return (
		<div className="finance-tabs-nav-bar mb-3" style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--line)", paddingBottom: "10px", marginTop: "4px" }}>
			<div className="dente-segmented-bar" role="tablist" aria-label="Вкладки финансового раздела" style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 4px", background: "var(--paper-soft, #f1f5f9)", borderRadius: "10px", border: "1px solid var(--line-subtle, var(--line))" }}>
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "cashbox"}
					onClick={() => onSelectTab("cashbox")}
					className={`dente-segmented-item ${activeTab === "cashbox" ? "active" : ""}`}
					style={{
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						minHeight: "44px",
						padding: "0 18px",
						borderRadius: "8px",
						fontSize: "13px",
						fontWeight: activeTab === "cashbox" ? 700 : 500,
						color: activeTab === "cashbox" ? "var(--teal, #0d9488)" : "var(--muted, #64748b)",
						background: activeTab === "cashbox" ? "var(--paper, #ffffff)" : "transparent",
						border: activeTab === "cashbox" ? "1px solid var(--teal, #0d9488)" : "1px solid transparent",
						boxShadow: activeTab === "cashbox" ? "0 1px 3px rgba(13, 148, 136, 0.15)" : "none",
						cursor: "pointer",
						transition: "all 0.15s ease",
					}}
				>
					Касса и платежи
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "doctor_payroll"}
					onClick={() => onSelectTab("doctor_payroll")}
					className={`dente-segmented-item ${activeTab === "doctor_payroll" ? "active" : ""}`}
					data-testid="tab-doctor-payroll"
					style={{
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						minHeight: "44px",
						padding: "0 18px",
						borderRadius: "8px",
						fontSize: "13px",
						fontWeight: activeTab === "doctor_payroll" ? 700 : 500,
						color: activeTab === "doctor_payroll" ? "var(--teal, #0d9488)" : "var(--muted, #64748b)",
						background: activeTab === "doctor_payroll" ? "var(--paper, #ffffff)" : "transparent",
						border: activeTab === "doctor_payroll" ? "1px solid var(--teal, #0d9488)" : "1px solid transparent",
						boxShadow: activeTab === "doctor_payroll" ? "0 1px 3px rgba(13, 148, 136, 0.15)" : "none",
						cursor: "pointer",
						transition: "all 0.15s ease",
					}}
				>
					Зарплата врачей
				</button>
			</div>
		</div>
	);
}
