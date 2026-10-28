import React from "react";
import { Banknote, ChevronDown, Coins, CreditCard, Layers, QrCode, ShieldCheck, Users, Zap } from "lucide-react";
import type { QuickCheckoutPresetType } from "../../payments/checkout/fastCheckoutEngine.js";

export interface FastCheckoutQuickPresetsGridProps {
	readonly familyPayerName?: string | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly onQuickPreset: (preset: QuickCheckoutPresetType) => void;
}

export const FastCheckoutQuickPresetsGrid: React.FC<FastCheckoutQuickPresetsGridProps> = ({
	familyPayerName = "",
	patientFamilyBalanceRub = 0,
	onQuickPreset,
}) => {
	return (
		<details
			className="group rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-teal-500/30 shadow-xs"
			data-testid="quick-presets-section"
			open
		>
			<summary className="p-2 px-3 flex items-center justify-between cursor-pointer select-none text-xs list-none [&::-webkit-details-marker]:hidden">
				<div className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-200">
					<Zap size={14} className="text-amber-500 fill-amber-500 shrink-0" />
					<span>Быстрые способы оплаты</span>
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
					<ChevronDown size={14} className="transition-transform duration-200 group-open:rotate-180" />
				</div>
			</summary>
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 pt-1">
				<button
					type="button"
					onClick={() => onQuickPreset("100_card")}
					className="min-h-[44px] sm:min-h-[36px] sm:h-9 min-w-0 px-2.5 py-1 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] hover:border-[var(--line-strong,#94a3b8)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
					data-testid="btn-checkout-100-card"
					title="Оплатить 100% банковской картой через терминал"
				>
					<CreditCard size={14} className="shrink-0 text-[var(--muted,#64748b)]" />
					<span className="truncate">Картой 100%</span>
				</button>
				<button
					type="button"
					onClick={() => onQuickPreset("100_cash")}
					className="min-h-[44px] sm:min-h-[36px] sm:h-9 min-w-0 px-2.5 py-1 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] hover:border-[var(--line-strong,#94a3b8)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
					data-testid="btn-checkout-100-cash"
					title="Оплатить 100% наличными ровно в кассу без сдачи"
				>
					<Banknote size={14} className="shrink-0 text-[var(--muted,#64748b)]" />
					<span className="truncate sm:hidden">Наличные 100%</span>
					<span className="truncate hidden sm:inline">Без сдачи (Нал 100%)</span>
				</button>
				<button
					type="button"
					onClick={() => onQuickPreset("100_sbp")}
					className="min-h-[44px] sm:min-h-[36px] sm:h-9 min-w-0 px-2.5 py-1 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] hover:border-[var(--line-strong,#94a3b8)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
					data-testid="btn-checkout-100-sbp"
					title="Оплатить 100% по СБП QR"
				>
					<QrCode size={14} className="shrink-0 text-[var(--muted,#64748b)]" />
					<span className="truncate">СБП QR 100%</span>
				</button>
				<button
					type="button"
					onClick={() => onQuickPreset("use_deposit")}
					className="min-h-[44px] sm:min-h-[36px] sm:h-9 min-w-0 px-2.5 py-1 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] hover:border-[var(--line-strong,#94a3b8)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
					data-testid="btn-checkout-use-deposit"
					title="Списать аванс / депозит пациента с зачетом аванса и доплатой картой"
				>
					<Coins size={14} className="shrink-0 text-[var(--muted,#64748b)]" />
					<span className="truncate">Аванс + Карта</span>
				</button>
				<button
					type="button"
					onClick={() => onQuickPreset("deposit_cash")}
					className="min-h-[44px] sm:min-h-[36px] sm:h-9 min-w-0 px-2.5 py-1 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] hover:border-[var(--line-strong,#94a3b8)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
					data-testid="btn-checkout-deposit-cash"
					title="Списать аванс / депозит пациента с доплатой наличными"
				>
					<Coins size={14} className="shrink-0 text-[var(--muted,#64748b)]" />
					<span className="truncate">Аванс + Нал</span>
				</button>
				<button
					type="button"
					onClick={() => onQuickPreset("split_50_50")}
					className="min-h-[44px] sm:min-h-[36px] sm:h-9 min-w-0 px-2.5 py-1 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] hover:border-[var(--line-strong,#94a3b8)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
					data-testid="btn-checkout-split-50-50"
					title="Разделить 50/50: половина картой, половина наличными (без копеечного дрейфа)"
				>
					<Layers size={14} className="shrink-0 text-[var(--muted,#64748b)]" />
					<span className="truncate sm:hidden">50% Карта / Нал</span>
					<span className="truncate hidden sm:inline">50% Карта + 50% Нал</span>
				</button>
				<button
					type="button"
					onClick={() => onQuickPreset("split_three_way")}
					className="min-h-[44px] sm:min-h-[36px] sm:h-9 min-w-0 px-2.5 py-1 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] hover:border-[var(--line-strong,#94a3b8)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
					data-testid="btn-checkout-split-three-way"
					title={`Комбинированная оплата: Аванс родственника (${familyPayerName}) + 50% Карта + 50% Нал`}
				>
					<Users size={14} className="shrink-0 text-[var(--muted,#64748b)]" />
					<span className="truncate sm:hidden" data-testid="preset-three-way-split">Сплит: 3 способа</span>
					<span className="truncate hidden sm:inline" data-testid="preset-three-way-split">Нал + Карта + Аванс</span>
				</button>
				<button
					type="button"
					onClick={() => onQuickPreset("warranty_100")}
					className="min-h-[44px] sm:min-h-[36px] sm:h-9 min-w-0 px-2.5 py-1 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] hover:border-[var(--line-strong,#94a3b8)] text-[var(--ink,#0f172a)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
					data-testid="btn-checkout-warranty-100"
					title="100% гарантийная переделка (к оплате 0 ₽)"
				>
					<ShieldCheck size={14} className="shrink-0 text-[var(--muted,#64748b)]" />
					<span className="truncate sm:hidden">Гарантия (0 ₽)</span>
					<span className="truncate hidden sm:inline">100% Гарантия (0 ₽)</span>
				</button>
			</div>
		</details>
	);
};
