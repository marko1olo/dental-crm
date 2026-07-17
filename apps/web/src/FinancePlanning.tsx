import type { Dashboard } from "@dental/shared";
import { ChevronDown, ChevronUp, ClipboardList } from "lucide-react";
import { useState } from "react";
import { useWorkspaceProfile } from "./hooks/useWorkspaceProfile";

type TreatmentPlanScenario = Dashboard["treatmentPlanScenarios"][number];
type ServiceCatalogItem = Dashboard["serviceCatalog"][number];

type MoneyFormatter = (value: number | null) => string;

function ruCount(value: number, forms: [string, string, string]): string {
	const absolute = Math.abs(value);
	const lastTwo = absolute % 100;
	const last = absolute % 10;
	const form =
		lastTwo >= 11 && lastTwo <= 14
			? forms[2]
			: last === 1
				? forms[0]
				: last >= 2 && last <= 4
					? forms[1]
					: forms[2];
	return `${value} ${form}`;
}

type FinancePlanningOverviewProps = {
	activePaymentsCount: number;
	billingSummary: Dashboard["billingSummary"];
	money: MoneyFormatter;
	onGoToVisit: () => void;
	priorityLabels: Record<TreatmentPlanScenario["priority"], string>;
	scenarios: TreatmentPlanScenario[];
	strategyLabels: Record<TreatmentPlanScenario["strategy"], string>;
	treatmentItems: Dashboard["treatmentPlanItems"];
};

type ServiceCatalogStripProps = {
	categoryLabels: Record<ServiceCatalogItem["category"], string>;
	money: MoneyFormatter;
	onGoToPrices: () => void;
	services: ServiceCatalogItem[];
};

export function FinancePlanningOverview({
	activePaymentsCount,
	billingSummary,
	money,
	onGoToVisit,
	priorityLabels,
	scenarios,
	strategyLabels,
	treatmentItems,
}: FinancePlanningOverviewProps) {
	const workspaceFlags = useWorkspaceProfile();
	const [showScenarios, setShowScenarios] = useState(false);

	const activeItems = treatmentItems.filter((i) => i.status !== "cancelled");
	const completedItems = activeItems.filter((i) => i.status === "completed");
	const totalCount = activeItems.length;
	const completedCount = completedItems.length;
	const percent =
		totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
	const remaining = totalCount - completedCount;

	return (
		<>
			{totalCount > 0 && percent < 100 && (
				<div className="treatment-progress-container">
					<div className="treatment-progress-header">
						<span className="treatment-progress-title">Прогресс лечения</span>
						<span className="treatment-progress-percent">{percent}%</span>
					</div>
					<div className="treatment-progress-bar-bg">
						<div
							className="treatment-progress-bar-fill"
							style={{ width: `${percent}%` }}
						/>
					</div>
					<p className="treatment-progress-hint">
						<ClipboardList size={14} /> Осталось {remaining}{" "}
						{ruCount(remaining, ["этап", "этапа", "этапов"])} до завершения
						плана. Отличная динамика!
					</p>
				</div>
			)}

			<div className="finance-summary-grid" aria-label="Финансовая сводка">
				<article>
					<span>План лечения</span>
					<strong>{money(billingSummary.totalPlannedRub)}</strong>
					<p>
						{ruCount(billingSummary.openTreatmentItems, [
							"открытая позиция",
							"открытые позиции",
							"открытых позиций",
						])}
					</p>
				</article>
				<article>
					<span>Оплачено</span>
					<strong>{money(billingSummary.totalPaidRub)}</strong>
					<p>
						{ruCount(activePaymentsCount, ["платеж", "платежа", "платежей"])} по
						текущему пациенту
					</p>
				</article>
				<article
					className={billingSummary.totalDueRub > 0 ? "finance-due" : ""}
				>
					<span>Остаток</span>
					<strong>{money(billingSummary.totalDueRub)}</strong>
					<p>
						{ruCount(billingSummary.unpaidDocuments, [
							"документ",
							"документа",
							"документов",
						])}{" "}
						без оплаты
					</p>
				</article>
				<article>
					<span>Вычет</span>
					<strong>{money(billingSummary.taxDeductionEligibleRub)}</strong>
					<p>медицинские услуги, пригодные для справки</p>
				</article>
				{workspaceFlags.hasInsuranceCoPay &&
					((billingSummary as any).insuranceCoverageRub ?? 0) > 0 && (
						<article className="finance-insurance">
							<span>Покрытие ДМС</span>
							<strong>
								{money((billingSummary as any).insuranceCoverageRub ?? 0)}
							</strong>
							<p>страховая часть по контракту</p>
						</article>
					)}
			</div>

			<section className="plan-scenarios" aria-label="Варианты плана лечения">
				<div className="panel-heading">
					<div className="panel-heading-group">
						<h3>Варианты плана</h3>
						<span className="status-pill status-confirmed">
							{scenarios.length}
						</span>
					</div>
					{scenarios.length > 0 && (
						<button
							type="button"
							className="text-button panel-heading-action"
							onClick={() => setShowScenarios(!showScenarios)}
						>
							{showScenarios ? (
								<>
									Скрыть <ChevronUp size={16} />
								</>
							) : (
								<>
									Показать {scenarios.length} варианта <ChevronDown size={16} />
								</>
							)}
						</button>
					)}
				</div>
				{scenarios.length ? (
					showScenarios && (
						<div className="plan-scenario-grid">
							{scenarios.map((scenario) => (
								<article
									className={`plan-scenario priority-${scenario.priority}`}
									key={scenario.id}
								>
									<div className="scenario-header">
										<span>
											{strategyLabels[scenario.strategy]} ·{" "}
											{priorityLabels[scenario.priority]}
										</span>
										<strong>{money(scenario.totalRub)}</strong>
									</div>
									<h3>{scenario.title}</h3>
									<p>
										{scenario.visitCount} виз. ·{" "}
										{scenario.durationMonths
											? `${scenario.durationMonths} мес.`
											: "сегодня"}{" "}
										· {scenario.includedServiceIds.length} услуг
									</p>
									<div className="scenario-phase-list">
										{scenario.phases.map((phase) => (
											<div key={`${scenario.id}-${phase.title}`}>
												<span>
													{phase.title} · {phase.window}
												</span>
												<strong>{money(phase.amountRub)}</strong>
												<p>{phase.focus}</p>
											</div>
										))}
									</div>
									<div className="scenario-notes">
										<p>
											<strong>Плюс:</strong> {scenario.pros[0]}
										</p>
										<p>
											<strong>Компромисс:</strong> {scenario.tradeoffs[0]}
										</p>
										{scenario.clinicalWarnings[0] ? (
											<small>{scenario.clinicalWarnings[0]}</small>
										) : null}
									</div>
								</article>
							))}
						</div>
					)
				) : (
					<article className="finance-empty-state actionable-empty-state">
						<ClipboardList size={40} className="finance-empty-state-icon" />
						<h4 className="finance-empty-state-title">Смета пуста</h4>
						<p className="finance-empty-state-desc">
							Кликните по зубу слева на формуле, чтобы добавить первую услугу.
						</p>
						<button
							className="primary-button"
							type="button"
							onClick={() =>
								window.dispatchEvent(
									new CustomEvent("START_TOUR", { detail: "treatment_plan" }),
								)
							}
						>
							Запустить тур обучения
						</button>
					</article>
				)}
			</section>
		</>
	);
}

export function ServiceCatalogStrip({
	categoryLabels,
	money,
	onGoToPrices,
	services,
}: ServiceCatalogStripProps) {
	const visibleServices = (services || []).slice(0, 6);

	return (
		<div className="service-catalog-strip" aria-label="Каталог услуг">
			{visibleServices.length ? (
				visibleServices.map((service) => (
					<article key={service.id}>
						<span>{service.code}</span>
						<strong>{service.title}</strong>
						<p>
							{categoryLabels[service.category]} · {money(service.basePriceRub)}{" "}
							· {service.durationMinutes} мин
						</p>
					</article>
				))
			) : (
				<article className="finance-empty-state">
					<ClipboardList aria-hidden="true" />
					<p>
						Каталог услуг пуст. Заполните прайс в настройках, чтобы план лечения
						и оплаты не требовали ручных сумм.
					</p>
					<button className="text-button" type="button" onClick={onGoToPrices}>
						Открыть прайс
					</button>
				</article>
			)}
		</div>
	);
}
