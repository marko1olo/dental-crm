import type React from "react";
import { useEffect, useState } from "react";
import "./PatientJourneyTimeline.css";
import type { Dashboard } from "@dental/shared";

interface JourneyEvent {
	id: string;
	timestamp: string;
	type:
		| "appointment"
		| "medical_alert"
		| "lab_order"
		| "transaction"
		| "inventory_depletion";
	title: string;
	description: string;
	amount?: number;
	status?: string;
	actionUrl?: string;
}

export const PatientJourneyTimeline: React.FC<{
	patientId: string;
	dashboard?: Dashboard | null;
}> = ({ patientId, dashboard }) => {
	const [events, setEvents] = useState<JourneyEvent[]>([]);

	useEffect(() => {
		// Generate real events from appointments
		const appointments: any[] = dashboard?.appointments || [];
		const visitEvents: JourneyEvent[] = appointments
			.filter((a) => a.patientId === patientId)
			.map((a) => ({
				id: a.id,
				timestamp: a.plannedStart,
				type: "appointment",
				title: `Прием: ${a.status === "completed" ? "Завершен" : a.status}`,
				description: `Врач: ${a.doctorId} | Диагноз: ${a.diagnosis || "Нет"}`,
				status: a.status === "completed" ? "Completed" : "Draft",
				actionUrl: `/patients/${patientId}/visit/${a.id}`,
			}));

		// Sort by timestamp
		setEvents(
			visitEvents.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
			),
		);

		return () => {
			setEvents([]);
		};
	}, [patientId, dashboard?.appointments]);

	const getIcon = (type: string) => {
		switch (type) {
			case "medical_alert":
				return "⚠️";
			case "appointment":
				return "📅";
			case "transaction":
				return "💰";
			case "inventory_depletion":
				return "📦";
			case "lab_order":
				return "🦷";
			default:
				return "🔹";
		}
	};

	return (
		<div className="patient-journey-timeline">
			<div className="timeline-header">
				<h3>Лента приемов пациента</h3>
				<span className="patient-id-badge">ID: {patientId.slice(0, 8)}</span>
			</div>

			{/* Эффект Зейгарник: Прогресс-бар лечения */}
			<div className="zeigarnik-progress-container">
				<div className="progress-header">
					<span className="progress-title">
						План лечения: Ортопедия (Фаза 2)
					</span>
					<span className="progress-percentage text-emerald-400">37%</span>
				</div>
				<div className="progress-bar-bg">
					<div className="progress-bar-fill" style={{ width: "37%" }}></div>
				</div>
				<p className="progress-hint">
					Пройдено 3 процедуры из 8. Следующий визит приблизит вас к завершению
					плана!
				</p>
			</div>

			<div className="timeline-track">
				{events.map((evt, index) => {
					// Эффект Края (Serial Position Effect): выделяем первый и последний элементы
					const isFirst = index === 0;
					const isLast = index === events.length - 1;
					const isHighlight = isFirst || isLast;

					return (
						<div
							key={evt.id}
							className={`timeline-item ${evt.type} ${isHighlight ? "highlight-item" : ""}`}
						>
							<div className="timeline-marker">
								<div
									className={`marker-icon ${isHighlight ? "marker-icon-large" : ""}`}
								>
									{getIcon(evt.type)}
								</div>
								{index !== events.length - 1 && <div className="marker-line" />}
							</div>

							<div className="timeline-content">
								<div className="content-header">
									<span className="timestamp text-xs font-mono text-zinc-400">
										{new Date(evt.timestamp).toLocaleString()}
									</span>
									{evt.status && (
										<span
											className={`status-badge ${evt.status.toLowerCase().replace(" ", "-")}`}
										>
											{evt.status}
										</span>
									)}
								</div>
								<h4
									className={
										isHighlight
											? "text-lg text-white font-bold"
											: "text-base text-zinc-300"
									}
								>
									{evt.title}
								</h4>
								<p
									className={
										isHighlight
											? "text-sm text-zinc-300"
											: "text-sm text-zinc-400"
									}
								>
									{evt.description}
								</p>
								{evt.amount && (
									<div className="amount-highlight">
										+{evt.amount.toLocaleString()} ₽
									</div>
								)}
								{evt.actionUrl && (
									<button
										className="timeline-action-btn"
										onClick={() => {
											window.location.hash = evt.actionUrl ?? "";
										}}
									>
										Подробнее &rarr;
									</button>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
