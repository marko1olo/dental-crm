import type React from "react";
import { AlertTriangle, Calculator, Lightbulb, Loader2, Plus } from "lucide-react";
import { PanelLoadFailure } from "../PanelLoadFailure";
import {
	type PanelSubject,
	panelStateText,
	requestFailureCause,
} from "../../lib/panelStateText";
import type {
	GhostToothConflict,
	PlanItemCollision,
	ConsumablesReconciliationResult,
} from "./treatmentEstimatorPricing";

export interface TreatmentEstimatorAlertsProps {
	planLoadPhase: "loading" | "ready" | "failed";
	planLoadStatus: number | null;
	planSubject: PanelSubject;
	contractFailure: { status: number | null } | null;
	issueMessages: readonly string[];
	itemsCount: number;
	onRetryPlan: () => void;
	onRetryContract: () => void;
	ghostConflicts?: readonly GhostToothConflict[] | undefined;
	collisions?: readonly PlanItemCollision[] | undefined;
	onReplaceWithImplant?: ((toothNumber: number) => void) | undefined;
	onRestoreToothStatus?: ((toothNumber: number) => void) | undefined;
	onRemoveItemByTooth?: ((toothNumber: number) => void) | undefined;
	consumablesReconciliation?: ConsumablesReconciliationResult | undefined;
	onAddAllUnbilledToPlan?: (() => void) | undefined;
}

export const TreatmentEstimatorAlerts: React.FC<TreatmentEstimatorAlertsProps> = ({
	planLoadPhase,
	planLoadStatus,
	planSubject,
	contractFailure,
	issueMessages,
	itemsCount,
	onRetryPlan,
	onRetryContract,
	ghostConflicts,
	collisions,
	onReplaceWithImplant,
	onRestoreToothStatus,
	onRemoveItemByTooth,
	consumablesReconciliation,
	onAddAllUnbilledToPlan,
}) => {
	return (
		<>
			{/* Отказ чтения сохраненного плана */}
			{planLoadPhase === "failed" && (
				<PanelLoadFailure
					subject={planSubject}
					status={planLoadStatus}
					onRetry={onRetryPlan}
					className="mb-3"
				/>
			)}

			{/* Договор ДМС не прочитан */}
			{contractFailure && (
				<div
					role="alert"
					className="flex flex-wrap items-start gap-x-3 gap-y-2 p-3 mb-3 rounded-lg border text-xs leading-relaxed bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-900"
				>
					<AlertTriangle
						size={14}
						className="mt-0.5 shrink-0"
						aria-hidden="true"
					/>
					<div className="flex-1 min-w-0 break-words">
						<div className="font-semibold">
							Договор ДМС не прочитан:{" "}
							{requestFailureCause(contractFailure.status)}.
						</div>
						<div className="mt-0.5">
							Суммы ниже показаны БЕЗ покрытия ДМС — пациент по договору
							заплатит меньше. Не называйте эти суммы пациенту, пока договор
							не прочитан.
						</div>
					</div>
					<button
						type="button"
						onClick={onRetryContract}
						className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-100 font-semibold cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
					>
						Повторить
					</button>
				</div>
			)}

			{/* Интеллектуальный анализатор дневника приёма (Zero-Leakage Reconciler) */}
			{consumablesReconciliation?.hasUnbilled && (
				<div
					role="status"
					className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 p-3 mb-3 rounded-xl border text-xs leading-relaxed border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 text-[var(--ink)] animate-in fade-in duration-150"
					data-testid="unbilled-consumables-estimator-alert"
				>
					<div className="flex items-center gap-2 min-w-0">
						<Lightbulb
							size={16}
							className="shrink-0 text-amber-600 dark:text-amber-400"
							aria-hidden="true"
						/>
						<div className="min-w-0 leading-snug">
							<span className="font-semibold text-amber-700 dark:text-amber-300">
								В дневнике зафиксировано, но не включено в смету:
							</span>{" "}
							<span>
								{consumablesReconciliation.unbilledItems
									.map((it) => `${it.matchedMarker} (${it.priceRub.toLocaleString("ru-RU")} ₽)`)
									.join(", ")}
							</span>
						</div>
					</div>
					{onAddAllUnbilledToPlan && (
						<button
							type="button"
							onClick={onAddAllUnbilledToPlan}
							className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
							data-testid="add-unbilled-consumables-to-plan-btn"
							title="Добавить выявленные расходники в смету плана в 1 клик"
						>
							<Plus size={14} className="stroke-[2.5]" />
							<span>+ Добавить всё в смету (1 клик)</span>
						</button>
					)}
				</div>
			)}

			{/* Конфликты «зубов-призраков» (удаленные зубы в смете) */}
			{ghostConflicts && ghostConflicts.length > 0 && (
				<div
					role="alert"
					className="flex flex-wrap items-start gap-x-3 gap-y-2 p-3 mb-3 rounded-lg border text-xs leading-relaxed bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-100 dark:border-amber-800"
					data-testid="ghost-teeth-conflicts-alert"
				>
					<AlertTriangle
						size={16}
						className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
						aria-hidden="true"
					/>
					<div className="flex-1 min-w-0 break-words">
						<div className="font-bold text-sm">
							Обнаружены зубы-призраки в плане лечения ({ghostConflicts.length}):
						</div>
						<div className="mt-1 text-slate-700 dark:text-zinc-300">
							В плане лечения присутствуют услуги на зубы, которые отмечены как удаленные на зубной формуле. Доступна автоматическая корректировка:
						</div>
						<div className="mt-2 flex flex-col gap-2">
							{ghostConflicts.map((c) => (
								<div
									key={c.toothNumber}
									className="p-2 rounded-md bg-white/70 dark:bg-zinc-900/70 border border-amber-200 dark:border-amber-900 flex flex-wrap items-center justify-between gap-2"
								>
									<div className="min-w-0">
										<span className="font-bold text-amber-800 dark:text-amber-300">
											Зуб {c.toothNumber}:
										</span>{" "}
										<span>{c.warningBadgeText}</span>
									</div>
									<div className="flex items-center gap-1.5 flex-wrap shrink-0">
										{onReplaceWithImplant && (
											<button
												type="button"
												onClick={() => onReplaceWithImplant(c.toothNumber)}
												className="px-2 py-0.5 text-[11px] font-bold rounded bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer"
											>
												Заменить на имплантацию
											</button>
										)}
										{onRestoreToothStatus && (
											<button
												type="button"
												onClick={() => onRestoreToothStatus(c.toothNumber)}
												className="px-2 py-0.5 text-[11px] font-bold rounded bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
											>
												Восстановить статус на формуле
											</button>
										)}
										{onRemoveItemByTooth && (
											<button
												type="button"
												onClick={() => onRemoveItemByTooth(c.toothNumber)}
												className="px-2 py-0.5 text-[11px] font-bold rounded bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 hover:bg-rose-200 transition-colors cursor-pointer"
											>
												Удалить услугу
											</button>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{/* Коллизии альтернативных сценариев на одном зубе */}
			{collisions && collisions.length > 0 && (
				<div
					role="alert"
					className="flex flex-wrap items-start gap-x-3 gap-y-2 p-3 mb-3 rounded-lg border text-xs leading-relaxed bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-100 dark:border-amber-800"
					data-testid="plan-collisions-alert"
				>
					<AlertTriangle
						size={16}
						className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
						aria-hidden="true"
					/>
					<div className="flex-1 min-w-0 break-words">
						<div className="font-bold">
							Коллизии альтернативных планов лечения ({collisions.length}):
						</div>
						<ul className="mt-1 flex flex-col gap-1">
							{collisions.map((col) => (
								<li key={col.toothNumber}>
									{col.messageRu}
								</li>
							))}
						</ul>
					</div>
				</div>
			)}

			{/* Чего не хватает в прайсе */}
			{issueMessages.length > 0 && (
				<div
					role="alert"
					className="flex flex-wrap items-start gap-x-3 gap-y-2 p-3 mb-3 rounded-lg border text-xs leading-relaxed bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-900"
				>
					<AlertTriangle
						size={14}
						className="mt-0.5 shrink-0"
						aria-hidden="true"
					/>
					<div className="flex-1 min-w-0 break-words">
						<div className="font-semibold">
							Часть лечения посчитать не удалось — цены нет в вашем прайсе.
						</div>
						<ul className="mt-1 flex flex-col gap-1">
							{issueMessages.map((message) => (
								<li key={message}>{message}</li>
							))}
						</ul>
					</div>
				</div>
			)}

			{/* Загрузка */}
			{planLoadPhase === "loading" && itemsCount === 0 && (
				<div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500 dark:text-zinc-400">
					<Loader2 size={16} className="animate-spin" aria-hidden="true" />
					{panelStateText(planSubject, { phase: "loading" }).title}
				</div>
			)}

			{/* Пустой план */}
			{planLoadPhase === "ready" && itemsCount === 0 && (
				<div className="flex flex-col items-center justify-center p-8 mx-2 my-8 rounded-2xl border border-dashed border-zinc-300/50 dark:border-zinc-700/50 bg-zinc-50/30 dark:bg-zinc-900/20 backdrop-blur-sm text-center">
					<div className="p-5 mb-4 rounded-full bg-teal-500/10 dark:bg-teal-500/20 border border-teal-500/20 shadow-sm">
						<Calculator
							size={40}
							className="text-teal-600 dark:text-teal-400 opacity-60"
						/>
					</div>
					<h4 className="text-base font-bold text-slate-800 dark:text-zinc-100 mb-2">
						План лечения пуст
					</h4>
					<p className="text-sm leading-relaxed text-slate-500 dark:text-zinc-400 max-w-[320px]">
						Выберите зуб на схеме слева, укажите патологию, и
						система автоматически сформирует предварительную смету из
						прайс-листа
					</p>
				</div>
			)}
		</>
	);
};
