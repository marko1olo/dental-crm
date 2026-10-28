/**
 * TaxExemptionBanner.tsx — Согласование дополнительных манипуляций у кресла («Освобождение от НДС по медицинским услугам»).
 * Mandates 8e & 8x & 8ao & 8ap: Doctor autonomy, zero blocking barriers, no raw decree/law numbers.
 */

import { formatKopecksRu } from "@dental/shared";
import { FileText, ShieldCheck } from "lucide-react";
import type React from "react";

export interface TaxExemptionUnapprovedItem {
	readonly itemId: string;
	readonly nameRu: string;
	readonly code804n?: string | undefined;
	readonly effectiveUnitPriceKopecks: number;
	readonly quantity: number;
}

export type InvoiceUnapprovedItem = TaxExemptionUnapprovedItem;

export interface TaxExemptionBannerProps {
	readonly unapprovedItems: readonly TaxExemptionUnapprovedItem[];
	readonly isCreatingAddendum: boolean;
	readonly onCreateAddendum: () => void | Promise<void>;
}

export type InvoiceTaxDecreeBannerProps = TaxExemptionBannerProps;
export type InvoiceDecree659BannerProps = TaxExemptionBannerProps;

export const TaxExemptionBanner: React.FC<TaxExemptionBannerProps> = ({
	unapprovedItems,
	isCreatingAddendum,
	onCreateAddendum,
}) => {
	if (unapprovedItems.length === 0) return null;

	return (
		<div
			className="mb-4 p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-950 dark:text-teal-100 text-xs shadow-xs"
			data-testid="chairside-additional-services-banner"
		>
			<div className="flex items-center justify-between gap-2 flex-wrap mb-2">
				<div className="flex items-center gap-2 font-bold text-teal-800 dark:text-teal-300">
					<ShieldCheck
						size={18}
						className="text-teal-600 dark:text-teal-400 shrink-0"
					/>
					<span className="text-sm">
						Дополнительные медицинские услуги у кресла (без НДС)
					</span>
				</div>
				<span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-800 dark:text-teal-200 border border-teal-500/40">
					Включены в акт приёма (1 клик)
				</span>
			</div>
			<p className="mt-1 leading-relaxed text-[var(--ink,#0f172a)] opacity-90">
				В смету включены дополнительные манипуляции, выполненные врачом во время приёма.
				Они освобождены от НДС как медицинские услуги, согласованы в рамках клинической автономии врача
				и автоматически включаются в акт оказанных услуг и счёт на оплату без задержек кассы.
			</p>
			<div className="mt-2.5 p-2.5 rounded-lg bg-[var(--paper-soft,rgba(255,255,255,0.6))] border border-teal-500/20">
				<div className="font-semibold text-teal-800 dark:text-teal-300 mb-1">
					Дополнительные позиции ({unapprovedItems.length}):
				</div>
				<ul className="list-disc pl-5 space-y-0.5 text-[11px] text-[var(--ink,#0f172a)]">
					{unapprovedItems.map((it) => (
						<li key={it.itemId}>
							<span className="font-bold">{it.nameRu}</span>
							{it.code804n ? ` (${it.code804n})` : ""} —{" "}
							<span className="font-mono font-semibold">
								{formatKopecksRu(it.effectiveUnitPriceKopecks)}
							</span>
						</li>
					))}
				</ul>
			</div>
			<div className="mt-3 flex items-center gap-3 flex-wrap">
				<button
					type="button"
					onClick={onCreateAddendum}
					disabled={isCreatingAddendum}
					className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
				>
					<FileText size={14} />
					{isCreatingAddendum
						? "Формирование соглашения..."
						: "Распечатать Доп. соглашение (опционально)"}
				</button>
				<span className="text-[11px] text-teal-700 dark:text-teal-300 italic">
					Счёт и оплата доступны сразу в 1 клик
				</span>
			</div>
		</div>
	);
};

export { TaxExemptionBanner as InvoiceTaxDecreeBanner, TaxExemptionBanner as InvoiceDecree659Banner };
export default TaxExemptionBanner;
