import React, { useEffect, useState } from "react";
import { Clock, UserCheck, ChevronRight } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

interface RecentPatientItem {
	id: string;
	organizationId: string;
	userId: string;
	patientId: string;
	patientName: string;
	phone: string;
	lastViewedAt: string;
}

export const RecentPatientHistoryWidget: React.FC<{ compactDropdown?: boolean }> = ({ compactDropdown = false }) => {
	const { auth, selectPatient } = useAppLogicContext();
	const [patients, setPatients] = useState<RecentPatientItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [isOpen, setIsOpen] = useState<boolean>(false);

	const fetchRecent = () => {
		fetch("/api/hr/recent-patients", {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setPatients(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[RecentPatientHistoryWidget fetch error]:", err);
				setLoading(false);
			});
	};

	useEffect(() => {
		fetchRecent();
	}, []);

	const handleOpenPatient = (patId: string) => {
		if (selectPatient) {
			selectPatient(patId);
		}
		window.location.hash = "#patients";
		setIsOpen(false);
	};

	if (compactDropdown) {
		return (
			<details
				className="workspace-role-switcher recent-patients-header-dropdown"
				data-testid="recent-patient-history-header-widget"
				open={isOpen}
				onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
				style={{ position: "relative" }}
			>
				<summary title="История 10 последних просмотренных карточек">
					<Clock size={16} aria-hidden="true" style={{ color: "var(--brand-500)" }} />
					<span>Недавние</span>
					<strong style={{ fontSize: "12px", background: "var(--brand-50)", color: "var(--brand-700)", padding: "2px 6px", borderRadius: "10px" }}>
						{patients.length}
					</strong>
				</summary>
				<div
					className="role-switcher-options"
					style={{
						position: "absolute",
						top: "100%",
						right: 0,
						width: "320px",
						maxHeight: "380px",
						overflowY: "auto",
						background: "var(--paper)",
						border: "1px solid var(--line)",
						borderRadius: "12px",
						boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
						padding: "8px",
						zIndex: 100
					}}
				>
					<div style={{ padding: "8px 12px", borderBottom: "1px solid var(--line)", fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<span>ОТКРЫТЫЕ РАНЕЕ КАРТОЧКИ</span>
						<span style={{ fontSize: "10px", color: "var(--slate-400)" }}>ТОП 10</span>
					</div>

					{loading ? (
						<div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "var(--muted)" }}>Загрузка...</div>
					) : patients.length === 0 ? (
						<div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "var(--muted)" }}>История просмотров пуста</div>
					) : (
						patients.map((pat) => (
							<button
								key={pat.id}
								type="button"
								onClick={() => handleOpenPatient(pat.patientId || pat.id)}
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									width: "100%",
									padding: "8px 12px",
									borderRadius: "8px",
									border: "none",
									background: "transparent",
									cursor: "pointer",
									textAlign: "left",
									transition: "background 0.15s ease"
								}}
								className="hover-surface"
							>
								<div>
									<div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>{pat.patientName}</div>
									<div style={{ fontSize: "11px", color: "var(--slate-500)" }}>{pat.phone}</div>
								</div>
								<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
									<span style={{ fontSize: "10px", color: "var(--muted)", background: "var(--surface-100)", padding: "2px 6px", borderRadius: "4px" }}>
										{new Date(pat.lastViewedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
									</span>
									<ChevronRight size={14} style={{ color: "var(--slate-400)" }} />
								</div>
							</button>
						))
					)}
				</div>
			</details>
		);
	}

	return (
		<div
			data-testid="recent-patient-history-widget"
			style={{
				padding: "16px",
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: "12px",
				marginTop: "16px"
			}}
		>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Clock size={18} style={{ color: "var(--brand-500)" }} />
					<h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
						Быстрый переход: Недавно просмотренные карточки пациентов
					</h3>
				</div>
				<span style={{ fontSize: "11px", background: "var(--brand-50)", color: "var(--brand-700)", padding: "2px 8px", borderRadius: "6px", fontWeight: 600 }}>
					CRM Quick Nav
				</span>
			</div>

			{loading ? (
				<div style={{ fontSize: "13px", color: "var(--muted)", padding: "12px 0" }}>Загрузка...</div>
			) : patients.length === 0 ? (
				<div style={{ fontSize: "13px", color: "var(--muted)", padding: "12px 0" }}>Нет недавних карточек</div>
			) : (
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
					{patients.map((pat) => (
						<div
							key={pat.id}
							style={{
								padding: "10px 14px",
								background: "var(--surface-50)",
								border: "1px solid var(--line)",
								borderRadius: "8px",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between"
							}}
						>
							<div>
								<div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>{pat.patientName}</div>
								<div style={{ fontSize: "11px", color: "var(--muted)" }}>{pat.phone}</div>
							</div>
							<button
								type="button"
								onClick={() => handleOpenPatient(pat.patientId || pat.id)}
								style={{
									fontSize: "12px",
									background: "var(--brand-500)",
									color: "#fff",
									border: "none",
									borderRadius: "6px",
									padding: "6px 10px",
									fontWeight: 600,
									cursor: "pointer"
								}}
							>
								Открыть
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

