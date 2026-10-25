/**
 * OwnerPriceListHeader.tsx
 *
 * Шапка секции прейскуранта владельца клиники с кнопкой сброса и бейджем льготы НДС.
 * Модуль декомпозирован согласно Мандату 8b (строго <= 120 строк).
 */

import React from "react";
import { Coins, ShieldCheck } from "lucide-react";

export interface OwnerPriceListHeaderProps {
	readonly overridesCount: number;
	readonly onResetOverrides: () => void;
}

export const OwnerPriceListHeader: React.FC<OwnerPriceListHeaderProps> = ({
	overridesCount,
	onResetOverrides,
}) => {
	return (
		<div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-[var(--line)]">
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 rounded-lg bg-[var(--teal-soft)] flex items-center justify-center text-[var(--teal-dark)]">
					<Coins size={18} />
				</div>
				<div>
					<h3 className="m-0 text-base font-bold text-[var(--ink)]">
						Прейскурант услуг и калькуляция маржинальности
					</h3>
					<p className="m-0 text-xs text-[var(--muted)]">
						Каталог медицинских процедур. Прозрачный учет себестоимости материалов и лаборатории ЗТЛ.
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				{overridesCount > 0 && (
					<button
						type="button"
						onClick={onResetOverrides}
						className="secondary-button text-xs py-1 px-2.5 min-h-[36px] cursor-pointer rounded-xl font-medium"
					>
						Сбросить правки ({overridesCount})
					</button>
				)}
				<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
					<ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
					Без НДС (Медицинские услуги)
				</span>
			</div>
		</div>
	);
};
