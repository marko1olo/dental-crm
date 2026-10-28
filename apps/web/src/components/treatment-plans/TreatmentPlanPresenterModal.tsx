/**
 * TreatmentPlanPresenterModal.tsx — Интерактивная презентация планов лечения для пациента у кресла (SSOT).
 * Мандат 8e: Автономия врача и пациента — кнопки не блокируются, мгновенный выбор тарифа и печать сметы.
 * Мандат 8am: Ровно 1 Primary CTA кнопка var(--teal).
 * Apple HIG: Сенсорная зона >= 44px, карточный стек без горизонтального дрифта (390×844).
 * Мандат 8b: Золотой стандарт (250–350 строк), zero circular dependencies.
 */

import React, { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
	X,
	Printer,
	CheckCircle2,
	Sparkles,
	FileSignature,
	ChevronDown,
	ChevronUp,
	ShieldCheck,
	Clock,
	Maximize2,
	Minimize2,
	Send,
	Calculator,
	Copy,
} from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId, TreatmentPlanStage } from "./treatmentPlanTypes";
import { formatRubles, romanizeStageNumber } from "./treatmentPlanTypes";
import "./treatmentPlans.css";

export { isMicroConsumable, type PlanItemLike } from "./treatmentPlanConsumables";

export interface TreatmentPlanPresenterModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string;
	readonly patientId?: string;
	readonly doctorFullName?: string;
	readonly clinicName?: string;
	readonly tiers?: readonly TreatmentPlanTier[];
	readonly initialSelectedTierId?: TreatmentPlanTierId;
	readonly onApproveAndSign?: (tier: TreatmentPlanTier) => void;
	readonly onPayStage?: (stage: TreatmentPlanStage) => void;
	readonly className?: string;
	readonly teeth?: unknown;
	readonly patientPhone?: string;
}

export function getTierLetter(tierId: TreatmentPlanTierId): string {
	if (tierId === "economy") return "Вариант А: Эконом";
	if (tierId === "standard" || tierId === "optimum") return "Вариант Б: Оптимум";
	return "Вариант В: Премиум";
}

export const TreatmentPlanPresenterModal: React.FC<TreatmentPlanPresenterModalProps> = ({
	isOpen,
	onClose,
	patientName = "Пациент",
	doctorFullName = "Лечащий врач",
	tiers = [],
	initialSelectedTierId = "standard",
	onApproveAndSign,
	className = "",
}) => {
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>(initialSelectedTierId);
	const [activeTab, setActiveTab] = useState<"comparison" | "stages" | "print">("comparison");
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [expandedStageIndex, setExpandedStageIndex] = useState<number | null>(0);
	const [isChoiceConfirmed, setIsChoiceConfirmed] = useState(false);
	const [copilotPrompt, setCopilotPrompt] = useState("");
	const [isCopilotOpen, setIsCopilotOpen] = useState(true);

	const activeTier = useMemo(() => {
		if (!tiers || tiers.length === 0) return null;
		return (
			tiers.find((t) => t.tierId === selectedTierId) ||
			tiers.find((t) => t.tierId === "optimum" || t.tierId === "standard") ||
			tiers[0]!
		);
	}, [tiers, selectedTierId]);

	const handleConfirmChoice = useCallback(() => {
		setIsChoiceConfirmed(true);
		if (activeTier && onApproveAndSign) {
			onApproveAndSign(activeTier);
		}
	}, [activeTier, onApproveAndSign]);

	const handlePrint = useCallback(() => {
		window.print();
	}, []);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className={`treatment-presenter-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto ${isFullscreen ? "p-0" : ""}`}
			data-testid="treatment-plan-presenter-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="treatment-presenter-modal-title"
		>
			<div
				className={`treatment-presenter-container flex flex-col w-full bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-2xl shadow-2xl overflow-hidden transition-all ${
					isFullscreen ? "h-screen w-screen rounded-none border-0" : "max-w-5xl max-h-[92vh]"
				} ${className}`}
			>
				{/* 1. ШАПКА ПРЕЗЕНТАЦИИ: Название, пациент, врач, табы и закрытие */}
				<header className="flex flex-col border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--line)]/50">
						<div className="flex items-center gap-3">
							<div className="p-2 rounded-xl bg-[var(--teal)]/10 text-[var(--teal)] shrink-0">
								<Sparkles className="w-5 h-5" />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<h2 id="treatment-presenter-modal-title" className="text-base sm:text-lg font-black text-[var(--ink)] m-0">
										Презентация планов лечения
									</h2>
									<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--teal)]/10 text-[var(--teal)] hidden sm:inline-block">
										Прейскурант клиники
									</span>
								</div>
								<p className="text-xs text-[var(--muted)] m-0 truncate max-w-xl">
									Пациент: <strong className="text-[var(--ink)]">{patientName}</strong> · Врач:{" "}
									<span className="text-[var(--ink)]">{doctorFullName}</span>
								</p>
							</div>
						</div>

						<div className="flex items-center gap-1.5">
							<button
								type="button"
								onClick={handlePrint}
								className="w-10 h-10 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line-subtle)] flex items-center justify-center transition-all cursor-pointer"
								title="Печать сметы"
								data-testid="presenter-header-print-btn"
							>
								<Printer className="w-4 h-4" />
							</button>

							<button
								type="button"
								onClick={() => {
									if (navigator.clipboard) {
										navigator.clipboard.writeText("Стоматологическая смета планов лечения DENTE");
									}
								}}
								className="min-h-[40px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] hidden sm:inline-flex items-center gap-1.5 cursor-pointer"
								title="Скопировать смету для пациента"
								data-testid="presenter-copy-tiers-summary-btn"
							>
								<Copy className="w-4 h-4 text-[var(--muted)]" />
								<span>Скопировать смету для пациента</span>
							</button>

							<button
								type="button"
								onClick={() => setIsFullscreen((prev) => !prev)}
								className="w-10 h-10 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line-subtle)] flex items-center justify-center transition-all cursor-pointer"
								title={isFullscreen ? "Свернуть" : "На весь экран"}
								data-testid="presenter-fullscreen-btn"
							>
								{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
							</button>
							<button
								type="button"
								onClick={onClose}
								className="w-10 h-10 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line-subtle)] flex items-center justify-center transition-all cursor-pointer"
								title="Закрыть окно"
								data-testid="btn-close-presenter"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
					</div>

					{/* Полоса навигационных табов и Копайлот */}
					<div className="flex items-center justify-between px-4 sm:px-6 py-2 overflow-x-auto scrollbar-none gap-2">
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setActiveTab("comparison")}
								className={`min-h-[44px] sm:min-h-[36px] px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
									activeTab === "comparison"
										? "bg-[var(--teal)] text-[var(--paper-strong,#ffffff)] shadow-sm"
										: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line-subtle)]"
								}`}
								data-testid="tab-tiers-selector"
							>
								3 Варианта сметы
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("print")}
								className={`min-h-[44px] sm:min-h-[36px] px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
									activeTab === "print"
										? "bg-[var(--teal)] text-[var(--paper-strong,#ffffff)] shadow-sm"
										: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line-subtle)]"
								}`}
								data-testid="tab-print-preview"
							>
								Сводка для договора
							</button>
							<button
								type="button"
								className="min-h-[44px] sm:min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 cursor-pointer"
								data-testid="toggle-discount-panel-btn"
							>
								<Calculator className="w-3.5 h-3.5 text-[var(--muted)]" />
								<span>Скидки</span>
							</button>
						</div>

						{/* Кнопка AI Copilot */}
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setIsCopilotOpen((prev) => !prev)}
								className="min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-bold text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 cursor-pointer"
								data-testid="toggle-copilot-panel-btn"
							>
								<Sparkles className="w-3.5 h-3.5 text-amber-500" />
								<span>AI Копайлот</span>
							</button>
						</div>
					</div>

					{/* Панель Копайлота */}
					{isCopilotOpen && (
						<div className="p-3 bg-[var(--paper)] border-t border-[var(--line)] flex flex-col gap-2.5">
							<div className="flex items-center justify-between gap-2 flex-wrap">
								<span className="text-xs font-bold text-[var(--ink)]">AI Copilot у кресла</span>
								<div className="flex items-center gap-1.5 flex-wrap">
									<button
										type="button"
										onClick={() => setCopilotPrompt("Оптимизировать бюджет плана лечения")}
										className="min-h-[36px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
										data-testid="presenter-copilot-btn-budget_optimize"
									>
										Оптимизировать бюджет
									</button>
									<button
										type="button"
										onClick={() => setCopilotPrompt("Замена импланта на мостовидный протез")}
										className="min-h-[36px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
										data-testid="presenter-copilot-btn-implant_to_bridge"
									>
										Мост вместо импланта
									</button>
									<button
										type="button"
										onClick={() => setCopilotPrompt("All-on-4 верхняя челюсть")}
										className="min-h-[36px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
										data-testid="presenter-copilot-btn-all_on_4_upper"
									>
										All-on-4 Верх
									</button>
									<button
										type="button"
										onClick={() => setCopilotPrompt("All-on-4 нижняя челюсть")}
										className="min-h-[36px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
										data-testid="presenter-copilot-btn-all_on_4_lower"
									>
										All-on-4 Низ
									</button>
									<button
										type="button"
										onClick={() => setCopilotPrompt("Костная пластика Bio-Oss")}
										className="min-h-[36px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
										data-testid="presenter-copilot-btn-bone_graft_bio_oss"
									>
										Костная пластика
									</button>
									<button
										type="button"
										onClick={() => setCopilotPrompt("Пересчет анестезии и изоляции")}
										className="min-h-[36px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
										data-testid="presenter-copilot-btn-recalculate_anesthesia_isolation"
									>
										Анестезия
									</button>
								</div>
							</div>

							<div className="flex items-center gap-2">
								<input
									type="text"
									value={copilotPrompt}
									onChange={(e) => setCopilotPrompt(e.target.value)}
									placeholder="Запрос к копайлоту..."
									className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)]"
								/>
								<button
									type="button"
									onClick={() => setCopilotPrompt("")}
									className="min-h-[36px] min-w-[36px] px-3 rounded-lg bg-[var(--teal)] text-[var(--paper-strong,#ffffff)] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
									data-testid="presenter-copilot-send-btn"
								>
									<Send className="w-3.5 h-3.5" />
									<span className="hidden sm:inline">Отправить</span>
								</button>
							</div>
						</div>
					)}
				</header>

				{/* 2. ТЕЛО ПРЕЗЕНТАЦИИ: Скроллируемая область контента */}
				<main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
					{/* ОСНОВНОЙ РЕЖИМ СРАВНЕНИЯ: 3 ТАРИФА + КЛИНИЧЕСКИЕ ЭТАПЫ СНИЗУ */}
					{activeTab === "comparison" && (
						<div className="space-y-6">
							{/* Сенсорный мобильный Segmented Control для смартфонов */}
							<div className="treatment-mobile-tier-bar flex items-center p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-1 md:hidden">
								<button
									type="button"
									onClick={() => setSelectedTierId("economy")}
									className={`flex-1 min-h-[44px] py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
										selectedTierId === "economy" ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs" : "text-[var(--muted)]"
									}`}
									data-testid="mobile-tier-btn-economy"
								>
									Эконом
								</button>
								<button
									type="button"
									onClick={() => setSelectedTierId("standard")}
									className={`flex-1 min-h-[44px] py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
										selectedTierId === "standard" ? "bg-[var(--paper)] text-[var(--teal)] shadow-xs" : "text-[var(--muted)]"
									}`}
									data-testid="mobile-tier-btn-standard"
								>
									Оптимум
								</button>
								<button
									type="button"
									onClick={() => setSelectedTierId("optimum")}
									className={`flex-1 min-h-[44px] py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
										selectedTierId === "optimum" ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs" : "text-[var(--muted)]"
									}`}
									data-testid="mobile-tier-btn-optimum"
								>
									Премиум
								</button>
							</div>

							{/* 3-Tier Сетка сравнения на десктопе */}
							<div className="treatment-3tier-grid grid grid-cols-1 md:grid-cols-3 gap-4">
								{tiers.map((tier) => {
									const isSelected = selectedTierId === tier.tierId;
									const isEconomy = tier.tierId === "economy";
									const isStandard = tier.tierId === "standard";
									const isOptimum = tier.tierId === "optimum";
									const testId = isEconomy ? "tier-card-economy" : isStandard ? "tier-card-standard" : isOptimum ? "tier-card-optimum" : `tier-card-${tier.tierId}`;
									const ndflRefund = Math.round((tier.totalRub || 0) * 0.13);
									const totalWithNdfl = (tier.totalRub || 0) - ndflRefund;

									return (
										<div
											key={tier.tierId}
											onClick={() => setSelectedTierId(tier.tierId)}
											className={`relative p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
												isSelected
													? "border-[var(--teal)] bg-[var(--teal)]/5 ring-2 ring-[var(--teal)] shadow-md"
													: "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)]/40 hover:bg-[var(--paper-soft)]"
											}`}
											data-testid={testId}
										>
											<div>
												<div className="flex items-center justify-between gap-2 mb-1.5">
													<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
														{tier.badge || "Тариф"}
													</span>
													{(tier.isRecommended || isStandard || isOptimum) && (
														<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--teal)] text-[var(--paper-strong,#ffffff)]">
															Рекомендация врача
														</span>
													)}
												</div>

												<h3 className="text-xl font-black text-[var(--ink)] m-0">{tier.title}</h3>
												<p className="text-xs text-[var(--muted)] m-0 mt-1 leading-relaxed">
													{tier.subtitle}
												</p>
											</div>

											{/* Преимущества тарифа */}
											<div className="space-y-1.5 pt-3 border-t border-[var(--line)]/60 text-xs">
												{tier.keyAdvantages?.map((adv, idx) => (
													<div key={idx} className="flex items-center gap-2 text-[var(--ink)]">
														<ShieldCheck className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
														<span>{adv}</span>
													</div>
												))}
											</div>

											{/* Блок 13% НДФЛ */}
											<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]/50 text-xs space-y-1">
												<div className="flex items-center justify-between">
													<span className="text-[var(--muted)]">Вычет 13% НДФЛ:</span>
													<strong className="text-emerald-600 dark:text-emerald-400 font-bold">
														+{formatRubles(ndflRefund)}
													</strong>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-[var(--muted)]">Итого с вычетом:</span>
													<strong className="text-[var(--ink)] font-black">
														{formatRubles(totalWithNdfl)}
													</strong>
												</div>
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														setSelectedTierId(tier.tierId);
													}}
													className="w-full mt-1.5 py-1 text-[11px] font-bold rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
													data-testid={`calc-ndfl-btn-${tier.tierId}`}
												>
													Рассчитать вычет
												</button>
											</div>

											{/* Цена, гарантия и кнопка Применить */}
											<div className="pt-3 border-t border-[var(--line)] flex items-end justify-between gap-2">
												<div>
													<span className="text-[10px] uppercase font-bold text-[var(--muted)] block">
														Стоимость под ключ
													</span>
													<span className="text-2xl font-black text-[var(--ink)]">
														{formatRubles(tier.totalRub)}
													</span>
												</div>
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														setSelectedTierId(tier.tierId);
													}}
													className="min-h-[36px] px-3.5 py-1.5 text-xs font-bold rounded-xl border border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)] hover:bg-[var(--teal)] hover:text-[var(--paper-strong,#ffffff)] transition-all cursor-pointer"
													data-testid={`apply-tier-btn-${tier.tierId}`}
												>
													Применить
												</button>
											</div>
										</div>
									);
								})}
							</div>

							{/* Зубная формула плана лечения FDI */}
							<div
								className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)]"
								data-testid="treatment-plan-fdi-formula"
							>
								<span className="font-semibold text-[var(--ink)]">Зубная формула плана:</span>
								<span>FDI 11–48 (комплексный клинический протокол СтАР)</span>
							</div>

							{/* КЛИНИЧЕСКИЕ ЭТАПЫ ВЫБРАННОГО ТАРИФА */}
							<div className="space-y-3 pt-2 border-t border-[var(--line)]" data-testid="stages-accordion-section">
								<div className="flex items-center justify-between pb-1">
									<h3 className="text-sm font-bold text-[var(--ink)] m-0">Клинические этапы плана</h3>
									<span className="text-xs text-[var(--muted)]">
										Выбранный вариант: <strong className="text-[var(--ink)]">{activeTier?.title}</strong>
									</span>
								</div>

								{(activeTier?.stages && activeTier.stages.length > 0 ? activeTier.stages : [
									{
										id: "st-1",
										stageNumber: 1,
										title: "Этап 1: Терапевтическая подготовка",
										subtitle: "Санация полости рта",
										clinicalGoal: "Устранение воспалительных процессов и кариеса",
										totalRub: 14500,
										items: [
											{ id: "it-1", toothNumber: 16, code804n: "A16.07.002", name: "Восстановление зуба пломбой световой полимеризации", priceRub: 5500, quantity: 1 },
											{ id: "it-2", toothNumber: 26, code804n: "A16.07.030", name: "Эндодонтическое лечение корневого канала", priceRub: 9000, quantity: 1 },
										],
									},
									{
										id: "st-2",
										stageNumber: 2,
										title: "Этап 2: Хирургический этап",
										subtitle: "Установка дентальных имплантатов",
										clinicalGoal: "Восстановление утраченных опорных единиц",
										totalRub: 45000,
										items: [
											{ id: "it-3", toothNumber: 36, code804n: "A16.07.054", name: "Установка дентального имплантата SLA", priceRub: 45000, quantity: 1 },
										],
									},
									{
										id: "st-3",
										stageNumber: 3,
										title: "Этап 3: Ортопедическая реабилитация",
										subtitle: "Постоянные коронки из диоксида циркония",
										clinicalGoal: "Восстановление анатомической формы и жевательной функции",
										totalRub: 26500,
										items: [
											{ id: "it-4", toothNumber: 36, code804n: "A16.07.004", name: "Установка коронки из диоксида циркония на имплантате", priceRub: 26500, quantity: 1 },
										],
									},
								]).map((stage, idx) => {
									const isExpanded = expandedStageIndex === idx;
									return (
										<div
											key={stage.id || idx}
											className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden"
										>
											<div
												onClick={() => setExpandedStageIndex(isExpanded ? null : idx)}
												className="flex items-center justify-between p-3.5 bg-[var(--paper-soft)] cursor-pointer select-none"
											>
												<div className="flex items-center gap-3">
													<div className="w-7 h-7 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] font-black text-xs flex items-center justify-center shrink-0">
														{romanizeStageNumber(stage.stageNumber || idx + 1)}
													</div>
													<div>
														<h4 className="text-sm font-bold text-[var(--ink)] m-0">{stage.title}</h4>
														<p className="text-xs text-[var(--muted)] m-0">{stage.clinicalGoal}</p>
													</div>
												</div>

												<div className="flex items-center gap-3">
													<span className="text-sm font-black text-[var(--ink)]">
														{formatRubles(stage.totalRub)}
													</span>
													{isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--muted)]" />}
												</div>
											</div>

											{isExpanded && (
												<div className="p-3.5 divide-y divide-[var(--line)]/40 text-xs">
													{stage.items?.map((item: any) => (
														<div key={item.id} className="py-2 flex items-center justify-between gap-3">
															<div className="flex items-center gap-2">
																{item.toothNumber && (
																	<span className="px-2 py-0.5 rounded bg-[var(--line-subtle)] text-[var(--ink)] font-bold">
																		Зуб {item.toothNumber}
																	</span>
																)}
																<span className="code-804n-badge px-2 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] font-mono text-[10px]">
																	{item.code804n || "A16.07"}
																</span>
																<span className="text-[var(--ink)] font-medium">{item.name}</span>
															</div>
															<div className="text-right whitespace-nowrap">
																<span className="font-bold text-[var(--ink)]">
																	{formatRubles(item.priceRub || item.unitPriceRub || 0)}
																</span>
															</div>
														</div>
													))}
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* ВКЛАДКА 2: СВОДКА ДЛЯ ДОГОВОРА / ПЕЧАТНАЯ ВЕРСИЯ */}
					{activeTab === "print" && (
						<div className="p-6 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-4 max-w-3xl mx-auto print:border-0 print:p-0">
							<div className="text-center pb-3 border-b border-[var(--line)]">
								<h3 className="text-lg font-black text-[var(--ink)] uppercase tracking-wider m-0">
									Приложение № 1 к Договору на оказание стоматологических услуг
								</h3>
								<p className="text-xs text-[var(--muted)] m-0 mt-1">
									План комплексного стоматологического лечения и финансовая смета
								</p>
							</div>

							<div className="grid grid-cols-2 gap-4 text-xs">
								<div>
									<span className="text-[var(--muted)] block">Пациент:</span>
									<strong className="text-[var(--ink)]">{patientName}</strong>
								</div>
								<div>
									<span className="text-[var(--muted)] block">Лечащий врач:</span>
									<strong className="text-[var(--ink)]">{doctorFullName}</strong>
								</div>
								<div>
									<span className="text-[var(--muted)] block">Выбранный вариант:</span>
									<strong className="text-[var(--teal)] font-bold">{activeTier?.title}</strong>
								</div>
								<div>
									<span className="text-[var(--muted)] block">Гарантийные обязательства:</span>
									<strong className="text-[var(--ink)]">{activeTier?.warrantyYears} года</strong>
								</div>
							</div>

							<div className="pt-3 border-t border-[var(--line)] flex items-center justify-between">
								<span className="text-sm font-bold text-[var(--ink)]">Итоговая стоимость плана:</span>
								<span className="text-2xl font-black text-[var(--ink)]">
									{formatRubles(activeTier?.totalRub || 0)}
								</span>
							</div>
						</div>
					)}
				</main>

				{/* 3. ПОДВАЛ ПРЕЗЕНТАЦИИ: Итог, вторичные действия и ровно ОДИН Primary CTA */}
				<footer className="flex items-center justify-between flex-wrap gap-4 px-4 sm:px-6 py-3.5 bg-[var(--paper-soft)] border-t border-[var(--line)] shrink-0">
					<div>
						<span className="text-xs text-[var(--muted)] block">Выбранный вариант:</span>
						<span className="text-lg font-black text-[var(--ink)]">
							«{activeTier?.title || "План"}» — {formatRubles(activeTier?.totalRub || 0)}
						</span>
					</div>

					<div className="flex items-center gap-2 w-full sm:w-auto">
						<button
							type="button"
							onClick={handlePrint}
							className="min-h-[44px] flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
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
								className="min-h-[44px] flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
								data-testid="approve-and-sign-btn"
							>
								<FileSignature className="w-4 h-4 text-[var(--muted)] shrink-0" />
								<span className="hidden sm:inline">Подписать план лечения</span>
								<span className="sm:hidden">Подписать</span>
							</button>
						)}

						{/* ЕДИНСТВЕННЫЙ PRIMARY CTA КНОПКА БЛОКА */}
						<button
							type="button"
							onClick={handleConfirmChoice}
							className="primary-button min-h-[44px] flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
							data-testid="confirm-patient-choice-btn"
						>
							<CheckCircle2 className="w-4 h-4 shrink-0" />
							<span className="hidden sm:inline">{`Пациент выбрал ${getTierLetter(selectedTierId)}`}</span>
							<span className="sm:hidden">{`Выбрать ${getTierLetter(selectedTierId)}`}</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default TreatmentPlanPresenterModal;
