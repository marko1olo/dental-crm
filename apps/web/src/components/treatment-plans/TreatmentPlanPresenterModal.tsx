/**
 * TreatmentPlanPresenterModal.tsx — Канонический 3-уровневый презентер планов лечения (SSOT).
 * Мандаты 8b, 8zi: Золотой стандарт modularity (целевой размер 300–400 строк, Sweet Spot).
 * Мандат 8e: Автономия врача — свобода скидок до 100% (гарантийные переделки), кнопки никогда не блокируются.
 * Мандат 8am: Ровно 1 Primary CTA кнопка var(--teal) (#0d9488). Вторичные кнопки — нейтральные с рамкой var(--line).
 * Мандат 8n: Простота соло-практики, ноль бюрократии и регуляторного птичьего канцелярита.
 * Apple HIG: Нативный Bottom Sheet на смартфонах, Drag Handle 36x5px, тач-таргеты >= 44-52px, 0px горизонтального скролла.
 * Финансовый мост: Мгновенная оплата этапа через кассовый чекаут CashRegisterCheckoutModal в целых копейках.
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
	Printer,
	CheckCircle2,
	FileSignature,
	Send,
} from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId, TreatmentPlanStage, TreatmentPlanItem } from "./treatmentPlanTypes";
import { formatRubles } from "./treatmentPlanTypes";
import { PresenterHeader, type PresenterModalTab } from "./presenterModules/PresenterHeader";
import {
	DEFAULT_PRESENTER_STAGES,
	DEFAULT_PRESENTER_TIERS,
	buildPresenterTiersFromTeeth,
} from "./presenterModules/TreatmentPlanPresenterDefaultStages";
import { PresenterDoctorDiscountBar } from "./presenterModules/PresenterDoctorDiscountBar";
import { Presenter3TierGrid } from "./presenterModules/Presenter3TierGrid";
import { PresenterStagesSection } from "./presenterModules/PresenterStagesSection";
import { CashRegisterCheckoutModal } from "../billing/CashRegisterCheckoutModal";

if (typeof window !== "undefined") {
	void import("./treatmentPlans.css");
}

export { isMicroConsumable, type PlanItemLike } from "./treatmentPlanConsumables";
export { DEFAULT_PRESENTER_TIERS as DEFAULT_TIERS };

export interface TreatmentPlanPresenterModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly clinicLicense?: string | undefined;
	readonly planId?: string | undefined;
	readonly planCreatedAtIso?: string | undefined;
	readonly contractNumber?: string | undefined;
	readonly onSelectPlan?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onPrintContract?: (() => void) | undefined;
	readonly isDemoMode?: boolean | undefined;
	readonly tiers?: readonly TreatmentPlanTier[] | readonly any[] | undefined;
	readonly initialSelectedTierId?: TreatmentPlanTierId | undefined;
	readonly onApproveAndSign?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onConfirmSelection?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly className?: string | undefined;
	readonly teeth?: unknown | undefined;
}

export function getTierLetter(tierId: TreatmentPlanTierId): string {
	if (tierId === "economy") return "Вариант А: Эконом";
	if (tierId === "standard" || tierId === "optimum") return "Вариант Б: Оптимум";
	return "Вариант В: Премиум";
}

export function getTierShortTitle(tierId: TreatmentPlanTierId): string {
	if (tierId === "economy") return "Эконом";
	if (tierId === "standard" || tierId === "optimum") return "Оптимум";
	return "Премиум";
}

export const TreatmentPlanPresenterModal: React.FC<TreatmentPlanPresenterModalProps> = ({
	isOpen,
	onClose,
	patientName = "Пациент",
	patientId = "pat-walkin",
	patientPhone = "",
	doctorFullName = "Лечащий врач",
	planId,
	tiers: propTiers,
	initialSelectedTierId = "standard",
	onApproveAndSign,
	onConfirmSelection,
	onPayStage,
	className = "",
	teeth,
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

	const effectiveTiers: readonly TreatmentPlanTier[] = useMemo(() => {
		const raw = propTiers && propTiers.length > 0 ? propTiers : buildPresenterTiersFromTeeth(teeth);
		if (doctorDiscountPercent <= 0) return raw;
		const multiplier = Math.max(0, (100 - doctorDiscountPercent) / 100);
		return raw.map((tier): TreatmentPlanTier => {
			const discountedRub = Math.round(tier.totalRub * multiplier);
			return {
				...tier,
				totalRub: discountedRub,
				totalKopecks: Number(BigInt(discountedRub) * 100n),
				stages: tier.stages.map((stage): TreatmentPlanStage => {
					const sRub = Math.round(stage.totalRub * multiplier);
					return {
						...stage,
						totalRub: sRub,
						totalKopecks: Math.round(sRub * 100),
						items: stage.items.map((it): TreatmentPlanItem => ({
							...it,
							priceRub: Math.round(it.priceRub * multiplier),
							unitPriceRub: typeof it.unitPriceRub === "number" ? Math.round(it.unitPriceRub * multiplier) : 0,
						})),
					};
				}),
			};
		});
	}, [propTiers, teeth, doctorDiscountPercent]);

	const storageKey = `dente_presenter_draft_${planId || patientId || "default"}`;

	// Восстановление драфта из localStorage (Мандат 8e)
	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const saved = localStorage.getItem(storageKey);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (parsed.selectedTierId) setSelectedTierId(parsed.selectedTierId);
				if (typeof parsed.doctorDiscountPercent === "number") setDoctorDiscountPercent(parsed.doctorDiscountPercent);
			}
		} catch {
			// ignore
		}
	}, [storageKey]);

	// Debounced autosave (Мандат 8e)
	useEffect(() => {
		if (typeof window === "undefined") return;
		const timer = setTimeout(() => {
			try {
				localStorage.setItem(
					storageKey,
					JSON.stringify({
						selectedTierId,
						doctorDiscountPercent,
						updatedAt: new Date().toISOString(),
					})
				);
			} catch {
				// ignore
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [selectedTierId, doctorDiscountPercent, storageKey]);

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

	const handleSendToMessenger = useCallback(() => {
		const planTitle = activeTier?.title || "План лечения";
		const totalStr = formatRubles(activeTier?.totalRub || 0);
		const stagesSummary = (activeTier?.stages || [])
			.map((s, i) => `${i + 1}. ${s.title}: ${formatRubles(s.totalRub)}`)
			.join("\n");
		const msg = `Здравствуйте, ${patientName}!\nВаш план лечения «${planTitle}» в DENTE:\nСумма: ${totalStr}\n\nЭтапы реабилитации:\n${stagesSummary}\n\nС уважением, ${doctorFullName}`;

		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(msg);
		}

		const cleanPhone = patientPhone.replace(/[^\d+]/g, "");
		if (cleanPhone && typeof window !== "undefined") {
			const encoded = encodeURIComponent(msg);
			const waUrl = `https://wa.me/${cleanPhone.replace("+", "")}?text=${encoded}`;
			window.open(waUrl, "_blank", "noopener,noreferrer");
		}
	}, [activeTier, patientName, doctorFullName, patientPhone]);

	const handleStagePayment = useCallback((stage: TreatmentPlanStage) => {
		setCheckoutStage(stage);
		setIsCheckoutOpen(true);
		if (onPayStage) {
			onPayStage(stage);
		}
		if (typeof fetch !== "undefined") {
			void fetch("/api/invoices/generate-from-plan", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					planId: planId || "plan-custom",
					patientId: patientId || "pat-walkin",
					documentType: "WorkOrder",
					isSignedWithPatient: true,
					items: stage.items.map((it) => ({
						nameRu: it.name,
						lineGrossRub: it.priceRub,
						quantity: it.quantity,
						serviceCode: it.serviceCode || it.code804n,
					})),
				}),
			}).catch(() => {
				// graceful fallback
			});
		}
	}, [onPayStage, planId, patientId]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className={`treatment-presenter-backdrop fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-x-clip max-w-[100vw] h-full max-h-none ${
				isFullscreen ? "p-0" : ""
			}`}
			data-testid="treatment-plan-presenter-modal"
		>
			<div
				className={`treatment-presenter-container flex flex-col w-full bg-[var(--paper)] text-[var(--ink)] border-t sm:border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl overflow-hidden transition-all mt-auto mb-0 sm:my-auto ${
					isFullscreen ? "h-screen w-screen rounded-none border-0" : "max-w-5xl h-[92dvh] sm:h-auto sm:max-h-[92vh]"
				} ${className}`}
				role="dialog"
				aria-modal="true"
				aria-labelledby="treatment-presenter-modal-title"
			>
				{/* 1. ШАПКА ПРЕЗЕНТАЦИИ */}
				<PresenterHeader
					patientName={patientName}
					doctorFullName={doctorFullName}
					isFullscreen={isFullscreen}
					onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
					onClose={onClose}
					onPrint={() => typeof window !== "undefined" && window.print()}
					activeTab={activeTab}
					onTabChange={setActiveTab}
					onCopyTiersSummary={handleCopySummary}
					onSendToMessenger={handleSendToMessenger}
					isCopilotOpen={isCopilotOpen}
					onToggleCopilot={() => setIsCopilotOpen((prev) => !prev)}
					copilotPrompt={copilotPrompt}
					onCopilotPromptChange={setCopilotPrompt}
					onCopilotSend={() => setCopilotPrompt("")}
					onSelectCopilotPreset={(p) => setCopilotPrompt(p)}
					onToggleDiscounts={() => setIsDiscountOpen((prev) => !prev)}
				/>

				{/* Панель скидок врача (Мандат 8e: свобода до 100% без пароля начмеда) */}
				{isDiscountOpen && (
					<PresenterDoctorDiscountBar
						doctorDiscountPercent={doctorDiscountPercent}
						onDiscountChange={setDoctorDiscountPercent}
						totalRub={activeTier?.totalRub || 0}
					/>
				)}

				{/* 2. ТЕЛО ПРЕЗЕНТАЦИИ */}
				<main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
					{activeTab === "comparison" && (
						<div className="space-y-6">
							{/* 3-Tier Сетка вариантов смет и Segmented Control */}
							<Presenter3TierGrid
								effectiveTiers={effectiveTiers}
								selectedTierId={selectedTierId}
								onSelectTierId={setSelectedTierId}
							/>

							{/* Зубная формула и клинические этапы плана */}
							<PresenterStagesSection
								activeTier={activeTier}
								expandedStageIndex={expandedStageIndex}
								onToggleStage={(idx) => setExpandedStageIndex((prev) => (prev === idx ? null : idx))}
								onPayStageClick={handleStagePayment}
							/>
						</div>
					)}

					{activeTab === "print" && (
						<div className="space-y-4 p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)]">
							<h3 className="text-base font-bold text-[var(--ink)] m-0">Сводный расчет для договора</h3>
							<p className="text-xs text-[var(--muted)] m-0">
								Пациент: <strong>{patientName}</strong> · Врач: <strong>{doctorFullName}</strong>
							</p>
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

				{/* 3. ПОДВАЛ ПРЕЗЕНТАЦИИ (ЕДИНЫЙ ДИЗАЙН-КОД: РОВНО 1 PRIMARY CTA) */}
				<footer className="treatment-presenter-footer sticky bottom-0 z-50 flex items-center justify-between flex-wrap gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-3.5 pb-[max(12px,env(safe-area-inset-bottom))] bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] shrink-0">
					<div className="treatment-footer-summary flex flex-col min-w-0">
						<span className="treatment-footer-label text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
							Выбранный вариант:
						</span>
						<span className="treatment-footer-amount text-sm sm:text-lg font-black text-[var(--ink)] truncate">
							«{activeTier?.title || "План"}» — {formatRubles(activeTier?.totalRub || 0)}
						</span>
					</div>

					<div className="treatment-footer-actions flex items-center gap-2 w-full sm:w-auto">
						<div className="treatment-footer-secondary-actions flex items-center gap-2 flex-1 sm:flex-initial">
							<button
								type="button"
								onClick={() => typeof window !== "undefined" && window.print()}
								className="btn-treatment-action secondary-button dente-btn dente-btn-secondary min-h-[44px] flex-1 px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
								data-testid="print-contract-btn"
							>
								<Printer className="w-4 h-4 text-[var(--muted)] shrink-0" />
								<span className="hidden sm:inline">Печать сметы плана</span>
								<span className="sm:hidden">Печать</span>
							</button>

							<button
								type="button"
								onClick={handleSendToMessenger}
								className="btn-treatment-action secondary-button dente-btn dente-btn-secondary min-h-[44px] flex-1 px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
								data-testid="send-to-messenger-btn"
								title="Отправить смету пациенту (WhatsApp / Telegram / SMS)"
							>
								<Send className="w-4 h-4 text-[var(--muted)] shrink-0" />
								<span className="hidden sm:inline">В мессенджер</span>
								<span className="sm:hidden">Мессенджер</span>
							</button>

							{onApproveAndSign && (
								<button
									type="button"
									onClick={() => activeTier && onApproveAndSign(activeTier)}
									className="btn-treatment-action secondary-button dente-btn dente-btn-secondary min-h-[44px] flex-1 px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
									data-testid="approve-and-sign-btn"
								>
									<FileSignature className="w-4 h-4 text-[var(--muted)] shrink-0" />
									<span className="hidden sm:inline">Подписать план лечения</span>
									<span className="sm:hidden">Подписать</span>
								</button>
							)}
						</div>

						{/* ЕДИНСТВЕННЫЙ PRIMARY CTA КНОПКА (Мандат 8am: #0d9488, мобильная высота 52px по Apple HIG) */}
						<button
							type="button"
							onClick={handleConfirmChoice}
							className="btn-patient-choice primary-button min-h-[52px] sm:min-h-[48px] w-full sm:w-auto px-5 sm:px-7 py-2.5 text-xs sm:text-sm font-black rounded-xl inline-flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer bg-[var(--teal,#0d9488)] hover:bg-[#0f766e] text-white"
							data-testid="confirm-patient-choice-btn"
						>
							<CheckCircle2 className="w-4 h-4 shrink-0" />
							<span className="hidden sm:inline">{`Пациент выбрал ${getTierLetter(selectedTierId)}`}</span>
							<span className="sm:hidden">{`Выбрать «${getTierShortTitle(selectedTierId)}»`}</span>
						</button>
					</div>
				</footer>
			</div>

			{/* Кассовый чекаут */}
			{isCheckoutOpen && (
				<CashRegisterCheckoutModal
					isOpen={isCheckoutOpen}
					onClose={() => {
						setIsCheckoutOpen(false);
						setCheckoutStage(null);
					}}
					patientId={patientId}
					patientName={patientName}
					patientPhone={patientPhone}
					amountRub={checkoutStage?.totalRub || activeTier?.totalRub || 0}
					amountKopecks={
						checkoutStage?.totalKopecks ??
						(activeTier?.totalKopecks !== undefined && checkoutStage === null
							? activeTier.totalKopecks
							: Math.round((checkoutStage?.totalRub || activeTier?.totalRub || 0) * 100))
					}
					doctorFullName={doctorFullName}
					title={`Оплата этапа ${checkoutStage?.stageNumber || 1}: ${checkoutStage?.title || "План лечения"}`}
					onPaymentComplete={() => {
						setIsCheckoutOpen(false);
						setCheckoutStage(null);
					}}
				/>
			)}
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default TreatmentPlanPresenterModal;
