/**
 * MissingPriceBannerAlert.tsx — Спокойная панель индивидуальной оценки услуги.
 * Никаких панических красных баннеров (Мандат 8e, Мандат 8am).
 */

import React from "react";
import { Coins } from "lucide-react";
import { MissingPriceBannerActions } from "./MissingPriceBannerActions";
import type { MissingPriceBannerAlertProps } from "./missingPriceHub/types";

export const MissingPriceBannerAlert: React.FC<MissingPriceBannerAlertProps> = ({
	item,
	state,
	basePrice,
	onApplyBasePrice,
	className = "",
}) => {
	const { error } = state;
	const displayCode = item.serviceCode || item.code804n;

	return (
		<div
			className={`missing-price-alert-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-xl border bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] text-xs transition-all shadow-2xs ${className}`.trim()}
			data-testid={`missing-price-alert-${item.id}`}
		>
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="p-1.5 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] shrink-0">
					<Coins size={15} />
				</div>
				<div className="flex flex-col min-w-0">
					<div className="font-semibold text-[var(--ink)] leading-snug">
						Индивидуальная цена услуги
					</div>
					<div className="text-[11px] text-[var(--muted,#64748b)] truncate">
						{displayCode ? `${displayCode} · ` : ""}{item.name}
					</div>
				</div>
			</div>

			<MissingPriceBannerActions
				item={item}
				state={state}
				basePrice={basePrice}
				onApplyBasePrice={onApplyBasePrice}
			/>

			{error && (
				<div className="w-full text-[11px] text-rose-600 font-bold sm:hidden">{error}</div>
			)}
		</div>
	);
};

export default MissingPriceBannerAlert;
