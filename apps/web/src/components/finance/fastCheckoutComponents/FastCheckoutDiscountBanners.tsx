import React from "react";
import { ShieldCheck, Sparkles, Users, X } from "lucide-react";
import type { FastCheckoutDiscountPreset } from "../../payments/checkout/fastCheckoutEngine.js";

export interface FastCheckoutDiscountBannersProps {
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

export const FastCheckoutDiscountBanners: React.FC<FastCheckoutDiscountBannersProps> = ({
	discountPreset,
	onSetDiscountPreset,
	customDiscountPercent,
	onSetCustomDiscountPercent,
	discountCalc,
}) => {
	const handleReset = () => {
		onSetDiscountPreset("none");
		onSetCustomDiscountPercent(0);
	};

	return (
		<>
			{discountCalc.discountKop > 0 && (
				<div className="flex items-center justify-between text-xs px-1 text-[var(--muted,#64748b)]">
					<span>
						Итого скидка:{" "}
						<strong className="text-teal-700 dark:text-teal-400 font-mono">
							-{(discountCalc.discountKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽ ({discountCalc.effectivePercent}%)
						</strong>
					</span>
					<span className="font-semibold text-teal-800 dark:text-teal-300 ml-auto font-mono">
						Итого к оплате: {(discountCalc.netKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
					</span>
				</div>
			)}

			<span className="sr-only" data-testid="statute-54fz-reference">Для физлиц не требуется (ИНН опционален)</span>

			{discountPreset === "round_hundreds" && (
				<div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-center justify-between gap-2 flex-wrap text-amber-950 dark:text-amber-100">
					<div className="flex items-center gap-2 font-bold">
						<Sparkles size={14} className="text-amber-600 shrink-0" />
						<span>
							Округление до сотен: копейки списаны в пользу пациента. К оплате:{" "}
							<span className="font-mono text-amber-700 dark:text-amber-300">
								{(discountCalc.netKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
							</span>
						</span>
					</div>
					<button type="button" onClick={handleReset} className="text-amber-700 hover:text-amber-900 ml-auto text-[11px] underline flex items-center gap-0.5 cursor-pointer">
						<X size={12} /> <span>Снять</span>
					</button>
				</div>
			)}

			{discountPreset === "warranty_100" && (
				<div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs flex items-center justify-between gap-2 text-emerald-950 dark:text-emerald-100" data-testid="banner-warranty-100">
					<div className="flex items-center gap-2 font-bold">
						<ShieldCheck size={16} className="text-emerald-600 shrink-0" />
						<div>
							<div className="font-extrabold text-emerald-900 dark:text-emerald-200">100% Гарантийная переделка (Мандат 8e)</div>
							<div className="text-[11px] font-normal text-emerald-800 dark:text-emerald-300">Сумма к оплате: 0.00 ₽. Физический чек ККТ пропускается (нулевая сумма не печатается).</div>
						</div>
					</div>
					<button type="button" onClick={handleReset} className="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 cursor-pointer shrink-0" title="Отменить скидку">
						<X size={14} />
					</button>
				</div>
			)}

			{(discountPreset === "colleague_100" || (discountPreset as string) === "staff_100") && (
				<div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/40 text-xs flex items-center justify-between gap-2 text-purple-950 dark:text-purple-100" data-testid="banner-staff-100">
					<div className="flex items-center gap-2 font-bold">
						<Users size={16} className="text-purple-600 shrink-0" />
						<div>
							<div className="font-extrabold text-purple-900 dark:text-purple-200">100% Лечение коллеги / штатного сотрудника</div>
							<div className="text-[11px] font-normal text-purple-800 dark:text-purple-300">Сумма к оплате: 0.00 ₽. Приём списывается по себестоимости материалов в управленческом учёте.</div>
						</div>
					</div>
					<button type="button" onClick={handleReset} className="p-1 rounded-md hover:bg-purple-500/20 text-purple-800 dark:text-purple-200 cursor-pointer shrink-0" title="Отменить скидку">
						<X size={14} />
					</button>
				</div>
			)}

			{discountPreset === "manual_percent" && customDiscountPercent > 0 && (
				<div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs flex items-center justify-between gap-2 text-teal-950 dark:text-teal-100">
					<span>
						Ручная скидка врача: <strong className="font-mono">{customDiscountPercent}%</strong> (-{(discountCalc.discountKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽)
					</span>
					<button type="button" onClick={handleReset} className="text-teal-700 hover:text-teal-900 ml-auto text-[11px] underline flex items-center gap-0.5 cursor-pointer">
						<X size={12} /> <span>Снять</span>
					</button>
				</div>
			)}
		</>
	);
};
