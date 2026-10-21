/**
 * TreatmentPlanPresenterStagesTab.tsx — детальный просмотр клинических этапов
 * выбранного варианта плана лечения.
 */

import {
	CalendarPlus,
	CreditCard,
	FlaskConical,
	Package,
	Receipt,
} from "lucide-react";
import type React from "react";
import { showToast } from "../GlobalToast";
import { MissingPriceAlert } from "./MissingPriceAlert";
import { isMicroConsumable } from "./treatmentPlanConsumables";
import type {
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanTierId,
} from "./types";

export interface TreatmentPlanPresenterStagesTabProps {
	readonly selectedTier: TreatmentPlanTier;
	readonly selectedTierId: TreatmentPlanTierId;
	readonly allTiers: readonly TreatmentPlanTier[];
	readonly onSelectTier: (tier: TreatmentPlanTier) => void;
	readonly showMicroConsumables: boolean;
	readonly setShowMicroConsumables?:
		| (
				| React.Dispatch<React.SetStateAction<boolean>>
				| ((fn: (prev: boolean) => boolean) => void)
		  )
		| undefined;
	readonly onUpdateItemPrice: (itemId: string, newPriceRub: number) => void;
	readonly onSendStageToVisit?:
		| ((stage: TreatmentPlanStage) => void)
		| undefined;
	readonly onSendStageToInvoice?:
		| ((stage: TreatmentPlanStage) => void)
		| undefined;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
}

export const TreatmentPlanPresenterStagesTab: React.FC<
	TreatmentPlanPresenterStagesTabProps
> = ({
	selectedTier,
	selectedTierId,
	allTiers,
	onSelectTier,
	showMicroConsumables,
	setShowMicroConsumables,
	onUpdateItemPrice,
	onSendStageToVisit,
	onSendStageToInvoice,
	onPayStage,
	patientId,
	patientName,
}) => {
	const handlePayStage = (stage: TreatmentPlanStage) => {
		const services = (stage.items || []).map((it) => ({
			code804n: it.code804n,
			name: it.name,
			title: it.name,
			priceRub: it.priceRub || it.unitPriceRub || 0,
			unitPriceRub: it.unitPriceRub || it.priceRub || 0,
			quantity: it.quantity || 1,
			toothNumber: it.toothNumber,
			toothCode: it.toothNumber ? String(it.toothNumber) : undefined,
		}));

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-open-stage-payment", {
					detail: {
						stage,
						stageNumber: stage.stageNumber,
						stageTitle: stage.title,
						items: stage.items,
						totalRub: stage.totalRub,
						patientId,
						patientName,
					},
				}),
			);
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						services,
						items: services,
						stageNumber: stage.stageNumber,
						stageTitle: stage.title,
						patientId,
						patientName,
						target: "invoice",
					},
				}),
			);
		}

		if (onPayStage) {
			onPayStage(stage);
		} else {
			onSendStageToInvoice?.(stage);
		}
		showToast(
			`Открыта кассовая оплата этапа ${stage.stageNumber} («${stage.title}») на сумму ${(stage.totalRub || 0).toLocaleString("ru-RU")} ₽`,
			"success",
		);
	};

	const handleSendStage = (
		stage: TreatmentPlanStage,
		target: "visit" | "invoice",
	) => {
		const services = (stage.items || []).map((it) => ({
			code804n: it.code804n,
			name: it.name,
			title: it.name,
			priceRub: it.priceRub || it.unitPriceRub || 0,
			unitPriceRub: it.unitPriceRub || it.priceRub || 0,
			quantity: it.quantity || 1,
			toothNumber: it.toothNumber,
			toothCode: it.toothNumber ? String(it.toothNumber) : undefined,
		}));

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						services,
						items: services,
						stageNumber: stage.stageNumber,
						stageTitle: stage.title,
						patientId,
						patientName,
						target,
					},
				}),
			);
		}

		if (target === "visit") {
			onSendStageToVisit?.(stage);
			showToast(
				`Этап ${stage.stageNumber} («${stage.title}») передан в приём врача`,
				"success",
			);
		} else {
			onSendStageToInvoice?.(stage);
			showToast(
				`Этап ${stage.stageNumber} («${stage.title}») передан в кассовый счёт`,
				"success",
			);
		}
	};
	return (
		<div className="flex flex-col gap-4" data-testid="stages-detailed-view">
			<div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] flex-wrap gap-3">
				<div>
					<h3 className="text-base font-bold text-[var(--tp-text-main)] m-0">
						Развернутая смета клинических этапов лечения
					</h3>
					<p className="text-xs text-[var(--tp-text-muted)] m-0">
						Выбранный вариант: <strong>{selectedTier.title}</strong> · Итого по
						смете:{" "}
						<strong className="text-[var(--tp-primary)]">
							{selectedTier.totalRub.toLocaleString("ru-RU")} ₽
						</strong>
					</p>
				</div>
				{/* Canonical DENTE Segmented Bar for Tier Selection */}
				<div className="inline-flex items-center p-[3px] rounded-[10px] bg-[var(--paper-soft,var(--tp-surface-soft))] border border-[var(--line-subtle,var(--tp-border))] shadow-2xs">
					{allTiers.map((t) => (
						<button
							key={t.tierId}
							type="button"
							onClick={() => onSelectTier(t)}
							className={`h-7 px-3 rounded-[7px] text-[12.5px] cursor-pointer transition-all whitespace-nowrap ${
								selectedTierId === t.tierId
									? "bg-[var(--paper,var(--tp-surface,#ffffff))] text-[var(--teal,var(--tp-primary))] font-semibold shadow-xs"
									: "text-[var(--muted,var(--tp-text-muted))] font-medium hover:text-[var(--ink,var(--tp-text-main))] hover:bg-black/5 dark:hover:bg-white/5"
							}`}
							data-testid={`stages-tab-tier-btn-${t.tierId}`}
						>
							{t.badge}
						</button>
					))}
				</div>
			</div>

			<div className="flex flex-col gap-4">
				{selectedTier.stages.length === 0 ? (
					<div className="p-8 text-center rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] text-xs text-[var(--tp-text-muted)] flex flex-col items-center justify-center gap-2">
						<Package
							size={28}
							className="text-[var(--tp-primary)] opacity-50"
						/>
						<span className="font-bold text-sm text-[var(--tp-text-main)]">
							В смете пока нет клинических этапов
						</span>
						<span>
							Назначьте медицинские процедуры или примените готовые клинические
							пакеты
						</span>
					</div>
				) : (
					selectedTier.stages.map((st) => (
						<div
							key={st.stageNumber}
							className="p-5 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)]"
						>
							<div className="flex items-center justify-between pb-3 border-b border-[var(--tp-border)] mb-3 flex-wrap gap-2">
								<div className="flex items-center gap-3 min-w-0 flex-1">
									<div className="treatment-stage-num-badge shrink-0">
										{st.stageNumber}
									</div>
									<div className="min-w-0 flex-1">
										<h4 className="text-sm font-black text-[var(--tp-text-main)] m-0 truncate">
											{st.title}
										</h4>
										<p className="text-xs text-[var(--tp-text-muted)] m-0 truncate">
											{st.clinicalGoal}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-3 shrink-0">
									<div className="flex items-center gap-1.5">
										<button
											type="button"
											onClick={() => handleSendStage(st, "visit")}
											className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft,var(--tp-surface-soft))] hover:bg-[var(--paper,var(--tp-surface))] border border-[var(--line-subtle,var(--tp-border))] text-[var(--ink,var(--tp-text-main))] inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
											data-testid={`stage-send-to-visit-btn-${st.stageNumber}`}
											title="Перенести услуги этапа в текущий приём врача"
										>
											<CalendarPlus
												size={13}
												className="text-[var(--teal,var(--tp-primary))]"
											/>
											<span>В приём</span>
										</button>
										<button
											type="button"
											onClick={() => handleSendStage(st, "invoice")}
											className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--teal-soft,rgba(20,184,166,0.1))] hover:bg-[var(--teal-soft-strong,rgba(20,184,166,0.2))] border border-[var(--teal,rgba(20,184,166,0.3))] text-[var(--teal-dark,var(--teal))] inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
											data-testid={`stage-send-to-invoice-btn-${st.stageNumber}`}
											title="Перенести услуги этапа в кассовый счёт на оплату"
										>
											<Receipt
												size={13}
												className="text-[var(--teal,var(--tp-primary))]"
											/>
											<span>В счёт</span>
										</button>
										<button
											type="button"
											onClick={() => handlePayStage(st)}
											className="h-8 px-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
											data-testid={`stage-pay-btn-${st.stageNumber}`}
											title="Оплатить этап в кассе (наличные, терминал, СБП)"
										>
											<CreditCard size={13} className="text-white shrink-0" />
											<span>Оплатить этап</span>
										</button>
										<button
											type="button"
											onClick={() => {
												const targetTooth =
													st.items.find((i) => i.toothNumber)?.toothNumber ||
													16;
												if (typeof window !== "undefined") {
													window.dispatchEvent(
														new CustomEvent("dente-open-create-lab-order", {
															detail: {
																patientId,
																patientName,
																toothNumber: String(targetTooth),
																toothFdi: targetTooth,
																workType:
																	st.title || "Ортопедическая конструкция",
																stageNumber: st.stageNumber,
																stageTitle: st.title,
															},
														}),
													);
												}
											}}
											className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-800 dark:text-amber-300 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
											data-testid={`stage-create-lab-order-btn-${st.stageNumber}`}
											title="Создать наряд в зуботехническую лабораторию (ЗТЛ)"
										>
											<FlaskConical
												size={13}
												className="text-amber-600 dark:text-amber-400"
											/>
											<span>Наряд ЗТЛ</span>
										</button>
									</div>
									<div className="text-right">
										<div className="text-sm font-black text-[var(--tp-text-main)] font-mono">
											{(st.totalRub || 0).toLocaleString("ru-RU")} ₽
										</div>
										<div className="text-[11px] text-[var(--tp-text-muted)]">
											{st.estimatedWeeks} нед. · {st.estimatedVisits} визитов
										</div>
									</div>
								</div>
							</div>

							<div className="treatment-stage-table-wrap p-0">
								<table className="treatment-stage-table">
									<thead>
										<tr>
											<th className="w-10">№</th>
											<th className="w-28">Код услуги</th>
											<th className="w-16">Зуб FDI</th>
											<th>Наименование медицинской услуги</th>
											<th className="w-16 text-center">Кол-во</th>
											<th className="w-24 text-right">Цена</th>
											<th className="w-24 text-right">Стоимость</th>
										</tr>
									</thead>
									<tbody>
										{(() => {
											const microConsumables =
												st.items.filter(isMicroConsumable);
											const displayList = showMicroConsumables
												? st.items
												: st.items.filter((it) => !isMicroConsumable(it));
											return (
												<>
													{displayList.length === 0 ? (
														<tr>
															<td
																colSpan={7}
																className="py-6 text-center text-xs text-[var(--tp-text-muted)]"
															>
																В данном этапе пока нет назначенных процедур
															</td>
														</tr>
													) : (
														displayList.map((it, idx) => (
															<tr key={it.id || idx}>
																<td className="text-center font-mono text-[var(--tp-text-muted)]">
																	{idx + 1}
																</td>
																<td>
																	<span className="code-804n-badge">
																		{it.code804n}
																	</span>
																</td>
																<td className="text-center">
																	{it.toothNumber ? (
																		<span className="tooth-fdi-badge">
																			{it.toothNumber}
																		</span>
																	) : (
																		<span className="text-[var(--tp-text-muted)]">
																			—
																		</span>
																	)}
																</td>
																<td>
																	<div className="font-semibold text-[var(--tp-text-main)] break-words min-w-0">
																		{it.name}
																	</div>
																	{it.materials && (
																		<div className="text-[11px] text-teal-700 dark:text-teal-400 mt-0.5">
																			Материал: {it.materials}
																		</div>
																	)}
																	{(it.requiresManualPricing ||
																		it.priceRub === 0) && (
																		<div className="mt-1">
																			<MissingPriceAlert
																				item={it}
																				onUpdatePrice={onUpdateItemPrice}
																				variant="inline"
																			/>
																		</div>
																	)}
																</td>
																<td className="text-center font-semibold">
																	{it.quantity}
																</td>
																<td className="text-right text-[var(--tp-text-muted)] font-mono">
																	{(it.unitPriceRub || 0).toLocaleString(
																		"ru-RU",
																	)}{" "}
																	₽
																</td>
																<td
																	className={`text-right font-bold font-mono ${
																		it.requiresManualPricing ||
																		it.priceRub === 0
																			? "text-amber-600 dark:text-amber-400"
																			: "text-[var(--tp-text-main)]"
																	}`}
																>
																	{(it.priceRub || 0).toLocaleString("ru-RU")} ₽
																</td>
															</tr>
														))
													)}
													{microConsumables.length > 0 && (
														<tr className="bg-[var(--paper-soft)] border-t border-[var(--border)]">
															<td
																colSpan={7}
																className="py-2.5 px-3 text-xs text-[var(--tp-text-muted)]"
															>
																<div className="flex items-center justify-between flex-wrap gap-2">
																	<span className="flex items-center gap-1.5 font-medium">
																		<span>
																			Сопутствующие микро-расходники (
																			{microConsumables.length} поз.: валики,
																			салфетки, перчатки, слюноотсосы) включены
																			в стоимость процедур.
																		</span>
																	</span>
																	<button
																		type="button"
																		onClick={() =>
																			setShowMicroConsumables?.((prev) => !prev)
																		}
																		className="text-[var(--teal)] hover:underline font-bold text-xs cursor-pointer ml-auto"
																	>
																		{showMicroConsumables
																			? "Скрыть микро-расходники"
																			: "Показать список"}
																	</button>
																</div>
															</td>
														</tr>
													)}
												</>
											);
										})()}
									</tbody>
								</table>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
};
