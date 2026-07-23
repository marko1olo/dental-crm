import React, { useEffect, useState } from "react";
import { ShieldAlert, Archive, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";

export interface ArchiveReasonItem {
	id: string;
	organizationId: string;
	reasonName: string;
	isBlacklisted: boolean;
	allowRebooking: boolean;
	notes?: string | null;
	createdAt: string;
}

export const PatientArchiveAndBlacklistWidget: React.FC<{ patientId: string }> = ({ patientId }) => {
	const { auth } = useAppLogicContext();
	const [reasons, setReasons] = useState<ArchiveReasonItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [selectedReason, setSelectedReason] = useState<string>("");
	const [isBlacklisted, setIsBlacklisted] = useState<boolean>(false);
	const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);

	useEffect(() => {
		if (!patientId) return;
		fetch(`/api/patients/${patientId}/archive-status`, {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				const list = Array.isArray(data) ? data : [];
				setReasons(list);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[PatientArchiveAndBlacklistWidget fetch error]:", err);
				setLoading(false);
			});
	}, [patientId, auth]);

	const handleApplyStatus = () => {
		setIsBlacklisted(!isBlacklisted);
		setConfirmModalOpen(false);
		showToast(
			!isBlacklisted
				? "Пациент внесен в черный список. Запись заблокирована во всех окнах."
				: "Запрет записи с пациента снят.",
			!isBlacklisted ? "warning" : "success"
		);
	};

	return (
		<div
			data-testid="patient-archive-blacklist-widget"
			style={{
				padding: "16px",
				background: isBlacklisted ? "var(--rose-50, #fff1f2)" : "var(--paper)",
				border: isBlacklisted ? "1px solid var(--rose-300, #fca5a5)" : "1px solid var(--line)",
				borderRadius: "12px",
				marginTop: "16px",
				transition: "all 0.2s ease"
			}}
		>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<ShieldAlert size={18} style={{ color: isBlacklisted ? "#e11d48" : "var(--brand-500)" }} />
					<h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
						Статус архивации и Запрет записи (Черный список)
					</h3>
				</div>
				<span style={{ fontSize: "11px", background: isBlacklisted ? "#ffe4e6" : "var(--brand-50)", color: isBlacklisted ? "#9f1239" : "var(--brand-700)", padding: "2px 8px", borderRadius: "6px", fontWeight: 600 }}>
					IDENT Parity #20
				</span>
			</div>

			{loading ? (
				<div style={{ fontSize: "13px", color: "var(--muted)", padding: "12px 0" }}>Загрузка статуса записи...</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "var(--surface-50)", borderRadius: "8px", border: "1px solid var(--line)" }}>
						<div>
							<div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
								{isBlacklisted ? "Запрет записи активен (Черный список)" : "Стандартный доступ к записи"}
							</div>
							<div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
								{isBlacklisted
									? "Пациент заблокирован для самостоятельной и административной записи."
									: "Запись пациента разрешена во всех окнах расписания."}
							</div>
						</div>

						<button
							type="button"
							onClick={() => setConfirmModalOpen(true)}
							style={{
								padding: "6px 12px",
								fontSize: "12px",
								fontWeight: 600,
								borderRadius: "6px",
								border: "none",
								cursor: "pointer",
								background: isBlacklisted ? "var(--emerald)" : "#e11d48",
								color: "#fff"
							}}
						>
							{isBlacklisted ? "Разблокировать запись" : "Внести в черный список"}
						</button>
					</div>

					<div className="smart-field" style={{ marginTop: "4px" }}>
						<select
							value={selectedReason}
							onChange={(e) => setSelectedReason(e.target.value)}
							style={{ width: "100%", padding: "8px 12px", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "6px" }}
						>
							<option value="">-- Выберите причину архивации / списания --</option>
							{reasons.map((r) => (
								<option key={r.id} value={r.id}>
									{r.reasonName} {r.isBlacklisted ? "(Черный список)" : ""}
								</option>
							))}
						</select>
					</div>
				</div>
			)}

			{confirmModalOpen && (
				<div style={{
					position: "fixed",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: "rgba(0,0,0,0.5)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					zIndex: 1000
				}}>
					<div style={{
						background: "var(--paper)",
						padding: "24px",
						borderRadius: "12px",
						maxWidth: "420px",
						width: "90%",
						boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)"
					}}>
						<div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#e11d48", marginBottom: "12px" }}>
							<AlertTriangle size={24} />
							<h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
								{!isBlacklisted ? "Подтвердите блокировку записи" : "Подтвердите снятие блокировки"}
							</h4>
						</div>

						<p style={{ fontSize: "13px", color: "var(--ink)", lineHeight: 1.5, margin: "0 0 16px" }}>
							{!isBlacklisted
								? "Вы собираетесь внести пациента в черный список. Это действие заблокирует создание новых визитов и подсветит карту красным во всех окнах."
								: "Вы возобновите возможность обычной записи данного пациента в расписание."}
						</p>

						<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
							<button
								type="button"
								className="ghost-button"
								onClick={() => setConfirmModalOpen(false)}
							>
								Отмена
							</button>
							<button
								type="button"
								style={{
									padding: "8px 16px",
									background: !isBlacklisted ? "#e11d48" : "var(--emerald)",
									color: "#fff",
									border: "none",
									borderRadius: "6px",
									fontWeight: 600,
									cursor: "pointer"
								}}
								onClick={handleApplyStatus}
							>
								{!isBlacklisted ? "Заблокировать" : "Разблокировать"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
