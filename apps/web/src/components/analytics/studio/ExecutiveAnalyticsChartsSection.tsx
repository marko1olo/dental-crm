/**
 * apps/web/src/components/analytics/studio/ExecutiveAnalyticsChartsSection.tsx
 *
 * Секции аналитики: Структура оплат (Касса), Услуги по направлениям, Рейтинг врачей и Когорты Recall
 * (Мандат 8e: Автономия врача, Мандат 8n: Малая клиника, честные расчеты).
 */

import React from "react";
import {
	Activity,
	CheckCircle2,
	CreditCard,
	MessageCircle,
	QrCode,
	Sparkles,
	Users,
	Wallet,
} from "lucide-react";
import type { ClinicAnalyticsSSOT } from "../analyticsCatalogData";

export interface ExecutiveAnalyticsChartsSectionProps {
	readonly data: ClinicAnalyticsSSOT;
	readonly activeWhatsappCohort: string | null;
	readonly onCopyWhatsapp: (template: string, cohortKey: string) => void;
}

export const ExecutiveAnalyticsChartsSection: React.FC<ExecutiveAnalyticsChartsSectionProps> = ({
	data,
	activeWhatsappCohort,
	onCopyWhatsapp,
}) => {
	return (
		<div className="space-y-4">
			{/* 2 Секции: Способы оплаты кассы & Рейтинг врачей */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{/* Секция 1: Структура оплат кассы */}
				<div className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
					<div className="flex items-center justify-between">
						<h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
							<Wallet className="w-3.5 h-3.5 text-[var(--teal)]" />
							Структура оплат (Касса)
						</h2>
						<span className="text-xs font-medium text-[var(--muted)]">
							Итого: {data.revenueFormatted}
						</span>
					</div>

					<div className="space-y-2">
						{data.paymentBreakdown.methods.map((m) => (
							<div
								key={m.id}
								className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper-soft)] text-xs border border-[var(--line)]/50"
							>
								<div className="flex items-center gap-2 min-w-0">
									{m.id === "cash" && <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
									{m.id === "card" && <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
									{m.id === "sbp" && <QrCode className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
									{m.id === "deposit" && <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
									<span className="font-medium text-[var(--ink)] truncate">{m.label}</span>
								</div>
								<div className="flex items-center gap-2.5 shrink-0">
									<span className="font-semibold text-[var(--ink)]">{m.formatted}</span>
									<span className="w-10 text-right text-[11px] font-bold text-[var(--muted)]">
										{m.percent}%
									</span>
								</div>
							</div>
						))}
					</div>

					{/* Направления услуг */}
					<div className="pt-2 border-t border-[var(--line)] space-y-1.5">
						<span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] block">
							Услуги по направлениям
						</span>
						<div className="grid grid-cols-2 gap-1.5 text-xs">
							{data.serviceStructure.map((s) => (
								<div
									key={s.category}
									className="p-1.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/40 flex flex-col justify-between"
								>
									<span className="text-[11px] text-[var(--muted)] truncate">{s.category}</span>
									<span className="font-semibold text-[var(--ink)] mt-0.5">{s.formattedRevenue}</span>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Секция 2: Рейтинг врачей и продуктивность кресел */}
				<div className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
					<div className="flex items-center justify-between">
						<h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
							<Users className="w-3.5 h-3.5 text-[var(--teal)]" />
							Рейтинг врачей ({data.doctors.length})
						</h2>
						<span className="text-xs font-medium text-[var(--muted)]">
							Часы и повторная запись
						</span>
					</div>

					<div className="space-y-2">
						{data.doctors.map((doc, idx) => (
							<div
								key={doc.id}
								className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]/60 flex flex-col gap-1.5 text-xs"
							>
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2 min-w-0">
										<span className="w-5 h-5 rounded-full bg-[var(--teal)]/15 text-[var(--teal)] font-bold text-[11px] flex items-center justify-center shrink-0">
											{idx + 1}
										</span>
										<span className="font-semibold text-[var(--ink)] truncate">{doc.name}</span>
									</div>
									<span className="font-bold text-[var(--teal)] shrink-0">
										{doc.revenueFormatted}
									</span>
								</div>
								<div className="flex items-center justify-between text-[11px] text-[var(--muted)] pl-7">
									<span>{doc.specialty}</span>
									<div className="flex items-center gap-3">
										<span>{doc.visitsCount} визитов ({doc.chairHours}ч)</span>
										<span className="font-medium text-emerald-600 dark:text-emerald-400">
											Recall {doc.rebookingPercent}%
										</span>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* 3 Секция: Когорты удержания пациентов Recall (3/6/12 мес) и 1-клик WhatsApp */}
			<div className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
						<Activity className="w-3.5 h-3.5 text-[var(--teal)]" />
						Удержание пациентов по когортам визитов (Recall ≥ 70%)
					</h2>
					<span className="text-xs text-[var(--muted)] hidden sm:inline">
						1-клик генерация сообщения WhatsApp
					</span>
				</div>

				{data.recallCohorts.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
						{data.recallCohorts.map((cohort) => {
							const isCopied = activeWhatsappCohort === cohort.cohortKey;
							return (
								<div
									key={cohort.cohortKey}
									className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col justify-between gap-2 text-xs"
								>
									<div>
										<div className="flex items-center justify-between mb-1">
											<span className="font-semibold text-[var(--ink)]">
												{cohort.cohortLabel}
											</span>
											<span
												className={
													cohort.recallRatePercent >= 70
														? "studio-badge-norm-optimal"
														: "studio-badge-norm-reserve"
												}
											>
												{cohort.recallRatePercent}% явка
											</span>
										</div>
										<div className="text-[11px] text-[var(--muted)]">
											Пациентов к возврату:{" "}
											<span className="font-bold text-[var(--ink)]">
												{cohort.patientsCount} чел.
											</span>
										</div>
										<div className="text-[11px] text-[var(--ink)] mt-1 font-medium truncate">
											{cohort.recommendedService}
										</div>
									</div>

									<button
										type="button"
										onClick={() =>
											onCopyWhatsapp(cohort.messageTemplate, cohort.cohortKey)
										}
										className="secondary-button h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)] text-[11px] font-medium transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
										title="Скопировать шаблон приглашения в WhatsApp"
									>
										{isCopied ? (
											<>
												<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
												<span>Скопировано в буфер!</span>
											</>
										) : (
											<>
												<MessageCircle className="w-3.5 h-3.5 text-[var(--teal)]" />
												<span>Шаблон WhatsApp</span>
											</>
										)}
									</button>
								</div>
							);
						})}
					</div>
				) : (
					<div className="p-3.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]/50 text-center">
						<p className="text-xs text-[var(--muted)]">
							Все пациенты текущего периода охвачены контрольными визитами либо когорты сформируются при накоплении данных.
						</p>
					</div>
				)}
			</div>
		</div>
	);
};
