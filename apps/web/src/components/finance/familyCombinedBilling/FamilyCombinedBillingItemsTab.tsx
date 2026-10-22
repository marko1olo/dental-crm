import React from "react";
import { Award } from "lucide-react";
import { FAMILY_RELATIONSHIP_RU, type CombinedFamilyBillingResult, type FamilyMemberBillingItem } from "@dental/shared";

interface FamilyCombinedBillingItemsTabProps {
	readonly initialItems: readonly FamilyMemberBillingItem[];
	readonly selectedItemIds: Set<string>;
	readonly onToggleItem: (id: string) => void;
	readonly onSelectAll: () => void;
	readonly onDeselectAll: () => void;
	readonly billingResult: CombinedFamilyBillingResult;
}

export function FamilyCombinedBillingItemsTab({
	initialItems, selectedItemIds, onToggleItem, onSelectAll, onDeselectAll, billingResult,
}: FamilyCombinedBillingItemsTabProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="text-xs font-bold text-[var(--muted,#64748b)]">Выберите позиции членов семьи для включения в чек:</div>
				<div className="flex items-center gap-2">
					<button type="button" onClick={onSelectAll} className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer">
						Выбрать все ({initialItems.length})
					</button>
					<span>·</span>
					<button type="button" onClick={onDeselectAll} className="text-xs font-semibold text-[var(--muted,#64748b)] hover:underline cursor-pointer">
						Снять выбор
					</button>
				</div>
			</div>

			<div className="rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] overflow-hidden shadow-xs divide-y divide-[var(--line,#e2e8f0)]">
				{initialItems.length === 0 ? (
					<div className="p-8 text-center text-xs text-[var(--muted,#64748b)]">В семейной группе пока нет счетов для оплаты.</div>
				) : (
					initialItems.map((item) => {
						const isSelected = selectedItemIds.has(item.id);
						return (
							<div key={item.id} onClick={() => onToggleItem(item.id)} className={`p-3.5 sm:p-4 transition-colors cursor-pointer flex items-start justify-between gap-3 ${isSelected ? "bg-teal-50/40 dark:bg-teal-950/20" : "bg-[var(--paper,#ffffff)] opacity-60 hover:opacity-100"}`}>
								<div className="flex items-start gap-3 min-w-0 flex-1">
									<input type="checkbox" checked={isSelected} onChange={() => onToggleItem(item.id)} className="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer shrink-0" />
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="font-extrabold text-xs sm:text-sm text-[var(--ink,#0f172a)]">{item.patientFullName}</span>
											<span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-[var(--muted,#64748b)]">{FAMILY_RELATIONSHIP_RU[item.relationship] || "Семья"}</span>
											{item.toothNumber && <span className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-teal-500/10 text-teal-700 dark:text-teal-300">Зуб {item.toothNumber}</span>}
											<span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-[var(--muted,#64748b)] bg-slate-50 dark:bg-slate-900 border border-[var(--line,#e2e8f0)]">{item.code804n}</span>
										</div>
										<div className="text-xs text-[var(--ink,#0f172a)] font-medium mt-1 truncate min-w-0" title={item.serviceName}>{item.serviceName}</div>
									</div>
								</div>
								<div className="text-right shrink-0">
									<div className="font-mono font-black text-sm sm:text-base text-[var(--ink,#0f172a)]">{(item.priceRub * item.quantity).toLocaleString("ru-RU")} ₽</div>
									<div className="mt-1">
										{item.taxDeductionCategory === "2" ? (
											<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"><Award size={10} /> Код 02</span>
										) : (
											<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">Код 01</span>
										)}
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>

			<div className="p-4 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div>
					<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase">Всего к оплате</span>
					<div className="text-xl font-black font-mono text-[var(--ink,#0f172a)] mt-0.5">{billingResult.totalAmountRub.toLocaleString("ru-RU")} ₽</div>
				</div>
				<div>
					<span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase">Код 01: Стандартное</span>
					<div className="text-lg font-bold font-mono text-blue-700 dark:text-blue-300 mt-0.5">{billingResult.code01TotalRub.toLocaleString("ru-RU")} ₽</div>
					<span className="text-[10px] text-[var(--muted,#64748b)]">Лимит 150 000 ₽ / год</span>
				</div>
				<div>
					<span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">Код 02: Дорогостоящее</span>
					<div className="text-lg font-bold font-mono text-amber-700 dark:text-amber-300 mt-0.5">{billingResult.code02TotalRub.toLocaleString("ru-RU")} ₽</div>
					<span className="text-[10px] text-[var(--muted,#64748b)]">Без ограничений по сумме</span>
				</div>
			</div>
		</div>
	);
}
