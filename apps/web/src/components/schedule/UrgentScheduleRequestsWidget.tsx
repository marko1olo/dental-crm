import { showToast } from "../GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import type { UrgentScheduleRequest } from "@dental/shared";
import { useEffect, useState } from "react";

export function UrgentScheduleRequestsWidget() {
	const [requests, setRequests] = useState<UrgentScheduleRequest[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch("/api/schedule/urgent-schedule-requests", {
			credentials: "include",
		})
			.then((res) => res.json())
			.then((data: UrgentScheduleRequest[]) => {
				setRequests(data);
				setLoading(false);
			})
			.catch((err) => {
				console.error("Failed to fetch urgent requests", err);
				setLoading(false);
			});
	}, []);

	const handleResolve = async (id: string) => {
		try {
			const res = await fetch(
				`/api/schedule/urgent-schedule-requests/${id}/resolve`,
				{
					method: "PATCH",
					credentials: "include",
				},
			);
			if (res.ok) {
				setRequests((prev) => prev.filter((r) => r.id !== id));
			}
		} catch (err) {
			showToast(actionFailureToast("Ошибка выполнения операции", (err as { status?: number })?.status ?? null), "error");
			console.error("Failed to resolve urgent request", err);
		}
	};

	if (loading) {
		return <div>Загрузка...</div>;
	}

	if (requests.length === 0) {
		return (
			<div>
				<p style={{ color: "var(--muted)", fontSize: "14px" }}>
					Срочных обращений нет. Окна резерва готовы
				</p>
			</div>
		);
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
			<h3 style={{ fontSize: "16px", fontWeight: 600 }}>Срочные обращения</h3>
			{requests.map((r) => (
				<div
					key={r.id}
					style={{
						border: "1px solid var(--border)",
						borderRadius: "8px",
						padding: "12px",
						background: "var(--background)",
					}}
				>
					<div style={{ fontWeight: 500, marginBottom: "4px" }}>
						{r.patientName} - {r.requestType}
					</div>
					<div
						style={{
							fontSize: "14px",
							color: "var(--muted)",
							marginBottom: "8px",
						}}
					>
						Уровень срочности: {r.urgencyLevel}
						<br />
						Врач: {r.doctorName || "Любой"}
						<br />
						Желаемое время: {r.preferredSlotTime || "Не указано"}
					</div>
					<button
						type="button"
						onClick={() => handleResolve(r.id)}
						style={{
							background: "var(--primary)",
							color: "var(--primary-foreground)",
							border: "none",
							padding: "6px 12px",
							borderRadius: "4px",
							cursor: "pointer",
							fontSize: "14px",
						}}
					>
						Отметить решенным
					</button>
				</div>
			))}
		</div>
	);
}
