/**
 * TreatmentPlanPresenterComparisonTab.tsx — вкладка 3-Tier сравнения вариантов плана лечения
 * («Эконом», «Оптимум», «Премиум») для презентации пациенту у кресла.
 */

import React, { useState } from "react";
import {
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	Layers,
	Package,
	Percent,
	ShieldCheck,
	Sparkles,
	Star,
} from "lucide-react";
import {
	formatWarrantyYearsText,
	type TreatmentPlanStage,
	type TreatmentPlanTier,
	type TreatmentPlanTierId,
} from "./types";
import { isMicroConsumable } from "./treatmentPlanConsumables";
import { MissingPriceAlert } from "./MissingPriceAlert";
import type { ToothData } from "../odontogram/ToothChart";
import { TreatmentPlanPresenterDentalFormula } from "./presenterModules/TreatmentPlanPresenterDentalFormula";
import { TreatmentPlanPresenterStagesAccordion } from "./presenterModules/TreatmentPlanPresenterStagesAccordion";
import { DentalLabOrderDrawer } from "../lab/DentalLabOrderDrawer";
import { useScheduleStore } from "../../store/scheduleStore";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import { showToast } from "../GlobalToast";
import type { QuickBookingSlotInfo } from "../schedule/QuickBookingDrawerTypes";

export interface TreatmentPlanPresenterComparisonTabProps {
	readonly allTiers: readonly TreatmentPlanTier[];
	readonly selectedTierId: TreatmentPlanTierId;
	readonly onSelectTier: (tier: TreatmentPlanTier) => void;
	readonly getTierLetter: (tierId: TreatmentPlanTierId) => string;
	readonly formatRubles: (amount: number | undefined | null) => string;
	readonly expandedStages: Record<number, boolean>;
	readonly onToggleStage: (stageNum: number) => void;
	readonly onToggleAllStages: (expand: boolean) => void;
	readonly showMicroConsumables: boolean;
	readonly setShowMicroConsumables?: (React.Dispatch<React.SetStateAction<boolean>> | ((fn: (prev: boolean) => boolean) => void)) | undefined;
	readonly setActiveTab?: ((tab: "comparison" | "stages" | "finance" | "print" | "aiAudit") => void) | undefined;
	readonly onUpdateItemPrice: (itemId: string, newPriceRub: number) => void;
	readonly onConfirmPatientChoice: (tier?: TreatmentPlanTier) => void;
	readonly isChoiceConfirmed: boolean;
	readonly confirmedTierId: TreatmentPlanTierId | null;
	readonly onApproveAndSign?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly teeth?: readonly ToothData[] | undefined;
	readonly planId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly doctorFullName?: string | undefined;
}

export const TreatmentPlanPresenterComparisonTab: React.FC<TreatmentPlanPresenterComparisonTabProps> = ({
	allTiers,
	selectedTierId,
	onSelectTier,
	getTierLetter,
	formatRubles,
	expandedStages,
	onToggleStage,
	onToggleAllStages,
	showMicroConsumables,
	setShowMicroConsumables,
	setActiveTab,
	onUpdateItemPrice,
	onConfirmPatientChoice,
	isChoiceConfirmed,
	confirmedTierId,
	onApproveAndSign,
	teeth = [],
	planId,
	patientId,
	patientName,
	patientPhone,
	doctorFullName,
}) => {
	const selectedTier = allTiers.find((t) => t.tierId === selectedTierId) || allTiers[0]!;

	const [activeLabOrderStage, setActiveLabOrderStage] = useState<{
		stage: TreatmentPlanStage;
		toothNumber?: number;
	} | null>(null);

	const handleStageBooking = (stage: TreatmentPlanStage, e?: React.MouseEvent) => {
		e?.stopPropagation();
		const stageSlot: QuickBookingSlotInfo = {
			dateKey: new Date().toISOString().slice(0, 10),
			startTime: "10:00",
			patientId: patientId || "pat-1",
			patientName: patientName || "Пациент",
			patientPhone: patientPhone,
			treatmentPlanId: planId || "plan-1",
			stageId: stage.id || `stage_${stage.stageNumber}`,
			stageNumber: stage.stageNumber,
			stageTitle: stage.title,
			estimatedDurationMinutes: stage.estimatedVisits ? stage.estimatedVisits * 45 : 45,
			durationMinutes: 45,
			services: stage.items.map((it) => ({
				code804n: it.code804n,
				name: it.name,
				priceRub: it.priceRub,
				quantity: it.quantity || 1,
			})),
		};

		useScheduleStore.getState().setPendingStageBooking(stageSlot);
		useUiSurfaceStore.getState().openDrawer("quick_booking");
		showToast(`Этап ${stage.stageNumber} передан в расписание для быстрой записи`, "success");
	};

	const handleOpenLabOrder = (stage: TreatmentPlanStage, e?: React.MouseEvent) => {
		e?.stopPropagation();
		const itemWithTooth = stage.items.find((it) => it.toothNumber && it.toothNumber > 0);
		setActiveLabOrderStage({
			stage,
			toothNumber: itemWithTooth?.toothNumber || 16,
		});
	};

	const isStageProsthetic = (stage: TreatmentPlanStage): boolean => {
		return stage.items.some(
			(it) =>
				/коронк|протез|винир|вкладк|циркон|абатмент|ортопед/i.test(it.name) ||
				/A16\.07\.(004|006|035|049)/.test(it.code804n || ""),
		);
	};

	return (
						<div className="flex flex-col gap-6" data-testid="comparison-view">
							{/* Mobile & iPad Segmented Control (Adaptive switcher for <= 1024px screens) */}
							<div className="treatment-mobile-tier-bar" data-testid="mobile-tier-tabs">
								{allTiers.map((t) => {
									const isCurrent = selectedTierId === t.tierId;
									return (
										<button
											key={t.tierId}
											type="button"
											onClick={() => onSelectTier(t)}
											className={"treatment-mobile-tier-btn " + (isCurrent ? "active " : "") + t.tierId}
											data-testid={"mobile-tier-btn-" + t.tierId}
											aria-pressed={isCurrent}
										>
											<div className="flex items-center gap-1.5 font-extrabold text-[13px]">
												{t.tierId === "standard" && <Star size={13} className="text-amber-400 fill-amber-400 shrink-0" />}
												<span>
													{t.tierId === "economy"
														? "Эконом"
														: t.tierId === "standard"
															? "Оптимум"
															: "Премиум"}
												</span>
												{t.tierId === "standard" && <Sparkles size={12} className="text-amber-400 shrink-0" />}
											</div>
											<div className="text-[11px] font-mono opacity-90 font-bold">
												{t.totalRub.toLocaleString("ru-RU")} ₽
											</div>
										</button>
									);
								})}
							</div>

							{/* Chairside Presentation Grid */}
							<div className="treatment-3tier-grid">
								{allTiers.map((tier) => {
									const isSelected = selectedTierId === tier.tierId;
									const isRecommended = allTiers.some((t) => t.isRecommended) ? Boolean(tier.isRecommended) : tier.tierId === "standard";
									const variantLetter = getTierLetter(tier.tierId);

									return (
										<div
											key={tier.tierId}
											onClick={() => onSelectTier(tier)}
											className={"treatment-tier-card " + (isSelected ? "selected " : "") + (isRecommended ? "recommended " : "") + tier.tierId + " cursor-pointer"}
											data-testid={"tier-card-" + tier.tierId}
										>
											{/* Doctor Recommendation Ribbon */}
											{isRecommended && (
												<div className="treatment-doctor-ribbon" data-testid="doctor-recommendation-badge">
													<Sparkles size={13} className="shrink-0" />
													<span>Рекомендация врача</span>
												</div>
											)}

											{/* Card Header */}
											<div className="treatment-tier-header">
												<div className="treatment-tier-badge-row">
													<span className={"treatment-tier-badge " + tier.tierId}>{variantLetter}</span>
													{isSelected && (
														<span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 dark:text-teal-300">
															<CheckCircle2 size={15} />
															<span>Выбран</span>
														</span>
													)}
												</div>
												<h3 className="treatment-tier-name text-[17px] font-extrabold text-[var(--tp-text-main)] break-words leading-snug">
													{tier.title}
												</h3>
												<p className="treatment-tier-desc text-xs text-[var(--tp-text-muted)] line-clamp-2 leading-relaxed">
													{tier.subtitle}
												</p>

												{/* Price Box — Optimized for arm-length reading (15-18px sub-prices, 28px total) */}
												<div className="treatment-tier-price-box">
													<div className="text-[11px] font-extrabold text-[var(--tp-text-muted)] uppercase tracking-wider">
														Итоговая стоимость
													</div>
													<div className="treatment-tier-total-amount">
														<span>{(tier.totalRub || 0).toLocaleString("ru-RU")}</span>
														<span className="treatment-tier-rub-sign">₽</span>
													</div>
													<div className="treatment-tier-finance-chips">
														<div className="treatment-tier-chip-row text-xs sm:text-[13px]">
															<span className="font-semibold text-[var(--tp-text-muted)]">Рассрочка 0% (12 мес):</span>
															<span className="treatment-tier-chip-highlight text-sm sm:text-base font-extrabold font-mono text-[var(--tp-primary)]">
																{(tier.monthlyInstallment12Rub || 0).toLocaleString("ru-RU")} ₽/мес
															</span>
														</div>
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																setActiveTab?.("finance");
															}}
															className="treatment-tier-ndfl-calc-btn cursor-pointer"
															title="Расчет налогового вычета 13% НДФЛ и справка ФНС"
															data-testid={"calc-ndfl-btn-" + tier.tierId}
														>
															<div className="flex items-center justify-between w-full">
																<span className="flex items-center gap-1 font-bold text-xs sm:text-[13px] text-emerald-700 dark:text-emerald-300">
																	<Percent size={13} />
																	<span>Вычет 13% НДФЛ:</span>
																</span>
																<span className="font-black text-sm sm:text-base font-mono text-emerald-700 dark:text-emerald-300">
																	−{(tier.ndflRefundRub || 0).toLocaleString("ru-RU")} ₽
																</span>
															</div>
															<div className="text-[11px] font-medium text-emerald-700/90 dark:text-emerald-300/90 text-left mt-0.5">
																Итого с вычетом: {(tier.priceWithNdflRefundRub || 0).toLocaleString("ru-RU")} ₽ ({tier.ndflDetails.code === "02" ? "Код 02 без лимита" : "Код 01 лимит 150к"})
															</div>
														</button>
													</div>
												</div>
											</div>

											{/* Metrics Strip */}
											<div className="treatment-tier-metrics">
												<div className="treatment-metric-item text-xs sm:text-[12.5px]">
													<Clock size={14} className="shrink-0" />
													<span>Срок:</span>
													<span className="treatment-metric-val font-bold text-[var(--tp-text-main)]">
														{tier.durationWeeks} нед. ({tier.durationVisits} виз.)
													</span>
												</div>
												<div className="treatment-metric-item text-xs sm:text-[12.5px]">
													<ShieldCheck size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
													<span>Гарантия:</span>
													<span className="treatment-metric-val font-bold text-[var(--tp-text-main)]">
														{formatWarrantyYearsText(tier.warrantyYears)}
													</span>
												</div>
											</div>

											{/* Advantages & Materials */}
											<div className="treatment-tier-advantages">
												<div className="text-[11px] font-extrabold text-[var(--tp-text-muted)] uppercase tracking-wider">
													Материалы и технологии:
												</div>
												<div className="text-xs font-bold text-[var(--tp-text-main)] p-2 rounded-lg bg-[var(--tp-surface-soft)] border border-[var(--tp-border)] leading-snug line-clamp-2">
													{tier.materialsHeadline}
												</div>
												<ul className="list-none p-0 m-0 space-y-1.5 mt-1">
													{tier.keyAdvantages.slice(0, 4).map((adv, idx) => (
														<li key={idx} className="treatment-advantage-item">
															<Check size={14} className="treatment-advantage-icon shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
															<span className="text-xs sm:text-[12.5px] leading-snug">{adv}</span>
														</li>
													))}
												</ul>
											</div>

											{/* Stages Mini Breakdown */}
											<div className="treatment-tier-stages-strip">
												<div className="text-[10px] font-extrabold text-[var(--tp-text-muted)] uppercase">
													Смета по этапам лечения:
												</div>
												{tier.stages.map((st) => (
													<div key={st.stageNumber} className="treatment-tier-stage-line">
														<span className="truncate max-w-[170px] text-xs font-medium">
															Этап {st.stageNumber}: {st.title.split(":")[1] || st.title}
														</span>
														<span className="treatment-tier-stage-sum text-xs sm:text-sm font-bold font-mono text-[var(--tp-text-main)]">
															{(st.totalRub || 0).toLocaleString("ru-RU")} ₽
														</span>
													</div>
												))}
											</div>

											{/* Single Prominent Primary Action Button (>= 44px height, 1-click execution) */}
											<div className="p-3.5 pt-0">
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														onSelectTier(tier);
														onConfirmPatientChoice(tier);
													}}
													className={"treatment-tier-select-btn w-full cursor-pointer m-0 " + (isSelected ? "selected" : "")}
													data-testid={"apply-tier-btn-" + tier.tierId}
													aria-pressed={isSelected}
													title="Выбрать этот вариант и утвердить план лечения"
												>
													{isSelected ? (
														<>
															<CheckCircle2 size={16} className="shrink-0" />
															<span>Выбранный вариант — Начать лечение</span>
														</>
													) : (
														<>
															<Check size={16} className="shrink-0" />
															<span>Применить: выбрать этот вариант и начать лечение ({(tier.totalRub || 0).toLocaleString("ru-RU")} ₽)</span>
														</>
													)}
												</button>
											</div>
										</div>
									);
								})}
							</div>

							{/* Interactive Anatomical FDI Dental Formula (11–48) */}
							<TreatmentPlanPresenterDentalFormula
								tier={selectedTier}
								teeth={teeth}
							/>

							{/* Collapsible Stages Accordion for Active Selected Tier */}
							<TreatmentPlanPresenterStagesAccordion
								selectedTier={selectedTier}
								getTierLetter={getTierLetter}
								expandedStages={expandedStages}
								onToggleStage={onToggleStage}
								onToggleAllStages={onToggleAllStages}
								showMicroConsumables={showMicroConsumables}
								setShowMicroConsumables={setShowMicroConsumables}
								onUpdateItemPrice={onUpdateItemPrice}
								handleStageBooking={handleStageBooking}
								handleOpenLabOrder={handleOpenLabOrder}
								isStageProsthetic={isStageProsthetic}
							/>

							{/* 1-Click Dental Lab Order Drawer for Orthopedics/Prosthetics Stages */}
							{activeLabOrderStage && (
								<DentalLabOrderDrawer
									isOpen={true}
									onClose={() => setActiveLabOrderStage(null)}
									editingOrder={null}
									currentPatientName={patientName || "Пациент"}
									currentDoctorName={doctorFullName || "Лечащий врач"}
									currentToothNumber={activeLabOrderStage.toothNumber || 16}
									treatmentPlanId={planId || "PLAN-CURRENT"}
									stageNumber={activeLabOrderStage.stage.stageNumber}
									stageTitle={activeLabOrderStage.stage.title}
									stageId={activeLabOrderStage.stage.id || `stage_${activeLabOrderStage.stage.stageNumber}`}
									onSaveOrder={(order) => {
										setActiveLabOrderStage(null);
										showToast(`Заказ-наряд №${order.orderNumber || "ЗТЛ-1"} успешно создан для ЗТЛ`, "success");
									}}
								/>
							)}
						</div>
	);
};
