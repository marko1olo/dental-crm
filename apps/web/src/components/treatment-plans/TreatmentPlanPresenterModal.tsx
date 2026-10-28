/**
 * TreatmentPlanPresenterModal.tsx — Канонический 3-уровневый презентер планов лечения (SSOT).
 * Мандаты 8b, 8zi: Золотой стандарт modularity (целевой размер 350–480 строк).
 * Мандат 8e: Автономия врача — свобода скидок до 100% (гарантийные переделки), кнопки никогда не блокируются.
 * Мандат 8am: Ровно 1 Primary CTA кнопка var(--teal) (#0d9488). Вторичные кнопки — нейтральные с рамкой var(--line).
 * Мандат 8n: Простота соло-практики, ноль бюрократии и регуляторного птичьего канцелярита.
 * Apple HIG: Нативный Bottom Sheet на смартфонах, Drag Handle 36x5px, тач-таргеты >= 44px, 0px горизонтального скролла.
 * Финансовый мост: Мгновенная оплата этапа через кассовый чекаут CashRegisterCheckoutModal в целых копейках.
 */

import React, { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
	Printer,
	ShieldCheck,
	ChevronDown,
	ChevronUp,
	CreditCard,
	CheckCircle2,
	FileSignature,
	Percent,
} from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId, TreatmentPlanStage } from "./treatmentPlanTypes";
import { formatRubles, romanizeStageNumber } from "./treatmentPlanTypes";
import { PresenterHeader, type PresenterModalTab } from "./presenterModules/PresenterHeader";
import { DEFAULT_PRESENTER_STAGES } from "./presenterModules/TreatmentPlanPresenterDefaultStages";
import { CashRegisterCheckoutModal } from "../billing/CashRegisterCheckoutModal";
import "./treatmentPlans.css";

export { isMicroConsumable, type PlanItemLike } from "./treatmentPlanConsumables";

export interface TreatmentPlanPresenterModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string;
	readonly patientId?: string;
	readonly patientPhone?: string;
	readonly patientBirthDate?: string | undefined;
	readonly doctorFullName?: string;
	readonly doctorSpecialty?: string;
	readonly clinicName?: string;
	readonly clinicLegalName?: string;
	readonly clinicInn?: string;
	readonly clinicOgrn?: string;
	readonly clinicAddress?: string;
	readonly clinicPhone?: string;
	readonly clinicLicense?: string;
	readonly planId?: string;
	readonly planCreatedAtIso?: string;
	readonly isDemoMode?: boolean;
	readonly tiers?: readonly TreatmentPlanTier[];
	readonly initialSelectedTierId?: TreatmentPlanTierId;
	readonly onApproveAndSign?: (tier: TreatmentPlanTier) => void;
	readonly onConfirmSelection?: (tier: TreatmentPlanTier) => void;
	readonly onPayStage?: (stage: TreatmentPlanStage) => void;
	readonly className?: string;
	readonly teeth?: unknown;
}

export function getTierLetter(tierId: TreatmentPlanTierId): string {
	if (tierId === "economy") return "Вариант А: Эконом";
	if (tierId === "standard" || tierId === "optimum") return "Вариант Б: Оптимум";
	return "Вариант В: Премиум";
}

const DEFAULT_TIERS: readonly TreatmentPlanTier[] = [
	{
		tierId: "economy", title: "Базовый (Эконом)", subtitle: "Эконом-стандарт ОМС: базовая санация и светоотверждаемые пломбы",
		badge: "Базовый", isRecommended: false, totalRub: 14500, totalKopecks: 1450000, warrantyYears: 1,
		keyAdvantages: ["Базовая санация полости рта", "Светоотверждаемые композиты", "Гарантия клиники 1 год"],
		stages: [DEFAULT_PRESENTER_STAGES[0]!],
	},
	{
		tierId: "standard", title: "Оптимальный", subtitle: "Клиническая норма: нанокомпозит, эндодонтия под микроскопом, цирконий",
		badge: "Оптимальный", isRecommended: true, totalRub: 86000, totalKopecks: 8600000, warrantyYears: 3,
		keyAdvantages: ["Лечение каналов под микроскопом", "Высокопрочный нанокомпозит", "Циркониевая коронка CAD/CAM", "Гарантия клиники 3 года"],
		stages: DEFAULT_PRESENTER_STAGES,
	},
	{
		tierId: "optimum", title: "Премиум", subtitle: "Высокая эстетика: керамика E-max, дентальная имплантация Straumann",
		badge: "Премиум", isRecommended: false, totalRub: 148000, totalKopecks: 14800000, warrantyYears: 10,
		keyAdvantages: ["Премиальная имплантация Straumann", "Безметалловая керамика IPS e.max", "Пожизненная гарантия на имплантат", "Персональный куратор лечения"],
		stages: DEFAULT_PRESENTER_STAGES,
	},
];

export const TreatmentPlanPresenterModal: React.FC<TreatmentPlanPresenterModalProps> = ({
	isOpen, onClose, patientName = "Пациент", patientId = "pat-walkin", patientPhone = "",
	doctorFullName = "Лечащий врач", clinicName = "Стоматологическая клиника DENTE",
	tiers: propTiers, initialSelectedTierId = "standard", onApproveAndSign, onConfirmSelection, onPayStage, className = "",
}) => {
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>(initialSelectedTierId);
	const [activeTab, setActiveTab] = useState<PresenterModalTab>("comparison");
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [expandedStageIndex, setExpandedStageIndex] = useState<number | null>(0);
	const [isCopilotOpen, setIsCopilotOpen] = useState(true);
	const [copilotPrompt, setCopilotPrompt] = useState("");
	const [isDiscountOpen, setIsDiscountOpen] = useState(false);
	const [doctorDiscountPercent, setDoctorDiscountPercent] = useState<number>(0);
	const [checkoutStage, setCheckoutStage] = useState<TreatmentPlanStage | null>(null);
	const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

	const effectiveTiers = useMemo(() => {
		const raw = propTiers && propTiers.length > 0 ? propTiers : DEFAULT_TIERS;
		if (doctorDiscountPercent <= 0) return raw;
		const multiplier = Math.max(0, (100 - doctorDiscountPercent) / 100);
		return raw.map((tier) => {
			const discountedRub = Math.round(tier.totalRub * multiplier);
			return {
				...tier,
				totalRub: discountedRub,
				totalKopecks: Number(BigInt(discountedRub) * 100n),
				stages: tier.stages.map((stage) => {
					const sRub = Math.round(stage.totalRub * multiplier);
					return {
						...stage,
						totalRub: sRub,
						totalKopecks: Math.round(sRub * 100),
						items: stage.items.map((it) => ({ ...it, priceRub: Math.round(it.priceRub * multiplier) })),
					};
				}),
			};
		});
	}, [propTiers, doctorDiscountPercent]);

	const activeTier = useMemo(() => {
		return (
			effectiveTiers.find((t) => t.tierId === selectedTierId) ||
			effectiveTiers.find((t) => t.tierId === "standard" || t.tierId === "optimum") ||
			effectiveTiers[0]!
		);
	}, [effectiveTiers, selectedTierId]);

	const handleConfirmChoice = useCallback(() => {
		if (activeTier) {
			if (onConfirmSelection) onConfirmSelection(activeTier);
			if (onApproveAndSign) onApproveAndSign(activeTier);
		}
	}, [activeTier, onConfirmSelection, onApproveAndSign]);

	const handleCopySummary = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			const text = `План лечения DENTE | ${patientName} | Врач: ${doctorFullName}\nТариф: «${activeTier?.title || ""}» — ${formatRubles(activeTier?.totalRub || 0)}`;
			void navigator.clipboard.writeText(text);
		}
	}, [patientName, doctorFullName, activeTier]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className={`treatment-presenter-backdrop fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-x-clip max-w-[100vw] ${
				isFullscreen ? "p-0" : ""
			}`}
			data-testid="treatment-plan-presenter-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="treatment-presenter-modal-title"
		>
			<div
				className={`treatment-presenter-container flex flex-col w-full bg-[var(--paper)] text-[var(--ink)] border-t sm:border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl overflow-hidden transition-all ${
					isFullscreen ? "h-screen w-screen rounded-none border-0" : "max-w-5xl max-h-[94dvh] sm:max-h-[92vh]"
				} ${className}`}
			>
				{/* 1. ШАПКА ПРЕЗЕНТАЦИИ */}
				<PresenterHeader
					patientName={patientName} doctorFullName={doctorFullName} isFullscreen={isFullscreen}
					onToggleFullscreen={() => setIsFullscreen((prev) => !prev)} onClose={onClose}
					onPrint={() => typeof window !== "undefined" && window.print()}
					activeTab={activeTab} onTabChange={setActiveTab} onCopyTiersSummary={handleCopySummary}
					isCopilotOpen={isCopilotOpen} onToggleCopilot={() => setIsCopilotOpen((prev) => !prev)}
					copilotPrompt={copilotPrompt} onCopilotPromptChange={setCopilotPrompt}
					onCopilotSend={() => setCopilotPrompt("")} onSelectCopilotPreset={(p) => setCopilotPrompt(p)}
					onToggleDiscounts={() => setIsDiscountOpen((prev) => !prev)}
				/>

				{/* Панель скидок врача (Мандат 8e: свобода до 100% без пароля начмеда) */}
				{isDiscountOpen && (
					<div className="p-3.5 bg-[var(--paper)] border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-xs">
						<div className="flex items-center gap-2">
							<Percent className="w-4 h-4 text-[var(--teal)]" />
							<span className="font-bold text-[var(--ink)]">Скидка врача (до 100% на гарантийные переделки):</span>
							<div className="flex items-center gap-1">
								{[0, 5, 10, 15, 100].map((pct) => (
									<button
										key={pct}
										type="button"
										onClick={() => setDoctorDiscountPercent(pct)}
										className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
											doctorDiscountPercent === pct
												? "border-[var(--teal)] bg-[var(--teal)] text-[var(--paper-strong,#ffffff)]"
												: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line-subtle)]"
										}`}
									>
										{pct === 100 ? "100% Гарантия" : `${pct}%`}
									</button>
								))}
							</div>
						</div>
						<div className="text-right">
							<span className="text-[var(--muted)] mr-2">Сумма сметы:</span>
							<strong className="text-sm font-black text-[var(--ink)]">{formatRubles(activeTier?.totalRub || 0)}</strong>
						</div>
					</div>
				)}

				{/* 2. ТЕЛО ПРЕЗЕНТАЦИИ */}
				<main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
					{activeTab === "comparison" && (
						<div className="space-y-6">
							{/* Сенсорный Segmented Control на смартфонах (Apple HIG) */}
							<div className="treatment-mobile-tier-bar flex items-center p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-1 md:hidden">
								{(["economy", "standard", "optimum"] as const).map((tId) => (
									<button
										key={tId}
										type="button"
										onClick={() => setSelectedTierId(tId)}
										className={`treatment-mobile-tier-btn flex-1 min-h-[44px] py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
											selectedTierId === tId || (tId === "standard" && selectedTierId === "optimum")
												? "active bg-[var(--paper)] text-[var(--teal)] shadow-xs"
												: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
										data-testid={`mobile-tier-btn-${tId}`}
									>
										{tId === "economy" ? "Эконом" : tId === "standard" ? "Оптимум" : "Премиум"}
									</button>
								))}
							</div>

							{/* 3-Tier Сетка вариантов */}
							<div className="treatment-3tier-grid grid grid-cols-1 md:grid-cols-3 gap-4">
								{effectiveTiers.map((tier) => {
									const isSelected = selectedTierId === tier.tierId;
									const testId = tier.tierId === "economy" ? "tier-card-economy" : tier.tierId === "standard" ? "tier-card-standard" : tier.tierId === "optimum" ? "tier-card-optimum" : `tier-card-${tier.tierId}`;
									const ndflRefund = Math.round((tier.totalRub || 0) * 0.13);
									const totalWithNdfl = (tier.totalRub || 0) - ndflRefund;

									return (
										<div
											key={tier.tierId}
											onClick={() => setSelectedTierId(tier.tierId)}
											className={`relative p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
												isSelected ? "flex" : "hidden md:flex"
											} ${
												isSelected
													? "border-[var(--teal)] bg-[var(--teal)]/5 ring-2 ring-[var(--teal)] shadow-md"
													: "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)]/40 hover:bg-[var(--paper-soft)]"
											}`}
											data-testid={testId}
										>
											<div>
												<div className="flex items-center justify-between gap-2 mb-1.5">
													<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{tier.badge || "Тариф"}</span>
													{(tier.isRecommended || tier.tierId === "standard" || tier.tierId === "optimum") && (
														<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--teal)] text-[var(--paper-strong,#ffffff)]">
															Рекомендация врача
														</span>
													)}
												</div>
												<h3 className="text-xl font-black text-[var(--ink)] m-0">{tier.title}</h3>
												<p className="text-xs text-[var(--muted)] m-0 mt-1 leading-relaxed">{tier.subtitle}</p>
											</div>

											<div className="space-y-1.5 pt-3 border-t border-[var(--line)]/60 text-xs">
												{tier.keyAdvantages?.map((adv, idx) => (
													<div key={idx} className="flex items-center gap-2 text-[var(--ink)]">
														<ShieldCheck className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
														<span>{adv}</span>
													</div>
												))}
											</div>

											{/* Расчет 13% НДФЛ */}
											<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]/50 text-xs space-y-1">
												<div className="flex items-center justify-between">
													<span className="text-[var(--muted)]">Вычет 13% НДФЛ:</span>
													<strong className="text-emerald-600 dark:text-emerald-400 font-bold">+{formatRubles(ndflRefund)}</strong>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-[var(--muted)]">Итого с вычетом:</span>
													<strong className="text-[var(--ink)] font-black">{formatRubles(totalWithNdfl)}</strong>
												</div>
												<button
													type="button"
													onClick={(e) => { e.stopPropagation(); setSelectedTierId(tier.tierId); }}
													className="secondary-button dente-btn dente-btn-secondary w-full mt-1.5 py-1 text-[11px] font-bold rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
													data-testid={`calc-ndfl-btn-${tier.tierId}`}
												>
													Рассчитать вычет
												</button>
											</div>

											<div className="pt-3 border-t border-[var(--line)] flex items-end justify-between gap-2">
												<div>
													<span className="text-[10px] uppercase font-bold text-[var(--muted)] block">Стоимость под ключ</span>
													<span className="text-2xl font-black text-[var(--ink)]">{formatRubles(tier.totalRub)}</span>
												</div>
												<button
													type="button"
													onClick={(e) => { e.stopPropagation(); setSelectedTierId(tier.tierId); }}
													className="secondary-button dente-btn dente-btn-secondary min-h-[36px] px-3.5 py-1.5 text-xs font-bold rounded-xl border border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)] hover:bg-[var(--teal)] hover:text-[var(--paper-strong,#ffffff)] cursor-pointer"
													data-testid={`apply-tier-btn-${tier.tierId}`}
												>
													Применить
												</button>
											</div>
										</div>
									);
								})}
							</div>

							{/* Зубная формула и клинические этапы */}
							<div className="space-y-4 pt-2">
								<div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)]" data-testid="treatment-plan-fdi-formula">
									<span className="font-semibold text-[var(--ink)]">Зубная формула плана:</span>
									<span>FDI 11–48 (комплексный клинический протокол СтАР)</span>
								</div>

								<div className="space-y-3" data-testid="stages-accordion-section">
									<div className="flex items-center justify-between pb-1 flex-wrap gap-2">
										<h3 className="text-sm font-bold text-[var(--ink)] m-0">Клинические этапы плана</h3>
										<span className="text-xs text-[var(--muted)]">Выбранный вариант: <strong className="text-[var(--ink)]">{activeTier?.title || "План"}</strong></span>
									</div>

									{(activeTier?.stages && activeTier.stages.length > 0 ? activeTier.stages : DEFAULT_PRESENTER_STAGES).map((stage, idx) => {
										const isExpanded = expandedStageIndex === idx;
										const stageNumber = stage.stageNumber || idx + 1;

										return (
											<div key={stage.id || idx} className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-2xs">
												<div
													onClick={() => setExpandedStageIndex((prev) => (prev === idx ? null : idx))}
													className="flex items-center justify-between p-3.5 bg-[var(--paper-soft)] cursor-pointer select-none gap-2 flex-wrap sm:flex-nowrap"
												>
													<div className="flex items-center gap-3 min-w-0">
														<div className="w-7 h-7 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] font-black text-xs flex items-center justify-center shrink-0">
															{romanizeStageNumber(stageNumber)}
														</div>
														<div className="min-w-0">
															<h4 className="text-sm font-bold text-[var(--ink)] m-0 truncate">Этап {stageNumber}: {stage.title}</h4>
															<p className="text-xs text-[var(--muted)] m-0 truncate">{stage.clinicalGoal}</p>
														</div>
													</div>

													<div className="flex items-center gap-3 shrink-0">
														<span className="text-sm font-black text-[var(--ink)]">{formatRubles(stage.totalRub)}</span>
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																setCheckoutStage(stage as TreatmentPlanStage);
																setIsCheckoutOpen(true);
																if (onPayStage) onPayStage(stage as TreatmentPlanStage);
															}}
															className="secondary-button dente-btn dente-btn-secondary h-8 px-3 rounded-xl text-xs font-semibold text-[var(--teal)] bg-[var(--teal)]/10 hover:bg-[var(--teal)]/20 border border-[var(--teal)]/30 inline-flex items-center gap-1.5 cursor-pointer"
															data-testid={`presenter-pay-stage-btn-${stage.id || idx}`}
															title={`Оплатить этап №${stageNumber} через кассовый чекаут`}
														>
															<CreditCard size={13} className="shrink-0" />
															<span>Оплатить этап</span>
														</button>
														{isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--muted)]" />}
													</div>
												</div>

												{isExpanded && (
													<div className="p-3.5 divide-y divide-[var(--line)]/40 text-xs">
														{stage.items?.map((item) => (
															<div key={item.id} className="py-2 flex items-center justify-between gap-3">
																<div className="flex items-center gap-2">
																	{item.toothNumber && (
																		<span className="px-2 py-0.5 rounded bg-[var(--line-subtle)] text-[var(--ink)] font-bold">Зуб {item.toothNumber}</span>
																	)}
																	<span className="code-804n-badge px-2 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] font-mono text-[10px]">
																		{item.code804n || item.serviceCode || "A16.07"}
																	</span>
																	<span className="text-[var(--ink)] font-medium">{item.name}</span>
																</div>
																<span className="font-bold text-[var(--ink)] whitespace-nowrap">{formatRubles(item.priceRub || item.unitPriceRub || 0)}</span>
															</div>
														))}
													</div>
												)}
											</div>
										);
									})}
								</div>
							</div>
						</div>
					)}

					{activeTab === "print" && (
						<div className="space-y-4 p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)]">
							<h3 className="text-base font-bold text-[var(--ink)] m-0">Сводный расчет для договора</h3>
							<p className="text-xs text-[var(--muted)] m-0">Пациент: <strong>{patientName}</strong> · Врач: <strong>{doctorFullName}</strong></p>
							<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-2">
								<div className="flex justify-between font-bold text-sm">
									<span>Выбранный тариф: «{activeTier?.title}»</span>
									<span>{formatRubles(activeTier?.totalRub || 0)}</span>
								</div>
								<div className="text-xs text-[var(--muted)]">
									Гарантийный срок: {activeTier?.warrantyYears} лет. Все манипуляции зафиксированы в медицинской карте приёма.
								</div>
							</div>
						</div>
					)}
				</main>

				{/* 3. ПОДВАЛ ПРЕЗЕНТАЦИИ (РОТ С ДИЗАЙН-КОДОМ: РОВНО 1 PRIMARY CTA) */}
				<footer className="flex items-center justify-between flex-wrap gap-4 px-4 sm:px-6 py-3.5 bg-[var(--paper-soft)] border-t border-[var(--line)] shrink-0">
					<div>
						<span className="text-xs text-[var(--muted)] block">Выбранный вариант:</span>
						<span className="text-lg font-black text-[var(--ink)]">«{activeTier?.title || "План"}» — {formatRubles(activeTier?.totalRub || 0)}</span>
					</div>

					<div className="flex items-center gap-2 w-full sm:w-auto">
						<button
							type="button"
							onClick={() => typeof window !== "undefined" && window.print()}
							className="secondary-button dente-btn dente-btn-secondary min-h-[44px] flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center justify-center gap-1.5 cursor-pointer"
							data-testid="print-contract-btn"
						>
							<Printer className="w-4 h-4 text-[var(--muted)] shrink-0" />
							<span className="hidden sm:inline">Печать сметы плана</span>
							<span className="sm:hidden">Печать</span>
						</button>

						{onApproveAndSign && (
							<button
								type="button"
								onClick={() => activeTier && onApproveAndSign(activeTier)}
								className="secondary-button dente-btn dente-btn-secondary min-h-[44px] flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center justify-center gap-1.5 cursor-pointer"
								data-testid="approve-and-sign-btn"
							>
								<FileSignature className="w-4 h-4 text-[var(--muted)] shrink-0" />
								<span className="hidden sm:inline">Подписать план лечения</span>
								<span className="sm:hidden">Подписать</span>
							</button>
						)}

						{/* ЕДИНСТВЕННЫЙ PRIMARY CTA КНОПКА (Мандат 8am: #0d9488) */}
						<button
							type="button"
							onClick={handleConfirmChoice}
							className="primary-button min-h-[44px] flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer text-white"
							data-testid="confirm-patient-choice-btn"
						>
							<CheckCircle2 className="w-4 h-4 shrink-0" />
							<span className="hidden sm:inline">{`Пациент выбрал ${getTierLetter(selectedTierId)}`}</span>
							<span className="sm:hidden">Выбрать</span>
						</button>
					</div>
				</footer>
			</div>

			{/* Кассовый чекаут */}
			{isCheckoutOpen && (
				<CashRegisterCheckoutModal
					isOpen={isCheckoutOpen}
					onClose={() => { setIsCheckoutOpen(false); setCheckoutStage(null); }}
					patientId={patientId} patientName={patientName} patientPhone={patientPhone}
					amountRub={checkoutStage?.totalRub || activeTier?.totalRub || 0}
					amountKopecks={Math.round((checkoutStage?.totalRub || activeTier?.totalRub || 0) * 100)}
					doctorFullName={doctorFullName}
					title={`Оплата этапа ${checkoutStage?.stageNumber || 1}: ${checkoutStage?.title || "План лечения"}`}
					onPaymentComplete={() => { setIsCheckoutOpen(false); setCheckoutStage(null); }}
				/>
			)}
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default TreatmentPlanPresenterModal;
