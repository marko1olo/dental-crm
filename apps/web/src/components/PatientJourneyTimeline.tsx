import React, { useMemo, useState } from "react";
import {
	Activity,
	AlertTriangle,
	Calendar,
	CircleDot,
	DollarSign,
	Layers,
	Package,
	Search,
	Sparkles,
	X,
} from "lucide-react";
import "./PatientJourneyTimeline.css";
import type { Dashboard } from "@dental/shared";
import { money } from "../AppHelpers";

function highlightMatch(text: string, query: string): React.ReactNode {
	if (!query.trim() || !text) return text;
	const trimmed = query.trim();
	const regex = new RegExp(`(${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
	const parts = text.split(regex);
	return parts.map((part, i) =>
		regex.test(part) ? (
			<mark
				key={i}
				className="bg-amber-300 dark:bg-amber-500/40 text-amber-950 dark:text-amber-100 rounded px-1 font-bold"
			>
				{part}
			</mark>
		) : (
			part
		),
	);
}

/**
 * Преобразование пугающих хирургических и узкоспециализированных аббревиатур
 * в тёплый, понятный пациенту русский язык (Consumer Apple Health HIG).
 */
export function toFriendlyRussianProcedure(text: string): string {
	if (!text) return text;
	let friendly = text;

	const medicalDictionary: Array<[RegExp, string]> = [
		[/К02\.0|К02\.1|К02\.2|кариес\s*эмали|кариес\s*дентина/gi, "Лечение кариеса с эстетической реставрацией"],
		[/К04\.0|К04\.1|пульпит|девитализация|экстирпация\s*пульпы/gi, "Бережное лечение зубного нерва под микроскопом"],
		[/К04\.4|К04\.5|периодонтит|обтурация\s*каналов/gi, "Пломбирование и стерилизация корневых каналов"],
		[/К05\.\d|пародонтит|гингивит|кюретаж/gi, "Оздоровление и укрепление десен"],
		[/синус-лифтинг|аугментация\s*кости|остеопластика/gi, "Подготовка костной ткани к установке имплантата"],
		[/дентальная\s*имплантация|установка\s*имплантата/gi, "Установка премиального имплантата"],
		[/препарирование\s*под\s*коронку|снятие\s*оттисков/gi, "Подготовка зуба под защитную керамическую коронку"],
		[/коффердам|раббердам/gi, "Стерильная защита зуба латексным платком"],
		[/апекс-локация/gi, "Точное электронное измерение длины каналов"],
		[/профессиональная\s*гигиена|air-flow|ультразвук/gi, "Комплексная спа-гигиена Air-Flow и удаление налета"],
	];

	for (const [pattern, replacement] of medicalDictionary) {
		friendly = friendly.replace(pattern, replacement);
	}
	return friendly;
}

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

export interface JourneyEvent {
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

export interface PatientJourneyTimelineProps {
	patientId: string;
	dashboard?: Dashboard | null;
}

export const PatientJourneyTimeline: React.FC<PatientJourneyTimelineProps> =
	React.memo(({ patientId, dashboard }) => {
		const staffById = useMemo(() => {
			return new Map<string, { fullName?: string }>(
				(dashboard?.clinicSettings?.staff ?? [])?.map((member) => [
					member.id,
					member,
				]),
			);
		}, [dashboard?.clinicSettings?.staff]);

		const events = useMemo<JourneyEvent[]>(() => {
			const doctorName = (doctorUserId: string | null | undefined) => {
				if (!doctorUserId) return "врач не назначен";
				return (
					staffById.get(doctorUserId)?.fullName ?? "врач не найден в списке"
				);
			};

			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			const appointments: any[] = dashboard?.appointments || [];
			const visitEvents: JourneyEvent[] = appointments
				.filter((a) => a.patientId === patientId)
				?.map((a) => {
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

			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			const payments: any[] = dashboard?.payments || [];
			const paymentEvents: JourneyEvent[] = payments
				.filter((p) => p.patientId === patientId)
				?.map((p) => ({
					id: p.id,
					timestamp: p.paidAt || p.createdAt,
					type: "transaction",
					title: `Оплата: ${paymentMethodLabels[String(p.method)] ?? p.method}`,
					description: `Сумма ${money(p.amountRub)}`,
					amount: p.amountRub,
					status: paymentStatusLabels[String(p.status)] ?? p.status,
					actionUrl: "#finance",
				}));

			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			const insights: any[] = dashboard?.patientInsights || [];
			const insightEvents: JourneyEvent[] = insights
				.filter((i) => i.patientId === patientId)
				?.map((i) => ({
					id: i.id ?? `insight-${i.patientId}-${i.category}`,
					timestamp: i.createdAt || new Date().toISOString(),
					type: "medical_alert",
					title:
						insightCategoryLabels[String(i.category)] ?? String(i.category),
					description: i.reason,
					status: insightRiskLabels[String(i.riskLevel)] ?? i.riskLevel,
				}));

			const allEvents = [...visitEvents, ...paymentEvents, ...insightEvents];

			return allEvents.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
			);
		}, [
			patientId,
			dashboard?.appointments,
			dashboard?.payments,
			dashboard?.patientInsights,
			staffById,
		]);

		// Real Zeigarnik Effect Progress Calculation
		const {
			totalItemsCount,
			completedItemsCount,
			progressPercentage,
			showProgress,
		} = useMemo(() => {
			const planItems = (dashboard?.treatmentPlanItems ?? []).filter(
				(i) => i?.patientId === patientId,
			);
			const activeItems = (planItems ?? []).filter(
				(i) => i?.status !== "cancelled",
			);
			const completedItems = (activeItems ?? []).filter(
				(i) => i?.status === "completed",
			);

			const total = activeItems.length;
			const completed = completedItems.length;
			const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
			const show = total > 0 && percentage < 100;

			return {
				totalItemsCount: total,
				completedItemsCount: completed,
				progressPercentage: percentage,
				showProgress: show,
			};
		}, [dashboard?.treatmentPlanItems, patientId]);

		const [searchQuery, setSearchQuery] = useState("");

		const QUICK_SEARCH_TAGS = [
			"Пульпит",
			"Кариес",
			"Пломба",
			"Коффердам",
			"Артикаин",
			"Коронка",
			"Удаление",
			"Оплата",
		];

		const filteredEvents = useMemo(() => {
			if (!searchQuery.trim()) return events;
			const q = searchQuery.trim().toLowerCase();
			return events.filter((evt) => {
				const titleMatch = evt.title.toLowerCase().includes(q);
				const descMatch = evt.description.toLowerCase().includes(q);
				const statusMatch = (evt.status ?? "").toLowerCase().includes(q);
				return titleMatch || descMatch || statusMatch;
			});
		}, [events, searchQuery]);

		const renderEventIcon = (type: string) => {
			switch (type) {
				case "medical_alert":
					return <AlertTriangle size={15} className="text-amber-500" />;
				case "appointment":
					return <Calendar size={15} className="text-blue-500" />;
				case "transaction":
					return <DollarSign size={15} className="text-emerald-500" />;
				case "inventory_depletion":
					return <Package size={15} className="text-purple-500" />;
				case "lab_order":
					return <Layers size={15} className="text-teal-500" />;
				default:
					return <CircleDot size={15} className="text-slate-400" />;
			}
		};

		return (
			<div className="patient-journey-timeline space-y-4">
				<div className="timeline-header flex items-center justify-between gap-3 flex-wrap">
					<div className="flex items-center gap-2">
						<h3 className="text-base font-extrabold text-[var(--ink)]">Лента приемов и событий</h3>
						<span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
							{filteredEvents.length} {filteredEvents.length === 1 ? "запись" : "записей"}
						</span>
					</div>
					<span className="patient-id-badge">
						ID: {typeof patientId === "string" ? patientId.slice(0, 8) : ""}
					</span>
				</div>

				{/* ── Мгновенный поиск по ключевым словам (043/у) ── */}
				<div className="timeline-search-bar flex flex-col gap-2 p-3 rounded-2xl bg-[var(--paper-soft)]">
					<div className="relative flex items-center w-full">
						<Search size={16} className="absolute left-3.5 text-[var(--muted)] pointer-events-none" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по дневникам 043/у: «пульпит», «коффердам», «пломба», «артикаин», зуб..."
							className="w-full min-h-[44px] pl-10 pr-9 py-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)] transition-all font-medium"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="absolute right-0 top-0 bottom-0 h-full min-w-[44px] flex items-center justify-center rounded-r-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
								title="Очистить поиск"
							>
								<X size={16} />
							</button>
						)}
					</div>
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-xs font-semibold text-[var(--muted)] mr-1">Быстрый фильтр:</span>
						{QUICK_SEARCH_TAGS.map((tag) => {
							const isActive = searchQuery.toLowerCase() === tag.toLowerCase();
							return (
								<button
									key={tag}
									type="button"
									onClick={() => setSearchQuery(isActive ? "" : tag)}
									className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1 ${
										isActive
											? "bg-[var(--teal)] text-white border-[var(--teal-dark)] shadow-xs"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--paper-strong)]"
									}`}
								>
									{tag}
								</button>
							);
						})}
					</div>
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
							/>
						</div>
						<div className="flex items-center justify-between flex-wrap gap-2 pt-1">
							<p className="progress-hint m-0">
								Пройдено {completedItemsCount} из {totalItemsCount} процедур.
								Следующий визит приблизит вас к здоровой улыбке!
							</p>
							<button
								type="button"
								onClick={() => {
									window.location.hash = "#booking";
								}}
								className="min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--teal)] text-white hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
								data-testid="timeline-fast-book-btn"
							>
								<Calendar size={14} />
								<span>Записаться на следующий этап за 2 тапа</span>
							</button>
						</div>
					</div>
				)}

				{/* Пустое состояние */}
				{filteredEvents.length === 0 ? (
					<div className="timeline-empty p-6 text-center rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5">
						<p className="text-sm font-bold text-[var(--ink)]">
							{searchQuery ? `По запросу «${searchQuery}» ничего не найдено` : "Здесь пока ничего не было"}
						</p>
						<span className="text-xs text-[var(--muted)]">
							{searchQuery
								? "Попробуйте изменить поисковую фразу или сбросить фильтры"
								: "Записи на приём, оплаты и предупреждения по этому пациенту появятся в этой ленте сами."}
						</span>
						{searchQuery && (
							<div className="pt-2">
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-[var(--teal)] text-white hover:opacity-90 transition-colors cursor-pointer"
								>
									Сбросить фильтр
								</button>
							</div>
						)}
					</div>
				) : null}

				<div className="timeline-track">
					{filteredEvents.map((evt, index) => {
						// Эффект Края (Serial Position Effect): выделяем первый и последний элементы
						const isFirst = index === 0;
						const isLast = index === filteredEvents.length - 1;
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
										{renderEventIcon(evt.type)}
									</div>
									{index !== filteredEvents.length - 1 && (
										<div className="marker-line" />
									)}
								</div>

								<div className="timeline-content">
									<div className="content-header">
										<span className="timestamp text-xs font-mono">
											{(() => {
												if (!evt.timestamp) return "";
												const d = new Date(evt.timestamp);
												return !Number.isNaN(d.getTime())
													? d.toLocaleString("ru-RU", {
															day: "2-digit",
															month: "2-digit",
															year: "numeric",
															hour: "2-digit",
															minute: "2-digit",
														})
													: "";
											})()}
										</span>
										{evt.status && (
											<span
												className={`status-badge ${(evt.status ?? "").toLowerCase().replace(" ", "-")}`}
											>
												{highlightMatch(evt.status, searchQuery)}
											</span>
										)}
									</div>
									<h4 className={isHighlight ? "text-lg font-bold" : "text-base"}>
										{highlightMatch(toFriendlyRussianProcedure(evt.title), searchQuery)}
									</h4>
									<p className="text-sm text-[var(--ink)] leading-relaxed">
										{highlightMatch(toFriendlyRussianProcedure(evt.description), searchQuery)}
									</p>
									{evt.amount ? (
										<div className="amount-highlight">+{money(evt.amount)}</div>
									) : null}
									{evt.actionUrl && (
										<button
											type="button"
											className="timeline-action-btn min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold"
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
	});

PatientJourneyTimeline.displayName = "PatientJourneyTimeline";
