import React from "react";
import {
	Banknote,
	CreditCard,
	QrCode,
	ShieldCheck,
	Sparkles,
	Tag,
	RotateCcw,
	CheckCircle2,
	Layers,
	Receipt,
	ShoppingBag,
	Plus,
} from "lucide-react";
import type { PaymentMethodTab } from "../../finance/PaymentModal.js";
import type {
	PayerLegalType,
	TenderAllocationTarget,
	InnValidationResult,
	CheckoutResult,
} from "./types.js";
import {
	CASHBOX_AMOUNT_PRESETS,
	CASHBOX_DISCOUNT_PRESETS,
	CASHBOX_54FZ_STATUS_BADGE,
} from "./cashboxConstants.js";

export interface CashboxQuickActionsBarProps {
	readonly grossAmountRub: number;
	readonly setGrossAmountRub: (amount: number) => void;
	readonly onAddAmountPreset: (rub: number) => void;
	readonly discountPercent: number;
	readonly setDiscountPercent: (pct: number) => void;
	readonly isWarranty: boolean;
	readonly setIsWarranty: (warranty: boolean) => void;
	readonly isStaffColleague: boolean;
	readonly setIsStaffColleague: (staff: boolean) => void;
	readonly onResetDiscount: () => void;
	readonly onOpenRetailModal: () => void;
	readonly payerType: PayerLegalType;
	readonly setPayerType: (type: PayerLegalType) => void;
	readonly buyerInn: string;
	readonly setBuyerInn: (inn: string) => void;
	readonly innValidation: InnValidationResult;
	readonly checkoutResult: CheckoutResult;
	readonly isSubmittingZeroReceipt: boolean;
	readonly onProcessZeroDiscountCheckout: () => Promise<void>;
	readonly onAllocateAll: (target: TenderAllocationTarget) => void;
	readonly onOpenPaymentWithMethod: (method: PaymentMethodTab) => void;
}

export function CashboxQuickActionsBar({
	grossAmountRub,
	setGrossAmountRub,
	onAddAmountPreset,
	discountPercent,
	setDiscountPercent,
	isWarranty,
	setIsWarranty,
	isStaffColleague,
	setIsStaffColleague,
	onResetDiscount,
	onOpenRetailModal,
	payerType,
	setPayerType,
	buyerInn,
	setBuyerInn,
	innValidation,
	checkoutResult,
	isSubmittingZeroReceipt,
	onProcessZeroDiscountCheckout,
	onAllocateAll,
	onOpenPaymentWithMethod,
}: CashboxQuickActionsBarProps): React.JSX.Element {
	return (
		<div className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3 sm:p-4 shadow-xs">
			{/* 1-Row Compact Toolbar (32-36px, Mandates 8c, 8d, 8p) */}
			<div className="cashbox-toolbar min-h-[36px] h-9 max-h-9 flex items-center justify-between gap-2 px-1 pb-2 border-b border-[var(--line)] mb-3 flex-nowrap overflow-hidden select-none">
				<div className="flex items-center gap-2 min-w-0">
					<Banknote className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
					<h2 className="text-sm font-bold text-[var(--ink)] truncate m-0">
						Касса и чеки
					</h2>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<span
						className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--ok-bg,rgba(16,185,129,0.1))] text-[var(--ok-fg,#10b981)] border border-[var(--ok-fg,rgba(16,185,129,0.2))] whitespace-nowrap"
						title={CASHBOX_54FZ_STATUS_BADGE.tooltip}
					>
						<ShieldCheck className="w-3.5 h-3.5 shrink-0" />
						<span>{CASHBOX_54FZ_STATUS_BADGE.text}</span>
					</span>
				</div>
			</div>

			{/* Amount Entry & Quick Presets Row */}
			<div
				className="mb-3 p-3 bg-[var(--paper-soft,#f8fafc)] rounded-lg border border-[var(--line)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
				style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
			>
				<div className="flex-1 min-w-[220px]">
					<label htmlFor="gross-amount-input" className="block text-xs font-semibold text-[var(--ink)] mb-1">
						Сумма к расчету (брутто):
					</label>
					<div className="relative" style={{ position: "relative" }}>
						<input
							id="gross-amount-input"
							type="number"
							min="0"
							step="1"
							value={grossAmountRub || ""}
							onChange={(e) => {
								const val = parseFloat(e.target.value);
								setGrossAmountRub(isNaN(val) ? 0 : Math.max(0, val));
							}}
							placeholder="Введите сумму в рублях"
							className="w-full text-base font-bold font-mono px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,var(--brand-primary))]"
							style={{ paddingRight: 44 }}
						/>
						<span className="absolute right-7 top-2 text-xs font-bold text-[var(--muted)] pointer-events-none" style={{ position: "absolute", right: 30, top: 9, pointerEvents: "none" }}>₽</span>
					</div>
				</div>

				{/* Fast Amount Preset Chips */}
				<div className="flex items-center gap-2 flex-wrap" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
					{CASHBOX_AMOUNT_PRESETS.map((preset) => (
						<button
							key={preset}
							type="button"
							onClick={() => onAddAmountPreset(preset)}
							className="secondary-button text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1"
							style={{
								height: 34,
								padding: "0 12px",
								borderRadius: 8,
								border: "1px solid var(--line)",
								background: "var(--paper)",
								color: "var(--ink)",
								display: "inline-flex",
								alignItems: "center",
								gap: 4,
								fontWeight: 600,
							}}
							title={`Добавить +${preset.toLocaleString("ru-RU")} ₽`}
						>
							<Plus className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
							<span>{preset.toLocaleString("ru-RU")} ₽</span>
						</button>
					))}

					{grossAmountRub > 0 && (
						<button
							type="button"
							onClick={() => setGrossAmountRub(0)}
							className="secondary-button text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1"
							style={{
								height: 34,
								padding: "0 12px",
								borderRadius: 8,
								border: "1px solid var(--line)",
								background: "var(--paper)",
								color: "var(--muted)",
								display: "inline-flex",
								alignItems: "center",
								gap: 4,
								fontWeight: 600,
							}}
							title="Очистить сумму"
						>
							<RotateCcw className="w-3.5 h-3.5" />
							<span>Сброс</span>
						</button>
					)}
				</div>
			</div>

			{/* Doctor Discount Autonomy Row (Up to 100% without admin password, Mandates 8c, 8e) */}
			<div
				className="mb-3 px-3 py-2 bg-[var(--paper-soft,#f8fafc)] rounded-lg border border-[var(--line)] flex items-center justify-between gap-2 flex-wrap select-none"
				style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}
			>
				<div className="flex items-center gap-2 flex-wrap" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
					<div className="text-xs font-bold text-[var(--ink)] shrink-0 flex items-center gap-1.5 whitespace-nowrap" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
						<Tag className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
						<span>Скидки врача:</span>
					</div>

					<button
						type="button"
						style={{
							height: 30,
							padding: "0 10px",
							borderRadius: 8,
							border: isWarranty ? "1px solid var(--teal, #0d9488)" : "1px solid var(--line)",
							background: isWarranty ? "var(--teal, #0d9488)" : "var(--paper)",
							color: isWarranty ? "#ffffff" : "var(--ink)",
							fontWeight: 600,
							fontSize: 12,
						}}
						onClick={() => {
							setIsWarranty(!isWarranty);
							setIsStaffColleague(false);
						}}
					>
						100% Гарантия
					</button>

					<button
						type="button"
						style={{
							height: 30,
							padding: "0 10px",
							borderRadius: 8,
							border: isStaffColleague ? "1px solid var(--teal, #0d9488)" : "1px solid var(--line)",
							background: isStaffColleague ? "var(--teal, #0d9488)" : "var(--paper)",
							color: isStaffColleague ? "#ffffff" : "var(--ink)",
							fontWeight: 600,
							fontSize: 12,
						}}
						onClick={() => {
							setIsStaffColleague(!isStaffColleague);
							setIsWarranty(false);
						}}
					>
						100% Персонал
					</button>

					{CASHBOX_DISCOUNT_PRESETS.map((pct) => {
						const active = discountPercent === pct && !isWarranty && !isStaffColleague;
						return (
							<button
								key={pct}
								type="button"
								style={{
									height: 30,
									padding: "0 10px",
									borderRadius: 8,
									border: active ? "1px solid var(--teal, #0d9488)" : "1px solid var(--line)",
									background: active ? "var(--teal, #0d9488)" : "var(--paper)",
									color: active ? "#ffffff" : "var(--ink)",
									fontWeight: 600,
									fontSize: 12,
								}}
								onClick={() => {
									setDiscountPercent(discountPercent === pct ? 0 : pct);
									setIsWarranty(false);
									setIsStaffColleague(false);
								}}
							>
								{pct}%
							</button>
						);
					})}

					{(isWarranty || isStaffColleague || discountPercent > 0) && (
						<button
							type="button"
							style={{
								height: 30,
								padding: "0 8px",
								borderRadius: 8,
								border: "none",
								background: "transparent",
								color: "var(--muted)",
								textDecoration: "underline",
								fontSize: 12,
							}}
							onClick={onResetDiscount}
						>
							Сбросить
						</button>
					)}
				</div>

				{/* 1-Click Retail Showcase Button for Front Desk (Curaprox, Marvis, Gift Certificates) */}
				<div className="shrink-0 flex items-center">
					<button
						type="button"
						onClick={onOpenRetailModal}
						style={{
							height: 32,
							padding: "0 12px",
							borderRadius: 8,
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							display: "inline-flex",
							alignItems: "center",
							gap: 6,
							fontWeight: 600,
							fontSize: 12,
						}}
						data-testid="btn-open-retail-showcase"
						title="Витрина сопутствующих товаров ресепшена (Curaprox, Marvis, подарочные сертификаты)"
					>
						<ShoppingBag className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
						<span>Витрина товаров</span>
					</button>
				</div>
			</div>

			{/* Payer Type & 54-FZ INN Logic */}
			<div
				className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3"
				style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 12 }}
			>
				<div>
					<label className="block text-xs font-medium text-[var(--muted)] mb-1">
						Тип плательщика
					</label>
					<div className="flex gap-2" style={{ display: "flex", gap: 8 }}>
						<button
							type="button"
							style={{
								flex: 1,
								height: 36,
								padding: "0 12px",
								borderRadius: 8,
								border: payerType === "physical_person" ? "1px solid var(--teal, #0d9488)" : "1px solid var(--line)",
								background: payerType === "physical_person" ? "var(--teal, #0d9488)" : "var(--paper)",
								color: payerType === "physical_person" ? "#ffffff" : "var(--ink)",
								fontWeight: 600,
								fontSize: 12,
							}}
							onClick={() => setPayerType("physical_person")}
						>
							Физическое лицо (без ИНН)
						</button>
						<button
							type="button"
							style={{
								flex: 1,
								height: 36,
								padding: "0 12px",
								borderRadius: 8,
								border: payerType === "legal_entity" ? "1px solid var(--teal, #0d9488)" : "1px solid var(--line)",
								background: payerType === "legal_entity" ? "var(--teal, #0d9488)" : "var(--paper)",
								color: payerType === "legal_entity" ? "#ffffff" : "var(--ink)",
								fontWeight: 600,
								fontSize: 12,
							}}
							onClick={() => setPayerType("legal_entity")}
						>
							Юрлицо (ИНН 10 цифр)
						</button>
					</div>
				</div>

				<div>
					<label htmlFor="cashbox-inn-input" className="block text-xs font-medium text-[var(--muted)] mb-1">
						ИНН плательщика {payerType === "physical_person" ? "(опционально)" : "(обязательно)"}
					</label>
					<input
						id="cashbox-inn-input"
						type="text"
						value={buyerInn}
						onChange={(e) => setBuyerInn(e.target.value)}
						placeholder={
							payerType === "physical_person"
								? "Не требуется для оплаты (только для справки 13% НДФЛ)"
								: "10 или 12 цифр"
						}
						className="w-full text-xs px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,var(--brand-primary))]"
						style={{ height: 36 }}
					/>
					{innValidation.errorRu && (
						<p className="text-[11px] text-[var(--warning-fg)] mt-1">{innValidation.errorRu}</p>
					)}
				</div>
			</div>

			{/* Financial Summary & 1-Click Tenders */}
			<div className="bg-[var(--paper-soft,#f8fafc)] border border-[var(--line)] rounded-xl p-3">
				<div className="flex items-center justify-between mb-2.5" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
					<span className="text-xs text-[var(--muted)] font-semibold uppercase">Итого к оплате:</span>
					<span className="text-xl font-black font-mono text-[var(--ink)]">
						{checkoutResult.totalNetRub.toLocaleString("ru-RU")} ₽
					</span>
				</div>

				{checkoutResult.isZeroDue ? (
					<div
						className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2.5 rounded-lg bg-[var(--ok-bg,rgba(16,185,129,0.1))] border border-[var(--ok-fg,rgba(16,185,129,0.2))] mb-2"
						style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}
					>
						<div className="text-xs text-[var(--ok-fg,#10b981)] font-medium">
							{checkoutResult.statusBannerText}
						</div>
						<button
							type="button"
							onClick={onProcessZeroDiscountCheckout}
							disabled={isSubmittingZeroReceipt}
							style={{
								height: 36,
								padding: "0 16px",
								borderRadius: 8,
								border: "1px solid var(--teal, #0d9488)",
								background: "var(--teal, #0d9488)",
								color: "#ffffff",
								display: "inline-flex",
								alignItems: "center",
								gap: 6,
								fontWeight: 700,
								fontSize: 12,
							}}
						>
							<CheckCircle2 className="w-4 h-4" />
							<span>{isSubmittingZeroReceipt ? "Оформление..." : "Оформить чек 0 ₽"}</span>
						</button>
					</div>
				) : null}

				<div
					className="flex flex-wrap gap-2"
					style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}
				>
					{!checkoutResult.isZeroDue && (
						<>
							<button
								type="button"
								style={{
									height: 40,
									padding: "0 12px",
									borderRadius: 8,
									border: "1px solid var(--teal, #0d9488)",
									background: "var(--teal, #0d9488)",
									color: "#ffffff",
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									gap: 6,
									fontWeight: 700,
									fontSize: 12,
								}}
								onClick={() => {
									onAllocateAll("card");
									onOpenPaymentWithMethod("card_terminal");
								}}
							>
								<CreditCard className="w-4 h-4 shrink-0" />
								<span>Всё картой</span>
							</button>

							<button
								type="button"
								style={{
									height: 40,
									padding: "0 12px",
									borderRadius: 8,
									border: "1px solid var(--line)",
									background: "var(--paper)",
									color: "var(--ink)",
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									gap: 6,
									fontWeight: 600,
									fontSize: 12,
								}}
								onClick={() => {
									onAllocateAll("cash");
									onOpenPaymentWithMethod("cash");
								}}
							>
								<Banknote className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span>Всё наличными</span>
							</button>

							<button
								type="button"
								style={{
									height: 40,
									padding: "0 12px",
									borderRadius: 8,
									border: "1px solid var(--line)",
									background: "var(--paper)",
									color: "var(--ink)",
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									gap: 6,
									fontWeight: 600,
									fontSize: 12,
								}}
								onClick={() => {
									onAllocateAll("sbp");
									onOpenPaymentWithMethod("sbp_qr");
								}}
							>
								<QrCode className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span>Всё по СБП</span>
							</button>
						</>
					)}

					<button
						type="button"
						style={{
							height: 40,
							padding: "0 12px",
							borderRadius: 8,
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 6,
							fontWeight: 600,
							fontSize: 12,
						}}
						onClick={() => onOpenPaymentWithMethod("card_terminal")}
						data-testid="btn-open-fast-checkout-modal"
						title="Оформление оплаты и чека 54-ФЗ"
					>
						<Receipt className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
						<span>Чек 54-ФЗ</span>
					</button>

					<button
						type="button"
						style={{
							height: 40,
							padding: "0 12px",
							borderRadius: 8,
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 6,
							fontWeight: 600,
							fontSize: 12,
						}}
						onClick={() => onOpenPaymentWithMethod("split")}
						data-testid="btn-open-split-modal"
						title="Комбинированная сплит-оплата (несколько способов)"
					>
						<Layers className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
						<span>Сплит-оплата</span>
					</button>

					<button
						type="button"
						style={{
							height: 40,
							padding: "0 12px",
							borderRadius: 8,
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 6,
							fontWeight: 600,
							fontSize: 12,
						}}
						onClick={() => onOpenPaymentWithMethod("split")}
						data-testid="btn-open-payment-modal"
						title="Универсальное окно сплит-оплаты и терминала"
					>
						<Sparkles className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
						<span>Терминал / Сплит</span>
					</button>
				</div>
			</div>
		</div>
	);
}
