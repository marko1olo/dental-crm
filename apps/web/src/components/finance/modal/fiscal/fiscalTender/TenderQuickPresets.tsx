import React from "react";
import {
	Banknote,
	CreditCard,
	Layers,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import { showToast } from "../../../../GlobalToast";
import type { TenderQuickPresetsProps } from "./types";

export const TenderQuickPresets: React.FC<TenderQuickPresetsProps> = ({
	setPaymentMode,
	selectSingleMethod,
	applyCombinedPaymentPreset,
	totalSumRub,
	patientDepositRub,
	selectedDiscountPreset,
	setSelectedDiscountPreset,
	handleManualCardTerminalConfirm,
	isSubmittingManualCard,
	setCardAmount,
	setCashAmount,
	setSbpAmount,
	setDepositAmount,
	setCertificateAmount,
	insuranceAmount = 0,
	setInsuranceAmount,
}) => {
	return (
		<div
			className="dente-filter-chips flex items-center gap-1.5 flex-wrap p-2 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line-subtle,var(--border,#cbd5e1))]"
			data-testid="fiscal-presets-strip"
		>
			<span className="text-[12px] font-semibold text-[var(--muted,#64748b)] mr-1 flex items-center gap-1 shrink-0">
				<Sparkles size={13} className="text-[var(--teal,#0d9488)]" />
				<span>Пресеты:</span>
			</span>
			<button
				type="button"
				onClick={() => {
					applyCombinedPaymentPreset("exact_cash");
					setPaymentMode("cash");
				}}
				className="dente-filter-chip flex items-center gap-1"
				data-testid="preset-exact-cash"
				title="Оплатить наличными ровно в сумме чека (без сдачи)"
			>
				<Banknote size={13} className="text-emerald-600 shrink-0" />
				<span>Без сдачи</span>
			</button>
			<button
				type="button"
				onClick={() => {
					applyCombinedPaymentPreset("full_card");
					setPaymentMode("card");
				}}
				className="dente-filter-chip flex items-center gap-1"
				data-testid="preset-full-card"
				title="Оплатить 100% картой через терминал"
			>
				<CreditCard size={13} className="text-blue-600 shrink-0" />
				<span>100% карта</span>
			</button>
			<button
				type="button"
				onClick={() => {
					applyCombinedPaymentPreset("split_cash_card");
					setPaymentMode("split");
				}}
				className="dente-filter-chip flex items-center gap-1"
				data-testid="preset-50-50-cash-card"
				title="Разделить оплату ровно пополам: 50% наличные + 50% карта"
			>
				<Layers size={13} className="text-purple-600 shrink-0" />
				<span>50/50 Нал+Карта</span>
			</button>
			<button
				type="button"
				onClick={() => {
					setSelectedDiscountPreset("warranty_100");
					setCardAmount(0);
					setCashAmount(0);
					setSbpAmount(0);
					setDepositAmount(0);
					setCertificateAmount(0);
					setInsuranceAmount(0);
					setPaymentMode("split");
					showToast(
						"Применен пресет: Гарантия 100% (0 ₽, внутренний гарантийный акт)",
						"info",
						2500,
					);
				}}
				className={`dente-filter-chip flex items-center gap-1 ${
					selectedDiscountPreset === "warranty_100" ? "active" : ""
				}`}
				data-testid="preset-warranty-100"
				title="Гарантийная переделка 100% (0 ₽, внутренний гарантийный акт)"
			>
				<ShieldCheck
					size={13}
					className={
						selectedDiscountPreset === "warranty_100"
							? "text-[var(--teal)] shrink-0"
							: "text-purple-600 shrink-0"
					}
				/>
				<span>Гарантия (0 ₽)</span>
			</button>
			<button
				type="button"
				onClick={() => {
					selectSingleMethod("insurance");
					setPaymentMode("split");
					showToast(
						"Применено 100% покрытие по ДМС (безналичный расчёт со страховой)",
						"info",
						2000,
					);
				}}
				className={`dente-filter-chip flex items-center gap-1 ${
					insuranceAmount > 0 && insuranceAmount === totalSumRub ? "active" : ""
				}`}
				data-testid="preset-full-dms"
				title="Оплата 100% через ДМС (по безналичному расчету со страховой компанией)"
			>
				<ShieldCheck
					size={13}
					className={
						insuranceAmount > 0 && insuranceAmount === totalSumRub
							? "text-[var(--teal)] shrink-0"
							: "text-sky-600 shrink-0"
					}
				/>
				<span>100% ДМС</span>
			</button>
			<button
				type="button"
				onClick={() => {
					applyCombinedPaymentPreset("split_dms");
					setPaymentMode("split");
				}}
				className={`dente-filter-chip flex items-center gap-1 ${
					insuranceAmount > 0 && insuranceAmount < totalSumRub ? "active" : ""
				}`}
				data-testid="preset-split-dms"
				title="Сплит ДМС: страховая компания покрывает основную часть (акт для СК), пациент доплачивает франшизу (кассовый чек)"
			>
				<Layers size={13} className="text-teal-600 shrink-0" />
				<span>Сплит ДМС</span>
			</button>
			<button
				type="button"
				onClick={handleManualCardTerminalConfirm}
				disabled={isSubmittingManualCard}
				title={
					isSubmittingManualCard
						? "Фиксация..."
						: "Зафиксировать оплату в CRM без повторного списания с карты"
				}
				className="h-7 px-2 rounded-lg text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-50 hover:border-blue-500 cursor-pointer transition-all shadow-2xs active:scale-95 flex items-center gap-1"
				data-testid="preset-manual-card-confirm"
			>
				<CreditCard size={12} className="text-blue-600 shrink-0" />
				<span>Карта вручную</span>
			</button>
			{patientDepositRub > 0 && (
				<button
					type="button"
					onClick={() => {
						applyCombinedPaymentPreset("advance_card");
						setPaymentMode("split");
					}}
					className="h-7 px-2 rounded-lg text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-50 hover:border-teal-500 cursor-pointer transition-all shadow-2xs active:scale-95"
					title="Зачесть доступный депозит, а остаток списать с карты"
				>
					Аванс + Карта
				</button>
			)}
			{patientDepositRub > 0 && (
				<button
					type="button"
					onClick={() => {
						applyCombinedPaymentPreset("advance_cash");
						setPaymentMode("split");
					}}
					className="h-7 px-2 rounded-lg text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 hover:border-emerald-500 cursor-pointer transition-all shadow-2xs active:scale-95"
					title="Зачесть доступный депозит, а остаток принять наличными"
				>
					Аванс + Нал
				</button>
			)}
		</div>
	);
};
