import type { Dashboard } from "@dental/shared";
import { ChevronDown, ChevronUp, ClipboardList } from "lucide-react";
import { useState } from "react";

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
}: FinancePlanningOverviewProps) {
	const [showScenarios, setShowScenarios] = useState(false);

	return (
		<>
			<div
				className="treatment-progress-container"
				style={{
					marginBottom: "24px",
					padding: "16px",
					background: "var(--paper)",
					borderRadius: "16px",
					boxShadow: "var(--shadow-sm)",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "12px",
						flexWrap: "wrap",
						gap: "8px",
					}}
				>
					<span
						style={{
							fontWeight: 700,
							fontSize: "0.95rem",
							color: "var(--slate-800)",
						}}
					>
						Прогресс лечения
					</span>
					<span
						style={{
							fontWeight: 800,
							fontSize: "1.1rem",
							color: "var(--brand-600)",
						}}
					>
						65%
					</span>
				</div>
				<div
					style={{
						background: "var(--paper-strong)",
						borderRadius: "12px",
						height: "14px",
						overflow: "hidden",
						position: "relative",
						boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)",
					}}
				>
					<div
						style={{
							background:
								"linear-gradient(90deg, var(--brand-400), var(--brand-600))",
							width: "65%",
							height: "100%",
							borderRadius: "12px",
							transition: "width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
						}}
					/>
				</div>
				<p
					style={{
						fontSize: "0.85rem",
						color: "var(--slate-500)",
						marginTop: "10px",
						display: "flex",
						alignItems: "center",
						gap: "6px",
					}}
				>
					<ClipboardList size={14} /> Осталось 3 этапа до завершения плана.
					Отличная динамика!
				</p>
			</div>

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
			</div>

			<section className="plan-scenarios" aria-label="Варианты плана лечения">
				<div
					className="panel-heading"
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<h3>Варианты плана</h3>
						<span className="status-pill status-confirmed">
							{scenarios.length}
						</span>
					</div>
					{scenarios.length > 0 && (
						<button
							type="button"
							className="text-button"
							style={{ display: "flex", alignItems: "center", gap: "4px" }}
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
					<article
						className="finance-empty-state actionable-empty-state"
						style={{
							textAlign: "center",
							padding: "32px 20px",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
						}}
					>
						<ClipboardList
							size={40}
							style={{ color: "var(--muted)", marginBottom: "16px" }}
						/>
						<h4
							style={{
								margin: "0 0 8px 0",
								fontSize: "1.1rem",
								color: "var(--ink)",
							}}
						>
							Смета пуста
						</h4>
						<p
							style={{
								margin: "0 0 20px 0",
								fontSize: "0.95rem",
								color: "var(--muted)",
								maxWidth: "280px",
							}}
						>
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
