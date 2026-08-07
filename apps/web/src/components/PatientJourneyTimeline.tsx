import type React from "react";
import { useEffect, useState } from "react";
import "./PatientJourneyTimeline.css";
import type { Dashboard } from "@dental/shared";
import { money } from "../AppHelpers";

/** Статусы приёма по-русски: в ленту попадал английский ключ из базы. */
const appointmentStatusLabels: Record<string, string> = {
	planned: "запланирован",
	confirmed: "подтверждён",
	arrived: "пациент пришёл",
	in_treatment: "идёт приём",
	in_progress: "идёт приём",
	completed: "завершён",
	cancelled: "отменён",
	no_show: "пациент не пришёл",
};

/** Категории аналитики по-русски: печатался ключ вида churn_risk. */
const insightCategoryLabels: Record<string, string> = {
	churn_risk: "риск потерять пациента",
	unscheduled_treatment: "лечение не запланировано",
	overdue_recall: "пора на осмотр",
	balance_due: "есть долг",
	documents_missing: "не хватает документов",
};

const insightRiskLabels: Record<string, string> = {
	low: "спокойно",
	watch: "контроль",
	medium: "контроль",
	high: "срочно",
};

const paymentMethodLabels: Record<string, string> = {
	cash: "наличные",
	card: "карта",
	bank_transfer: "перевод",
	online: "онлайн",
	insurance: "страховая",
	family_wallet: "семейный счёт",
	other: "иное",
};

const paymentStatusLabels: Record<string, string> = {
	planned: "запланирована",
	paid: "оплачена",
	refunded: "возврат",
	voided: "аннулирована",
};

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
		/*
		 * Лента показывалась человеку с сырыми данными из базы:
		 *  - «Врач: 8356141b-7cfa-4221-95f7-70f47e7344b1» — вместо фамилии
		 *    печатался идентификатор строки;
		 *  - «Прием: planned» — английский ключ статуса;
		 *  - «Аналитика: churn_risk» — английский ключ категории;
		 *  - плашка состояния «Completed» и «Draft» по-английски;
		 *  - сумма форматировалась своей копией кода, из-за чего копейки
		 *    печатались одной цифрой: «1 500,5 ₽»;
		 *  - ключ строки брался из Math.random(), и React пересоздавал строки
		 *    на каждой перерисовке.
		 */
		const staffById = new Map<string, { fullName?: string }>(
			(dashboard?.clinicSettings?.staff ?? []).map((member) => [
				member.id,
				member,
			]),
		);
		const doctorName = (doctorUserId: string | null | undefined) => {
			if (!doctorUserId) return "врач не назначен";
			return staffById.get(doctorUserId)?.fullName ?? "врач не найден в списке";
		};

		const appointments: any[] = dashboard?.appointments || [];
		const visitEvents: JourneyEvent[] = appointments
			.filter((a) => a.patientId === patientId)
			.map((a) => {
				const statusKey = String(a.status ?? "").toLowerCase();
				return {
					id: a.id,
					timestamp: a.startsAt,
					type: "appointment",
					title: `Приём ${appointmentStatusLabels[statusKey] ?? statusKey}`,
					description: `${doctorName(a.doctorUserId)} · ${a.reason || "повод не указан"}`,
					status: appointmentStatusLabels[statusKey] ?? statusKey,
					actionUrl: `/patients/${patientId}/visit/${a.id}`,
				};
			});

		const payments: any[] = dashboard?.payments || [];
		const paymentEvents: JourneyEvent[] = payments
			.filter((p) => p.patientId === patientId)
			.map((p) => ({
				id: p.id,
				timestamp: p.paidAt || p.createdAt,
				type: "transaction",
				title: `Оплата: ${paymentMethodLabels[String(p.method)] ?? p.method}`,
				description: `Сумма ${money(p.amountRub)}`,
				amount: p.amountRub,
				status: paymentStatusLabels[String(p.status)] ?? p.status,
				actionUrl: `#finance`,
			}));

		const insights: any[] = dashboard?.patientInsights || [];
		const insightEvents: JourneyEvent[] = insights
			.filter((i) => i.patientId === patientId)
			.map((i) => ({
				id: i.id ?? `insight-${i.patientId}-${i.category}`,
				timestamp: i.createdAt || new Date().toISOString(),
				type: "medical_alert",
				title: insightCategoryLabels[String(i.category)] ?? String(i.category),
				description: i.reason,
				status: insightRiskLabels[String(i.riskLevel)] ?? i.riskLevel,
			}));

		const allEvents = [...visitEvents, ...paymentEvents, ...insightEvents];

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
	}, [
		patientId,
		dashboard?.appointments,
		dashboard?.payments,
		dashboard?.patientInsights,
		dashboard?.clinicSettings?.staff,
	]);

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

			{/*
				Пустого состояния не было вовсе: у пациента без приёмов на экране
				оставался чёрный прямоугольник с заголовком и идентификатором —
				выглядел как незагрузившийся блок.
			*/}
			{events.length === 0 ? (
				<div className="timeline-empty">
					<p>Здесь пока ничего не было</p>
					<span>
						Записи на приём, оплаты и предупреждения по этому пациенту появятся
						в этой ленте сами, как только они появятся в клинике.
					</span>
				</div>
			) : null}

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
									{/* Было toLocaleString() без локали: формат зависел от настроек
									    браузера, и у части пользователей дата выходила как 7/27/2026. */}
									{/* Цвета текста здесь были из тёмной палитры (text-white,
								    text-zinc-300/400) под чёрный фон блока. Фон теперь по
								    теме, поэтому цвет тоже берём из токенов — иначе на
								    светлой теме получился бы белый текст на белом. */}
									<span className="timestamp text-xs font-mono">
										{new Date(evt.timestamp).toLocaleString("ru-RU", {
											day: "2-digit",
											month: "2-digit",
											year: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
									{evt.status && (
										<span
											className={`status-badge ${evt.status.toLowerCase().replace(" ", "-")}`}
										>
											{evt.status}
										</span>
									)}
								</div>
								<h4 className={isHighlight ? "text-lg font-bold" : "text-base"}>
									{evt.title}
								</h4>
								<p className="text-sm">{evt.description}</p>
								{/* Было toLocaleString() без локали и без копеек: 1500.5
								    печаталось как «1500.5 ₽», а разряды не разделялись. */}
								{evt.amount ? (
									<div className="amount-highlight">+{money(evt.amount)}</div>
								) : null}
								{evt.actionUrl && (
									<button
										type="button"
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
