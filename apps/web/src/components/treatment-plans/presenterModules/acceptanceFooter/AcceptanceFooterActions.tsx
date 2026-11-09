import React from "react";
import { Printer, PenTool, Check, CheckCircle2, FileText, Send } from "lucide-react";
import type { TreatmentPlanTier } from "../treatmentPlanPresenterTypes.js";

export interface AcceptanceFooterActionsProps {
	readonly selectedTier: TreatmentPlanTier;
	readonly isChoiceConfirmed: boolean;
	readonly hasSigned: boolean;
	readonly onPrintAppendix: () => void;
	readonly onToggleSignaturePad: () => void;
	readonly onFinalAccept: () => void;
	readonly onApproveAndSign?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onTransferToWorkOrder?: (() => void) | undefined;
	readonly onSendToMessenger?: (() => void) | undefined;
	readonly patientChoiceBtnText?: string | undefined;
	readonly choiceConfirmedBtnText?: string | undefined;
}

export const AcceptanceFooterActions: React.FC<AcceptanceFooterActionsProps> = ({
	selectedTier,
	isChoiceConfirmed,
	hasSigned,
	onPrintAppendix,
	onToggleSignaturePad,
	onFinalAccept,
	onApproveAndSign,
	onTransferToWorkOrder,
	onSendToMessenger,
	patientChoiceBtnText,
	choiceConfirmedBtnText,
}) => {
	const badgeText = selectedTier.badge || selectedTier.title || "Тариф";

	return (
		<div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-end flex-wrap">
			{/* Печать формы / сметы (Мандат 8e: disabled={false}) */}
			<button
				type="button"
				onClick={onPrintAppendix}
				className="btn-treatment-action secondary-button dente-btn dente-btn-secondary min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-xs font-semibold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-98 shadow-2xs"
				data-testid="print-contract-btn"
				title="Печать сметы плана"
			>
				<Printer size={16} className="text-[var(--muted)] shrink-0" />
				<span className="hidden sm:inline">Печать формы</span>
				<span className="sm:hidden">Печать</span>
			</button>

			{/* В мессенджер (WhatsApp / Telegram / SMS) */}
			{onSendToMessenger && (
				<button
					type="button"
					onClick={onSendToMessenger}
					className="btn-treatment-action secondary-button dente-btn dente-btn-secondary min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-xs font-semibold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-98 shadow-2xs"
					data-testid="send-to-messenger-btn"
					title="Отправить смету пациенту в мессенджер"
				>
					<Send size={15} className="text-[var(--muted)] shrink-0" />
					<span className="hidden sm:inline">В мессенджер</span>
					<span className="sm:hidden">Мессенджер</span>
				</button>
			)}

			{/* В заказ-наряд (Мандат 8e: 1-клик перевод утвержденных процедур в наряд-заказ, disabled={false}) */}
			{onTransferToWorkOrder && (
				<button
					type="button"
					onClick={onTransferToWorkOrder}
					className="btn-treatment-action secondary-button dente-btn dente-btn-secondary min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-xs font-semibold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-98 shadow-2xs"
					data-testid="transfer-to-work-order-btn"
					title="Перевести план в наряд-заказ"
				>
					<FileText size={15} className="text-[var(--muted)] shrink-0" />
					<span className="hidden sm:inline">В заказ-наряд</span>
					<span className="sm:hidden">Заказ-наряд</span>
				</button>
			)}

			{/* Подпись на планшете / ЭЦП / Подписать план лечения */}
			<button
				type="button"
				onClick={() => {
					onToggleSignaturePad();
					if (onApproveAndSign) {
						onApproveAndSign(selectedTier);
					}
				}}
				className="btn-treatment-action secondary-button dente-btn dente-btn-secondary min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-xs font-semibold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-98 shadow-2xs"
				data-testid="approve-and-sign-btn"
				title="Подписать план лечения"
			>
				<PenTool size={16} className="text-[var(--muted)] shrink-0" />
				<span className="hidden sm:inline">{hasSigned ? "Подписано" : "Подпись на планшете"}</span>
				<span className="sm:hidden">{hasSigned ? "Подписано" : "Подписать"}</span>
			</button>

			{/* ЕДИНСТВЕННЫЙ PRIMARY CTA КНОПКА (Мандат 8am, Apple HIG: h >= 48-52px на мобильных, disabled={false}) */}
			<button
				type="button"
				onClick={onFinalAccept}
				className={`btn-patient-choice primary-button min-h-[48px] sm:min-h-[44px] px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black inline-flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 shadow-sm text-white ${
					isChoiceConfirmed
						? "bg-emerald-600 hover:bg-emerald-700"
						: "bg-[var(--teal,#0d9488)] hover:bg-[#0f766e]"
				}`}
				data-testid="confirm-patient-choice-btn"
			>
				{isChoiceConfirmed ? <Check size={18} className="shrink-0" /> : <CheckCircle2 size={18} className="shrink-0" />}
				<span>
					{isChoiceConfirmed
						? (choiceConfirmedBtnText || "Выбор утвержден")
						: (patientChoiceBtnText || `Пациент выбрал ${badgeText}`)}
				</span>
			</button>
		</div>
	);
};
