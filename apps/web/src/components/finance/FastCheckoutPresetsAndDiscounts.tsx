import React from "react";
import {
	Zap,
	ChevronDown,
	CreditCard,
	Banknote,
	QrCode,
	Coins,
	Layers,
	Users,
	ShieldCheck,
	Sparkles,
	X,
} from "lucide-react";
import type {
	QuickCheckoutPresetType,
	FastCheckoutDiscountPreset,
} from "../payments/checkout/fastCheckoutEngine";

export interface FastCheckoutPresetsAndDiscountsProps {
	readonly familyPayerName?: string | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly onQuickPreset: (preset: QuickCheckoutPresetType) => void;
	readonly discountPreset: FastCheckoutDiscountPreset;
	readonly onSetDiscountPreset: (preset: FastCheckoutDiscountPreset) => void;
	readonly customDiscountPercent: number;
	readonly onSetCustomDiscountPercent: (percent: number) => void;
	readonly discountCalc: {
		readonly discountKop: number;
		readonly netKop: number;
		readonly effectivePercent: number;
	};
}

export const FastCheckoutPresetsAndDiscounts: React.FC<FastCheckoutPresetsAndDiscountsProps> = ({
	familyPayerName = "",
	patientFamilyBalanceRub = 0,
	onQuickPreset,
	discountPreset,
	onSetDiscountPreset,
	customDiscountPercent,
	onSetCustomDiscountPercent,
	discountCalc,
}) => {
	return (
		<div className="space-y-3" data-testid="fast-checkout-presets-and-discounts-root">
			{/* Быстрые 1-клик сценарии оплаты (Свобода кассира & Mandate 8e, 8p) */}
			<details
				className="group rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-teal-500/30 shadow-xs"
				data-testid="quick-presets-section"
				open
			>
				<summary className="p-2 px-3 flex items-center justify-between cursor-pointer select-none text-xs list-none [&::-webkit-details-marker]:hidden">
					<div className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-200">
						<Zap size={14} className="text-amber-500 fill-amber-500 shrink-0" />
						<span>Быстрые 1-клик сценарии оплаты (0 барьеров)</span>
						<span className="text-[11px] font-normal text-[var(--muted,#64748b)] hidden sm:inline">
							• Картой 100%, Нал, СБП, 50/50, Аванс
							{familyPayerName ? ` (${familyPayerName})` : ""}
							{patientFamilyBalanceRub > 0
								? ` [${patientFamilyBalanceRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽]`
								: ""}
						</span>
					</div>
					<div className="flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-300 font-semibold">
						<span className="group-open:hidden text-[11px]">8 пресетов</span>
						<ChevronDown
							size={14}
							className="transition-transform duration-200 group-open:rotate-180"
						/>
					</div>
				</summary>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 pt-1">
					<button
						type="button"
						onClick={() => onQuickPreset("100_card")}
						className="min-h-[40px] min-w-0 px-2 py-1.5 rounded-xl border-2 border-blue-500/40 bg-[var(--paper,#ffffff)] hover:bg-blue-500/15 text-blue-700 dark:text-blue-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
						data-testid="btn-checkout-100-card"
						title="Оплатить 100% банковской картой через терминал"
					>
						<CreditCard size={14} className="shrink-0 text-blue-600" />
						<span className="truncate">Картой 100%</span>
					</button>
					<button
						type="button"
						onClick={() => onQuickPreset("100_cash")}
						className="min-h-[40px] min-w-0 px-2 py-1.5 rounded-xl border-2 border-emerald-500/40 bg-[var(--paper,#ffffff)] hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
						data-testid="btn-checkout-100-cash"
						title="Оплатить 100% наличными ровно в кассу без сдачи"
					>
						<Banknote size={14} className="shrink-0 text-emerald-600" />
						<span className="truncate">Без сдачи (Нал 100%)</span>
					</button>
					<button
						type="button"
						onClick={() => onQuickPreset("100_sbp")}
						className="min-h-[40px] min-w-0 px-2 py-1.5 rounded-xl border-2 border-teal-500/40 bg-[var(--paper,#ffffff)] hover:bg-teal-500/15 text-teal-700 dark:text-teal-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
						data-testid="btn-checkout-100-sbp"
						title="Оплатить 100% по СБП QR"
					>
						<QrCode size={14} className="shrink-0 text-teal-600" />
						<span className="truncate">СБП QR 100%</span>
					</button>
					<button
						type="button"
						onClick={() => onQuickPreset("use_deposit")}
						className="min-h-[40px] min-w-0 px-2 py-1.5 rounded-xl border-2 border-amber-500/40 bg-[var(--paper,#ffffff)] hover:bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
						data-testid="btn-checkout-use-deposit"
						title="Списать аванс / депозит пациента с зачетом аванса и доплатой картой"
					>
						<Coins size={14} className="shrink-0 text-amber-600" />
						<span className="truncate">Аванс + Карта</span>
					</button>
					<button
						type="button"
						onClick={() => onQuickPreset("deposit_cash")}
						className="min-h-[40px] min-w-0 px-2 py-1.5 rounded-xl border-2 border-emerald-500/40 bg-[var(--paper,#ffffff)] hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
						data-testid="btn-checkout-deposit-cash"
						title="Списать аванс / депозит пациента с доплатой наличными"
					>
						<Coins size={14} className="shrink-0 text-emerald-600" />
						<span className="truncate">Аванс + Нал</span>
					</button>
					<button
						type="button"
						onClick={() => onQuickPreset("split_50_50")}
						className="min-h-[40px] min-w-0 px-2 py-1.5 rounded-xl border-2 border-purple-500/40 bg-[var(--paper,#ffffff)] hover:bg-purple-500/15 text-purple-700 dark:text-purple-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
						data-testid="btn-checkout-split-50-50"
						title="Разделить 50/50: половина картой, половина наличными (без копеечного дрейфа)"
					>
						<Layers size={14} className="shrink-0 text-purple-600" />
						<span className="truncate">50% Карта + 50% Нал</span>
					</button>
					<button
						type="button"
						onClick={() => onQuickPreset("split_three_way")}
						className="min-h-[40px] min-w-0 px-2 py-1.5 rounded-xl border-2 border-indigo-500/40 bg-[var(--paper,#ffffff)] hover:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
						data-testid="btn-checkout-split-three-way"
						title={`Комбинированная оплата в 1 клик: Аванс родственника (${familyPayerName}) + 50% Карта + 50% Нал`}
					>
						<Users size={14} className="shrink-0 text-indigo-600" />
						<span className="truncate">Нал + Карта + Аванс</span>
					</button>
					<button
						type="button"
						onClick={() => onQuickPreset("warranty_100")}
						className="min-h-[40px] min-w-0 px-2 py-1.5 rounded-xl border-2 border-blue-500/40 bg-[var(--paper,#ffffff)] hover:bg-blue-500/15 text-blue-700 dark:text-blue-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
						data-testid="btn-checkout-warranty-100"
						title="100% гарантийная переделка (к оплате 0 ₽, без паролей и блокировок)"
					>
						<ShieldCheck size={14} className="shrink-0 text-blue-600" />
						<span className="truncate">100% Гарантия (0 ₽)</span>
					</button>
				</div>
			</details>

			{/* Скидки врача и Гарантийные переделки (Мандат 8e: Doctor Autonomy & 8p) */}
			<details
				className="group rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] shadow-xs"
				data-testid="checkout-doctor-discounts-section"
				open={discountPreset !== "none" || discountCalc.discountKop > 0}
			>
				<summary className="p-2 px-3 flex items-center justify-between cursor-pointer select-none text-xs list-none [&::-webkit-details-marker]:hidden">
					<div className="flex items-center gap-1.5 font-bold text-[var(--muted,#64748b)]">
						<Sparkles size={14} className="text-teal-600 shrink-0" />
						<span className="text-[var(--ink,#0f172a)] font-bold">Скидки врача и Гарантия</span>
						{discountCalc.discountKop > 0 ? (
							<span className="text-xs font-bold font-mono text-teal-700 dark:text-teal-300 ml-1">
								• {(discountCalc.discountKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽ ({discountCalc.effectivePercent}%)
							</span>
						) : (
							<span className="text-[11px] font-normal text-[var(--muted,#64748b)] hidden sm:inline">
								• До сотен ₽, 3%, 5%, 10%, Гарантия, Персонал
							</span>
						)}
					</div>
					<div className="flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-300 font-semibold">
						<span className="group-open:hidden text-[11px]">
							{discountCalc.discountKop > 0 ? "Изменить" : "Развернуть (8)"}
						</span>
						<ChevronDown
							size={14}
							className="transition-transform duration-200 group-open:rotate-180"
						/>
					</div>
				</summary>
				<div className="p-3 pt-1 flex flex-col gap-2">
					<div className="flex items-center gap-1.5 flex-wrap">
						<button
							type="button"
							onClick={() => onSetDiscountPreset("round_hundreds")}
							className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
								discountPreset === "round_hundreds"
									? "bg-amber-600 text-white shadow-2xs ring-2 ring-amber-400"
									: "bg-[var(--paper,#ffffff)] hover:bg-amber-500/10 text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
							}`}
							data-testid="btn-discount-round-hundreds"
							title="Округлить сумму чека до сотен рублей (скидка на копейки в пользу пациента)"
						>
							<Sparkles size={13} className="text-amber-500" />
							<span>До сотен ₽</span>
						</button>
						<button
							type="button"
							onClick={() => onSetDiscountPreset("discount_3")}
							className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
								discountPreset === "discount_3"
									? "bg-teal-600 text-white shadow-2xs"
									: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
							}`}
							data-testid="btn-discount-3"
						>
							3%
						</button>
						<button
							type="button"
							onClick={() => onSetDiscountPreset("discount_5")}
							className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
								discountPreset === "discount_5"
									? "bg-teal-600 text-white shadow-2xs"
									: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
							}`}
							data-testid="btn-discount-5"
						>
							5%
						</button>
						<button
							type="button"
							onClick={() => onSetDiscountPreset("discount_10")}
							className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
								discountPreset === "discount_10"
									? "bg-teal-600 text-white shadow-2xs"
									: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
							}`}
							data-testid="btn-discount-10"
						>
							10%
						</button>
						<button
							type="button"
							onClick={() => onSetDiscountPreset("warranty_100")}
							className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
								discountPreset === "warranty_100"
									? "bg-blue-600 text-white shadow-2xs ring-2 ring-blue-400"
									: "bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800"
							}`}
							data-testid="btn-discount-warranty"
							title="100% гарантийная переделка (к оплате 0 ₽, без блокировок)"
						>
							<ShieldCheck size={14} className="shrink-0" />
							<span>100% Гарантия</span>
						</button>
						<button
							type="button"
							onClick={() => onSetDiscountPreset("colleague_100")}
							className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
								discountPreset === "colleague_100"
									? "bg-purple-600 text-white shadow-2xs ring-2 ring-purple-400"
									: "bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800"
							}`}
							data-testid="btn-discount-colleague"
							title="100% скидка для коллег и медицинского персонала"
						>
							<span>Персонал 100%</span>
						</button>
						<button
							type="button"
							onClick={() => onSetDiscountPreset("manual_percent")}
							className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
								discountPreset === "manual_percent"
									? "bg-teal-700 text-white shadow-2xs"
									: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
							}`}
							data-testid="btn-discount-manual-percent"
						>
							Ручная %
						</button>
						{discountPreset !== "none" && (
							<button
								type="button"
								onClick={() => {
									onSetDiscountPreset("none");
									onSetCustomDiscountPercent(0);
								}}
								className="min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] hover:bg-[var(--line,#cbd5e1)] text-[var(--muted,#64748b)] border border-[var(--line,#cbd5e1)] cursor-pointer transition-all active:scale-95 flex items-center gap-1"
								data-testid="btn-discount-none"
								title="Сбросить скидку"
							>
								<X size={14} className="inline mr-1 shrink-0" />
								<span>Сброс (0%)</span>
							</button>
						)}
					</div>

					{/* Banners for active discounts */}
					{discountPreset === "round_hundreds" && (
						<div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-center justify-between gap-2 flex-wrap text-amber-950 dark:text-amber-100">
							<div className="flex items-center gap-2 font-bold">
								<Sparkles size={14} className="text-amber-600 shrink-0" />
								<span>
									Округление до сотен: копейки списаны в пользу пациента. К оплате:{" "}
									{(discountCalc.netKop / 100).toLocaleString("ru-RU", {
										minimumFractionDigits: 2,
									})}{" "}
									₽
								</span>
							</div>
							<span className="text-[11px] font-mono text-amber-700 dark:text-amber-300">
								Касса / Точность до копейки
							</span>
						</div>
					)}
					{discountPreset === "warranty_100" && (
						<div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs flex items-center justify-between gap-2 flex-wrap text-blue-950 dark:text-blue-100">
							<div className="flex items-center gap-2 font-bold">
								<ShieldCheck size={14} className="text-blue-600 shrink-0" />
								<span>100% Гарантийная переделка: стоимость списана в 0 ₽</span>
							</div>
							<span className="text-[11px] font-mono text-blue-700 dark:text-blue-300">
								Чек 0 ₽ / Гарантия
							</span>
						</div>
					)}
					{discountPreset === "colleague_100" && (
						<div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs flex items-center justify-between gap-2 flex-wrap text-purple-950 dark:text-purple-100">
							<div className="flex items-center gap-2 font-bold">
								<ShieldCheck size={14} className="text-purple-600 shrink-0" />
								<span>100% Скидка сотруднику: лечение персонала</span>
							</div>
							<span className="text-[11px] font-mono text-purple-700 dark:text-purple-300">
								Чек 0 ₽ / Персонал
							</span>
						</div>
					)}
					{discountPreset === "manual_percent" && (
						<div className="flex items-center gap-2 pt-1">
							<label className="text-xs font-semibold text-[var(--muted,#64748b)]">
								Процент скидки врача (%):
							</label>
							<input
								type="number"
								min={0}
								max={100}
								value={customDiscountPercent || ""}
								onChange={(e) =>
									onSetCustomDiscountPercent(
										Math.max(0, Math.min(100, Number(e.target.value) || 0))
									)
								}
								className="min-h-[38px] sm:min-h-0 sm:h-7 w-20 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink)] text-xs font-bold text-right"
								placeholder="0"
								data-testid="input-custom-discount-percent"
							/>
							<span className="text-xs font-bold">%</span>
						</div>
					)}
				</div>
			</details>
		</div>
	);
};
