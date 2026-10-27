import React from "react";
import { ChevronDown, ChevronRight, Clock, Zap } from "lucide-react";
import type { LastActivePatientData, RecentPatientItem } from "./recentPatientStorage";

export interface RecentPatientsDropdownViewProps {
	readonly isOpen: boolean;
	readonly onToggleOpen: (open: boolean) => void;
	readonly patients: readonly RecentPatientItem[];
	readonly activeLastPatient: LastActivePatientData | null;
	readonly loading: boolean;
	readonly failed: boolean;
	readonly onOpenPatient: (id: string, name?: string, phone?: string) => void;
}

export function RecentPatientsDropdownView({
	isOpen,
	onToggleOpen,
	patients,
	activeLastPatient,
	loading,
	failed,
	onOpenPatient,
}: RecentPatientsDropdownViewProps) {
	return (
		<details
			className="workspace-role-switcher recent-patients-header-dropdown shrink-0"
			data-testid="recent-patient-history-header-widget"
			open={isOpen}
			onToggle={(e) => onToggleOpen((e.target as HTMLDetailsElement).open)}
			style={{ position: "relative", flexShrink: 0 }}
		>
			<summary
				title="История 10 последних просмотренных карточек"
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "6px",
					cursor: "pointer",
					fontSize: "12px",
					fontWeight: 500,
					color: "var(--ink-2)",
					minHeight: "44px",
					minWidth: "44px",
					padding: "0 4px",
				}}
			>
				<Clock size={13} aria-hidden="true" style={{ color: "var(--teal)" }} />
				<span className="hidden 2xl:inline">Недавние</span>
				<strong className="status-pill status-confirmed" style={{ fontSize: "11px", padding: "1px 7px" }}>
					{patients.length}
				</strong>
				<ChevronDown size={13} className="switcher-chevron opacity-60" aria-hidden="true" />
			</summary>
			<div className="role-switcher-options" style={{ position: "absolute", top: "100%", right: 0, width: "320px", maxHeight: "380px", overflowY: "auto", zIndex: 50 }}>
				<div style={{ padding: "8px 12px", borderBottom: "1px solid var(--line)", fontSize: "11px", fontWeight: 700, color: "var(--muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<span>ОТКРЫТЫЕ РАНЕЕ КАРТОЧКИ</span>
					<span style={{ fontSize: "10px", color: "var(--muted)" }}>ТОП 10</span>
				</div>
				{activeLastPatient && (
					<div style={{ padding: "8px 10px", borderBottom: "1px solid var(--line)", background: "var(--teal-surface, rgba(13, 148, 136, 0.08))" }}>
						<button
							type="button"
							data-testid="recent-patient-1click-restore"
							onClick={() => onOpenPatient(activeLastPatient.patientId, activeLastPatient.patientName, activeLastPatient.phone)}
							style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", minHeight: "44px", padding: "0 10px", borderRadius: "8px", border: "1px solid var(--teal, #0d9488)", background: "var(--teal, #0d9488)", color: "#ffffff", fontSize: "12px", fontWeight: 700, cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
						>
							<Zap size={14} style={{ flexShrink: 0 }} />
							<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
								Восстановить: {activeLastPatient.patientName}
							</span>
						</button>
					</div>
				)}
				{loading ? (
					<div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "var(--muted)" }}>Загрузка...</div>
				) : failed ? (
					<div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "var(--muted)" }}>Не удалось прочитать историю. Обновите страницу.</div>
				) : patients.length === 0 ? (
					<div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "var(--muted)" }}>Здесь появятся карточки, которые вы открывали</div>
				) : (
					patients.map((pat) => (
						<button
							key={pat.id}
							type="button"
							data-testid={`recent-patient-item-${pat.patientId || pat.id}`}
							onClick={() => onOpenPatient(pat.patientId || pat.id, pat.patientName, pat.phone)}
							style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", minHeight: "44px", padding: "8px 10px", borderRadius: "8px", border: "none", background: "transparent", textAlign: "left", cursor: "pointer" }}
						>
							<div style={{ minWidth: 0 }}>
								<div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pat.patientName}</div>
								<div style={{ fontSize: "11px", color: "var(--muted)" }}>{pat.phone}</div>
							</div>
							<div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, marginLeft: "8px" }}>
								<span style={{ fontSize: "10px", color: "var(--muted)", background: "var(--paper-soft)", padding: "2px 6px", borderRadius: "4px" }}>
									{new Date(pat.lastViewedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
								</span>
								<ChevronRight size={14} style={{ color: "var(--muted)" }} />
							</div>
						</button>
					))
				)}
			</div>
		</details>
	);
}
