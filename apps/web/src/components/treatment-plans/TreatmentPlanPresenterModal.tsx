/**
 * TreatmentPlanPresenterModal.tsx — Интерактивная презентация планов лечения для пациента у кресла (SSOT).
 * Мандат 8b: Золотой стандарт modularity (<= 250 строк оркестратора).
 * Мандат 8e: Автономия врача и пациента — кнопки не блокируются, мгновенный выбор тарифа и оплата в 1 клик.
 * Мандат 8am: Ровно 1 Primary CTA кнопка var(--teal). Все вторичные действия — нейтральные.
 * Apple HIG: Нативный Bottom Sheet на смартфонах с тактильным драг-хэндлом 36×5px, тач-таргеты >= 44px, 0px горизонтального скролла.
 * Прямой финансовый мост: кнопка «Оплатить этап» мгновенно открывает кассовый чекаут CashRegisterCheckoutModal.
 */

import React, { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import type { TreatmentPlanTier, TreatmentPlanTierId, TreatmentPlanStage } from "./treatmentPlanTypes";
import { PresenterHeader, type PresenterModalTab } from "./presenterModules/PresenterHeader";
import { Presenter3TierSelector } from "./presenterModules/Presenter3TierSelector";
import { PresenterFinancialSummary } from "./presenterModules/PresenterFinancialSummary";
import { PresenterStagesList } from "./presenterModules/PresenterStagesList";
import { PresenterFooter } from "./presenterModules/PresenterFooter";
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

export const TreatmentPlanPresenterModal: React.FC<TreatmentPlanPresenterModalProps> = ({
	isOpen,
	onClose,
	patientName = "Пациент",
	patientId = "pat-walkin",
	patientPhone = "",
	doctorFullName = "Лечащий врач",
	clinicName = "Стоматологическая клиника DENTE",
	tiers = [],
	initialSelectedTierId = "standard",
	onApproveAndSign,
	onConfirmSelection,
	onPayStage,
	className = "",
}) => {
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>(initialSelectedTierId);
	const [activeTab, setActiveTab] = useState<PresenterModalTab>("comparison");
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [expandedStageIndex, setExpandedStageIndex] = useState<number | null>(0);
	const [, setIsChoiceConfirmed] = useState(false);
	const [copilotPrompt, setCopilotPrompt] = useState("");
	const [isCopilotOpen, setIsCopilotOpen] = useState(true);

	// Прямой финансовый мост в Кассу
	const [checkoutStage, setCheckoutStage] = useState<TreatmentPlanStage | null>(null);
	const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

	const activeTier = useMemo(() => {
		if (!tiers || tiers.length === 0) return null;
		return (
			tiers.find((t) => t.tierId === selectedTierId) ||
			tiers.find((t) => t.tierId === "standard" || t.tierId === "optimum") ||
			tiers[0]!
		);
	}, [tiers, selectedTierId]);

	const handleConfirmChoice = useCallback(() => {
		setIsChoiceConfirmed(true);
		if (activeTier) {
			if (onConfirmSelection) onConfirmSelection(activeTier);
			if (onApproveAndSign) onApproveAndSign(activeTier);
		}
	}, [activeTier, onConfirmSelection, onApproveAndSign]);

	const handlePrint = useCallback(() => {
		if (typeof window !== "undefined") window.print();
	}, []);

	const handlePayStageClick = useCallback(
		(stage: TreatmentPlanStage) => {
			setCheckoutStage(stage);
			setIsCheckoutOpen(true);
			if (onPayStage) onPayStage(stage);
		},
		[onPayStage],
	);

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
					patientName={patientName}
					doctorFullName={doctorFullName}
					isFullscreen={isFullscreen}
					onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
					onClose={onClose}
					onPrint={handlePrint}
					activeTab={activeTab}
					onSelectTab={setActiveTab}
					isCopilotOpen={isCopilotOpen}
					onToggleCopilot={() => setIsCopilotOpen((prev) => !prev)}
					copilotPrompt={copilotPrompt}
					onCopilotPromptChange={setCopilotPrompt}
					onCopilotSend={() => setCopilotPrompt("")}
					onSelectCopilotPreset={(preset) => setCopilotPrompt(preset)}
				/>

				{/* 2. ТЕЛО ПРЕЗЕНТАЦИИ */}
				<main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
					{activeTab === "comparison" && (
						<div className="space-y-6">
							<Presenter3TierSelector
								tiers={tiers}
								selectedTierId={selectedTierId}
								onSelectTier={setSelectedTierId}
							/>

							<PresenterStagesList
								activeTier={activeTier}
								expandedStageIndex={expandedStageIndex}
								onToggleStage={(idx) =>
									setExpandedStageIndex((prev) => (prev === idx ? null : idx))
								}
								onPayStage={handlePayStageClick}
							/>
						</div>
					)}

					{activeTab === "print" && (
						<PresenterFinancialSummary
							patientName={patientName}
							doctorFullName={doctorFullName}
							activeTier={activeTier}
						/>
					)}
				</main>

				{/* 3. ПОДВАЛ ПРЕЗЕНТАЦИИ */}
				<PresenterFooter
					activeTier={activeTier}
					selectedTierId={selectedTierId}
					getTierLetter={getTierLetter}
					onPrint={handlePrint}
					onApproveAndSign={onApproveAndSign}
					onConfirmChoice={handleConfirmChoice}
				/>
			</div>

			{/* Кассовый чекаут: мгновенная оплата этапа без ручного перенабора */}
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
					amountKopecks={Math.round((checkoutStage?.totalRub || activeTier?.totalRub || 0) * 100)}
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
