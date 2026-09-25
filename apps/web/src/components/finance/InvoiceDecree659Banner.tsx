/**
 * InvoiceDecree659Banner.tsx — Предупреждение и генерация Дополнительного соглашения
 * по Постановлению Правительства РФ №659 от 30.05.2026 и ст. 16 ЗоЗПП (Upsell Consent Shield).
 */

import React from "react";
import { FileText, ShieldAlert } from "lucide-react";
import { formatKopecksRu } from "@dental/shared";

export interface InvoiceUnapprovedItem {
	readonly itemId: string;
	readonly nameRu: string;
	readonly code804n: string;
	readonly effectiveUnitPriceKopecks: number;
	readonly quantity: number;
}

export interface InvoiceDecree659BannerProps {
	readonly unapprovedItems: readonly InvoiceUnapprovedItem[];
	readonly isCreatingAddendum: boolean;
	readonly onCreateAddendum: () => void | Promise<void>;
}

export const InvoiceDecree659Banner: React.FC<InvoiceDecree659BannerProps> = ({
	unapprovedItems,
	isCreatingAddendum,
	onCreateAddendum,
}) => {
	if (unapprovedItems.length === 0) return null;

	return (
		<div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
			<div className="flex items-center justify-between gap-2 flex-wrap mb-2">
				<div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
					<ShieldAlert
						size={18}
						className="text-amber-600 dark:text-amber-400 shrink-0"
					/>
					<span className="text-sm">
						Постановление Правительства РФ №659 от 30.05.2026 и ст. 16 ЗоЗПП (Upsell Consent Shield)
					</span>
				</div>
				<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40">
					Требуется Дополнительное соглашение
				</span>
			</div>
			<p className="mt-1 leading-relaxed">
				В смету включены платные медицинские услуги, отсутствующие в утвержденном плане лечения пациента. Согласно п. 21-23 Правил предоставления платных медуслуг (ПП РФ №659) и ст. 16 Закона РФ «О защите прав потребителей», оказание и выставление счетов на такие услуги без подписания Дополнительного соглашения строго запрещены.
			</p>
			<div className="mt-2.5 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
				<div className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
					Несогласованные позиции ({unapprovedItems.length}):
				</div>
				<ul className="list-disc pl-5 space-y-0.5 text-[11px]">
					{unapprovedItems.map((it) => (
						<li key={it.itemId}>
							<span className="font-bold text-[var(--ink)]">
								{it.nameRu}
							</span>{" "}
							({it.code804n}) —{" "}
							<span className="font-mono">
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
					className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
				>
					<FileText size={14} />
					{isCreatingAddendum
						? "Формирование соглашения..."
						: "Сформировать Дополнительное соглашение (ДС-2026)"}
				</button>
				<span className="text-[11px] text-amber-700 dark:text-amber-400 italic">
					После оформления документа система разблокирует выписку наряда и счета
				</span>
			</div>
		</div>
	);
};
