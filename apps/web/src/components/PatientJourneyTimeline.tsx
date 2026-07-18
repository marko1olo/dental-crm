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
				timestamp: a.startsAt,
				type: "appointment",
				title: `Прием: ${a.status === "completed" ? "Завершен" : a.status}`,
				description: `Врач: ${a.doctorUserId} | Причина: ${a.reason || "Нет"}`,
				status: a.status === "completed" ? "Completed" : "Draft",
			}));

		const payments: any[] = dashboard?.payments || [];
		const paymentEvents: JourneyEvent[] = payments
			.filter((p) => p.patientId === patientId)
			.map((p) => ({
				id: p.id,
				timestamp: p.paidAt || p.createdAt,
				type: "transaction",
				title: `Оплата (${p.method})`,
				description: `Сумма: ${p.amountRub.toLocaleString("ru-RU")} ₽`,
				amount: p.amountRub,
				status: p.status,
				actionUrl: "#finance",
			}));

		const insights: any[] = dashboard?.patientInsights || [];
		const insightEvents: JourneyEvent[] = insights
			.filter((i) => i.patientId === patientId)
			.map((i) => ({
				id: i.id || Math.random().toString(),
				timestamp: i.createdAt || new Date().toISOString(),
				type: "medical_alert",
				title: `Аналитика: ${i.category === "churn_risk" ? "Риск оттока" : i.category === "unscheduled_treatment" ? "Незапланированное лечение" : i.category}`,
				description: i.reason,
				status: i.riskLevel,
			}));

		const planItems: any[] = dashboard?.treatmentPlanItems || [];
		const treatmentEvents: JourneyEvent[] = planItems
			.filter((i) => i.patientId === patientId && (i.status === "completed" || i.status === "cancelled"))
			.map((i) => ({
				id: i.id || Math.random().toString(),
				timestamp: i.updatedAt || i.createdAt || new Date().toISOString(),
				type: "lab_order", // Reuse lab_order for dental procedures
				title: `Процедура: ${i.serviceId || "Услуга"}`,
				description: `Статус: ${i.status === "completed" ? "Выполнено" : "Отменено"}`,
				status: i.status === "completed" ? "Completed" : "Cancelled",
			}));

		const allEvents = [...visitEvents, ...paymentEvents, ...insightEvents, ...treatmentEvents];

		// Sort by timestamp
		setEvents(
			allEvents.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
			),
		);

		return () => {
			setEvents([]);
		};
	}, [patientId, dashboard?.appointments]);

	// Real Zeigarnik Effect Progress Calculation
	const planItems =
		dashboard?.treatmentPlanItems?.filter((i) => i.patientId === patientId) ||
		[];
	const activeItems = planItems.filter((i) => i.status !== "cancelled");
	const completedItems = activeItems.filter((i) => i.status === "completed");

	const totalItemsCount = activeItems.length;
	const completedItemsCount = completedItems.length;
	const progressPercentage =
		totalItemsCount > 0
			? Math.round((completedItemsCount / totalItemsCount) * 100)
			: 0;

	const showProgress = totalItemsCount > 0 && progressPercentage < 100;

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
			{showProgress && (
				<div className="zeigarnik-progress-container">
					<div className="progress-header">
						<span className="progress-title">План лечения: Общий прогресс</span>
						<span className="progress-percentage text-emerald-400">
							{progressPercentage}%
						</span>
					</div>
					<div className="progress-bar-bg">
						<div
							className="progress-bar-fill"
							style={{ width: `${progressPercentage}%` }}
						></div>
					</div>
					<p className="progress-hint">
						Пройдено {completedItemsCount} процедуры из {totalItemsCount}.
						Следующий визит приблизит вас к завершению плана!
					</p>
				</div>
			)}

			<div className="timeline-track">
				{events.length === 0 && (
					<div className="empty-state text-zinc-500 text-sm py-4">
						Нет зарегистрированных событий пациента.
					</div>
				)}
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
