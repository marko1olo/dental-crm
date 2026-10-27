import React from "react";
import { Clock, Zap } from "lucide-react";
import type { LastActivePatientData, RecentPatientItem } from "./recentPatientStorage";

export interface RecentPatientsGridViewProps {
	readonly patients: readonly RecentPatientItem[];
	readonly activeLastPatient: LastActivePatientData | null;
	readonly loading: boolean;
	readonly failed: boolean;
	readonly onOpenPatient: (id: string, name?: string, phone?: string) => void;
}

export function RecentPatientsGridView({
	patients,
	activeLastPatient,
	loading,
	failed,
	onOpenPatient,
}: RecentPatientsGridViewProps) {
	return (
		<div data-testid="recent-patient-history-widget" className="panel" style={{ padding: "16px", margin: "16px 0" }}>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid var(--line)" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Clock size={18} style={{ color: "var(--teal)" }} />
					<h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--ink)" }}>Карточки, которые вы открывали недавно</h3>
				</div>
			</div>
			{activeLastPatient && (
				<div data-testid="recent-patient-1click-restore-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", marginBottom: "16px", borderRadius: "10px", border: "1px solid var(--teal, #0d9488)", background: "var(--teal-surface, rgba(13, 148, 136, 0.08))", gap: "12px", flexWrap: "wrap" }}>
					<div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: "10px" }}>
						<div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--teal, #0d9488)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
							<Zap size={18} />
						</div>
						<div>
							<div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--teal, #0d9488)", letterSpacing: "0.5px" }}>Быстрый возврат к приёму</div>
							<div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeLastPatient.patientName}</div>
						</div>
					</div>
					<button
						type="button"
						data-testid="recent-patient-1click-restore-btn"
						onClick={() => onOpenPatient(activeLastPatient.patientId, activeLastPatient.patientName, activeLastPatient.phone)}
						className="primary-button"
						style={{ minHeight: "44px", padding: "0 18px", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer" }}
					>
						⚡ Восстановить карту
					</button>
				</div>
			)}
			{loading ? (
				<div style={{ fontSize: "13px", padding: "16px 0", color: "var(--muted)" }}>Загрузка...</div>
			) : failed ? (
				<div style={{ fontSize: "13px", padding: "12px 0", textAlign: "center", color: "var(--bad-fg)" }}>Не удалось прочитать историю. Обновите страницу.</div>
			) : patients.length === 0 ? (
				<div style={{ fontSize: "13px", padding: "12px 0", textAlign: "center", color: "var(--muted)" }}>Здесь появятся карточки, которые вы открывали</div>
			) : (
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
					{patients.map((pat) => (
						<div key={pat.id} className="clickable-card" style={{ padding: "12px", display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
							<div style={{ minWidth: 0 }}>
								<div style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pat.patientName}</div>
								<div style={{ fontSize: "12px", color: "var(--muted)" }}>{pat.phone}</div>
							</div>
							<button
								type="button"
								data-testid={`recent-patient-grid-btn-${pat.patientId || pat.id}`}
								onClick={() => onOpenPatient(pat.patientId || pat.id, pat.patientName, pat.phone)}
								className="primary-button"
								style={{ minHeight: "44px", minWidth: "76px", padding: "0 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
							>
								Открыть
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
