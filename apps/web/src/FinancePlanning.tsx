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

/*
 * ПОДПИСЬ ДЛЯ НЕПОСЧИТАННОГО СЧЁТЧИКА.
 *
 * Дословно то же слово, которым общая money() (AppHelpers.tsx,
 * `moneyUnknownLabel`) печатает неизвестную сумму: в одной плитке стоят сумма и
 * счётчик, и два разных слова про одно и то же состояние читались бы как два
 * разных состояния. Своя константа, а не импорт: AppHelpers — модуль на шесть
 * тысяч строк, который тянет за собой разметку и таблицы стилей, и лист-панели
 * незачем на него завязываться. Расхождение слов не оставлено на честное слово —
 * равенство закреплено проверкой (tests/financeSummaryUnknownIsNotZero.test.tsx).
 */
export const financeSummaryUnknownLabel = "не определено";

type FinancePlanningOverviewProps = {
	activePaymentsCount: number;
	/*
	 * null — «сводка не посчитана», а не «сводка нулевая».
	 *
	 * Источник: useAppLogic.tsx, patientBillingSummary — null, пока нет дашборда
	 * или не выбран пациент. Общая схема (billingSummarySchema) не тронута: её
	 * поля остаются number, неопределённость выражена отсутствием всего объекта.
	 */
	billingSummary: Dashboard["billingSummary"] | null;
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
			{/*
        ДЕНЬГИ ЗДЕСЬ БЕЗ `?? 0`. Все четыре суммы печатались через
        `money(billingSummary?.поле ?? 0)`, то есть неизвестное превращалось в
        ноль ДО форматирования, и общая правка money() до этих плиток не
        доставала. Пока сводки нет, экран уверенно показывал «План лечения 0 ₽,
        Оплачено 0 ₽, Остаток 0 ₽» — то же самое, что «пациент ничего не
        должен».

        ДОЛГ, КОТОРЫЙ ЗДЕСЬ БЫЛ ОПИСАН, ЗАКРЫТ. Прежний текст говорил:
        useAppLogic.tsx при отсутствии дашборда или пациента ВОЗВРАЩАЕТ сводку из
        нулей, поэтому сюда доезжают настоящие нули и правка money() инертна.
        Теперь `patientBillingSummary` в этом случае отдаёт null, и до money()
        доезжает undefined — она печатает «не определено». Общая схема при этом не
        менялась: nonNegativeMoneyRubSchema так и не допускает null
        (packages/shared/src/index.ts), признак неопределённости стоит на самой
        сводке, а не в её полях.

        СЧЁТЧИКИ ТОЖЕ ПЕРЕСТАЛИ ВРАТЬ, И ЭТО НЕ ЗАОДНО. Прежнее объяснение
        оставляло им `?? 0` с доводом «ноль открытых позиций — осмысленное
        „позиций нет“». Довод верен, только пока число приходит из посчитанной
        сводки. Когда сводки нет вовсе, «0 открытых позиций» под суммой «не
        определено» — это два противоположных утверждения в одной плитке.
        Поэтому: сводка есть — печатаем число как есть (ноль остаётся нулём),
        сводки нет — та же подпись «не определено».

        `activePaymentsCount` НЕ ТРОНУТ намеренно: это отдельный пропс со своей
        правдой (список платежей), а не поле неизвестной сводки. Гасить его по
        чужому признаку — значит прятать настоящий счётчик, если сводку когда-то
        передадут null вместе с непустым списком платежей.

        ПОЧЕМУ В СУММАХ СТОИТ `?? null`, И ЭТО НЕ ВОЗВРАТ `?? 0` ДРУГИМИ БУКВАМИ.
        MoneyFormatter в этом файле объявлен `(value: number | null) => string` —
        undefined он не принимает. Пока сводка была не-nullable, `?.` не мог дать
        undefined и запись `money(billingSummary?.totalPaidRub)` компилировалась;
        с признаком «не посчитано» она перестала (tsc: TS2345, четыре плитки).
        Тип формата НАМЕРЕННО не расширен до undefined: пусть каждое место скажет
        словом, что означает «значения нет». `?? null` отдаёт money() ровно то,
        чем она печатает «не определено», а `?? 0` вернул бы «0 ₽» — тот самый
        дефект. Разница именно в этом знаке, и охрана (tests/moneyUnknownNotZero)
        ловит только нулевой вариант.
      */}
			<div
				className="finance-summary-grid bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 mb-4"
				aria-label="Финансовая сводка"
				data-testid="finance-planning"
			>
				<article>
					<span>План лечения</span>
					<strong>{money(billingSummary?.totalPlannedRub ?? null)}</strong>
					<p>
						{billingSummary
							? ruCount(billingSummary.openTreatmentItems, [
									"открытая позиция",
									"открытые позиции",
									"открытых позиций",
								])
							: financeSummaryUnknownLabel}
					</p>
				</article>
				<article>
					<span>Оплачено</span>
					<strong>{money(billingSummary?.totalPaidRub ?? null)}</strong>
					<p>
						{ruCount(activePaymentsCount, ["платеж", "платежа", "платежей"])} по
						текущему пациенту
					</p>
				</article>
				<article
					className={
						(billingSummary?.totalDueRub ?? 0) > 0 ? "finance-due" : ""
					}
				>
					<span>Остаток</span>
					<strong>{money(billingSummary?.totalDueRub ?? null)}</strong>
					<p>
						{billingSummary
							? `${ruCount(billingSummary.unpaidDocuments, ["документ", "документа", "документов"])} без оплаты`
							: financeSummaryUnknownLabel}
					</p>
				</article>
				<article>
					<span>Вычет</span>
					<strong>
						{money(billingSummary?.taxDeductionEligibleRub ?? null)}
					</strong>
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
							{(scenarios ?? []).length}
						</span>
					</div>
					{(scenarios ?? []).length > 0 && (
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
									Показать {(scenarios ?? []).length} варианта{" "}
									<ChevronDown size={16} />
								</>
							)}
						</button>
					)}
				</div>
				{(scenarios ?? []).length ? (
					showScenarios && (
						<div className="plan-scenario-grid">
							{(scenarios ?? []).map((scenario) => (
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
										· {(scenario.includedServiceIds ?? []).length} услуг
									</p>
									<div className="scenario-phase-list">
										{(scenario.phases ?? []).map((phase) => (
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
											<strong>Плюс:</strong> {scenario.pros?.[0] ?? ""}
										</p>
										<p>
											<strong>Компромисс:</strong>{" "}
											{scenario.tradeoffs?.[0] ?? ""}
										</p>
										{scenario.clinicalWarnings?.[0] ? (
											<small>{scenario.clinicalWarnings[0]}</small>
										) : null}
									</div>
								</article>
							))}
						</div>
					)
				) : (
					<article className="finance-empty-state">
						<ClipboardList aria-hidden="true" />
						<p>
							Вариантов плана пока нет. Добавьте услуги в план лечения, чтобы
							пациенту было проще выбрать бюджетный, стандартный или клинический
							сценарий.
						</p>
						<button className="text-button" type="button" onClick={onGoToVisit}>
							Открыть прием
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
	const visibleServices = (services ?? []).slice(0, 6);

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
