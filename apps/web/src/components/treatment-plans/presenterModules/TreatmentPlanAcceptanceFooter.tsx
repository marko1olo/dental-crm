/**
 * TreatmentPlanAcceptanceFooter.tsx — Единый канонический подвал фиксации и акцепта плана лечения (SSOT).
 * Мандат 8b: Золотой стандарт modularity (80–120 строк).
 * Мандат 8am: Ровно 1 Primary CTA кнопка var(--teal) (#0d9488). Все остальные — нейтральные.
 * Мандат 8e: Автономия врача — кнопки никогда не блокируются (zero disabled).
 * Apple HIG: Сенсорная зона >= 44-52px, Natural Thumb Zone в нижней трети экрана.
 * Финансы: Точные расчеты строго в копейках (amountKopecks, BIGINT).
 */

import React, { useState, useMemo } from "react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "./treatmentPlanPresenterTypes.js";
import { AcceptanceSignatureDrawer } from "./acceptanceFooter/AcceptanceSignatureDrawer.js";
import { AcceptanceFooterActions } from "./acceptanceFooter/AcceptanceFooterActions.js";

export interface TreatmentPlanAcceptanceFooterProps {
	readonly selectedTier?: TreatmentPlanTier | null;
	readonly activeTier?: TreatmentPlanTier | null;
	readonly selectedTierId?: TreatmentPlanTierId;
	readonly getTierLetter?: (tierId: TreatmentPlanTierId) => string;
	readonly isChoiceConfirmed?: boolean;
	readonly onConfirmPatientChoice?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onConfirmChoice?: (() => void) | undefined;
	readonly onPrintAppendix?: (() => void) | undefined;
	readonly onPrint?: (() => void) | undefined;
	readonly onApproveAndSign?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onTransferToWorkOrder?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onSendToMessenger?: (() => void) | undefined;
	readonly patientChoiceBtnText?: string | undefined;
	readonly choiceConfirmedBtnText?: string | undefined;
}

const FALLBACK_TIER: TreatmentPlanTier = {
	tierId: "standard",
	title: "Оптимальный план",
	badge: "Вариант Б: Оптимум",
	totalRub: 86000,
	totalKopecks: 8600000,
	amountKopecks: BigInt(8600000),
	stages: [],
	keyAdvantages: ["Оптимальный баланс", "Гарантия 2 года"],
	warrantyYears: 2,
};

export const TreatmentPlanAcceptanceFooter: React.FC<TreatmentPlanAcceptanceFooterProps> = ({
	selectedTier,
	activeTier,
	selectedTierId,
	getTierLetter,
	isChoiceConfirmed = false,
	onConfirmPatientChoice,
	onConfirmChoice,
	onPrintAppendix,
	onPrint,
	onApproveAndSign,
	onTransferToWorkOrder,
	onSendToMessenger,
	patientChoiceBtnText,
	choiceConfirmedBtnText,
}) => {
	const [showSignaturePad, setShowSignaturePad] = useState<boolean>(false);
	const [risksAccepted, setRisksAccepted] = useState<boolean>(true);
	const [hasSigned, setHasSigned] = useState<boolean>(false);

	const effectiveTier: TreatmentPlanTier = useMemo(() => {
		return selectedTier || activeTier || FALLBACK_TIER;
	}, [selectedTier, activeTier]);

	const totalRub = effectiveTier.totalRub || 0;
	// Расчет строго в копейках (Мандат 8b, 8n)
	const totalKopecks = typeof effectiveTier.totalKopecks === "number"
		? effectiveTier.totalKopecks
		: Number(BigInt(Math.round(totalRub)) * 100n);

	const tierLetter = selectedTierId && getTierLetter
		? getTierLetter(selectedTierId)
		: effectiveTier.badge || "Оптимум";

	const handleFinalAccept = () => {
		if (onConfirmPatientChoice) {
			onConfirmPatientChoice(effectiveTier);
		}
		if (onConfirmChoice) {
			onConfirmChoice();
		}
		if (onApproveAndSign) {
			onApproveAndSign(effectiveTier);
		}
		setShowSignaturePad(false);
	};

	const handlePrintCall = () => {
		if (onPrintAppendix) {
			onPrintAppendix();
		} else if (onPrint) {
			onPrint();
		} else if (typeof window !== "undefined") {
			window.print();
		}
	};

	const handleTransferWorkOrder = onTransferToWorkOrder
		? () => onTransferToWorkOrder(effectiveTier)
		: undefined;

	return (
		<footer
			className="treatment-acceptance-footer treatment-presenter-footer sticky bottom-0 z-40 p-3 sm:p-4 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] shadow-lg shrink-0"
			data-testid="treatment-plan-acceptance-footer"
		>
			<div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
				{/* Левая часть: информация о тарифе и сумме в рублях и копейках */}
				<div className="treatment-footer-summary flex items-center gap-3 w-full sm:w-auto">
					<div className="text-left min-w-0">
						<span className="treatment-footer-label text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
							Выбранный вариант:
						</span>
						<span className="treatment-footer-amount text-sm sm:text-base font-black text-[var(--ink)] truncate block">
							«{effectiveTier.title}» ({tierLetter})
						</span>
					</div>
					<div className="h-7 w-px bg-[var(--line)] hidden sm:block" />
					<div className="text-left shrink-0">
						<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
							Сумма к оплате:
						</span>
						<span className="text-base sm:text-lg font-black text-[var(--teal)] font-mono">
							{totalRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>

				{/* Правая часть: кнопки действий и ровно 1 Primary CTA */}
				<AcceptanceFooterActions
					selectedTier={effectiveTier}
					isChoiceConfirmed={isChoiceConfirmed}
					hasSigned={hasSigned}
					onPrintAppendix={handlePrintCall}
					onToggleSignaturePad={() => setShowSignaturePad((prev) => !prev)}
					onFinalAccept={handleFinalAccept}
					onApproveAndSign={onApproveAndSign}
					onTransferToWorkOrder={handleTransferWorkOrder}
					onSendToMessenger={onSendToMessenger}
					patientChoiceBtnText={patientChoiceBtnText || `Пациент выбрал ${tierLetter}`}
					choiceConfirmedBtnText={choiceConfirmedBtnText}
				/>
			</div>

			{showSignaturePad && (
				<AcceptanceSignatureDrawer
					risksAccepted={risksAccepted}
					onRisksChange={setRisksAccepted}
					onSignedChange={setHasSigned}
				/>
			)}
		</footer>
	);
};

export const PresenterFooter = TreatmentPlanAcceptanceFooter;
export type PresenterFooterProps = TreatmentPlanAcceptanceFooterProps;

export default TreatmentPlanAcceptanceFooter;
