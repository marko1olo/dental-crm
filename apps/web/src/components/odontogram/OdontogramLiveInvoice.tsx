import {
	Calculator,
	Check,
	Coins,
	FileSpreadsheet,
	Layers,
	Minus,
	Percent,
	Plus,
	Printer,
	Receipt,
	ShieldCheck,
	Trash2,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { FiscalReceipt54FzModal } from "../finance/FiscalReceipt54FzModal";
import type { ToothData } from "./ToothChart";
import {
	type LiveInvoiceItem,
	type LiveInvoiceCashierExport,
	ORDER_804N_PROCEDURES,
	calculateLiveInvoiceItems,
} from "./odontogramLiveInvoiceCalculations";

export * from "./odontogramLiveInvoiceCalculations";

export interface OdontogramLiveInvoiceProps {
	teethData: readonly ToothData[];
	isOpen: boolean;
	onClose: () => void;
	onGenerateTreatmentPlan?: ((items: LiveInvoiceItem[]) => void) | undefined;
	onCreateInvoice?: ((invoice: LiveInvoiceCashierExport) => void) | undefined;
	onPrintEstimate?: (() => void) | undefined;
	patientId?: string | undefined;
	patientName?: string | undefined;
	className?: string | undefined;
}

export const OdontogramLiveInvoice: React.FC<OdontogramLiveInvoiceProps> = ({
	teethData,
	isOpen,
	onClose,
	onGenerateTreatmentPlan,
	onCreateInvoice,
	onPrintEstimate,
	patientId,
	patientName = "Пациент",
	className = "",
}) => {
	const [excludedKeys, setExcludedKeys] = useState<Set<string>>(() => new Set());
	const [quantities, setQuantities] = useState<Record<string, number>>({});
	const [discountPercent, setDiscountPercent] = useState<number>(0);
	const [customDiscountRub, setCustomDiscountRub] = useState<number>(0);
	const [isDiscountCustom, setIsDiscountCustom] = useState<boolean>(false);
	const [isFiscalModalOpen, setIsFiscalModalOpen] = useState<boolean>(false);
	const [visibleItemsLimit, setVisibleItemsLimit] = useState<number>(30);

	// Auto-compute treatment items based on affected teeth (including pediatrics and periodontics)
	const baseItems = useMemo(() => {
		return calculateLiveInvoiceItems(teethData, {
			excludedKeys,
			quantities,
			discountPercent,
		});
	}, [teethData, excludedKeys, quantities, discountPercent]);

	// Windowed slice for low-spec HDD laptops to prevent rendering hundreds of unvirtualized DOM nodes
	const visibleBaseItems = useMemo(() => {
		return baseItems.slice(0, visibleItemsLimit);
	}, [baseItems, visibleItemsLimit]);

	// Category breakdowns
	const categoryBreakdown = useMemo(() => {
		const map: Record<string, { count: number; subtotal: number }> = {};
		for (const item of baseItems) {
			const current = map[item.category] ?? { count: 0, subtotal: 0 };
			current.count += item.quantity;
			current.subtotal += item.price * item.quantity;
			map[item.category] = current;
		}
		return map;
	}, [baseItems]);

	// Gross total before discount
	const grossTotalPrice = useMemo(() => {
		return baseItems.reduce(
			(acc, item) => acc + item.price * item.quantity,
			0,
		);
	}, [baseItems]);

	// Calculated total discount
	const totalDiscountRub = useMemo(() => {
		if (isDiscountCustom) {
			return Math.min(grossTotalPrice, customDiscountRub);
		}
		if (discountPercent <= 0) return 0;
		const grossKop = Math.round(grossTotalPrice * 100);
		const discKop = Math.round((grossKop * discountPercent) / 100);
		return discKop / 100;
	}, [grossTotalPrice, discountPercent, isDiscountCustom, customDiscountRub]);

	// Net total after discount
	const netTotalPrice = useMemo(() => {
		return Math.max(0, grossTotalPrice - totalDiscountRub);
	}, [grossTotalPrice, totalDiscountRub]);

	const handleExcludeItem = (itemKey: string) => {
		setExcludedKeys((prev) => {
			const next = new Set(prev);
			next.add(itemKey);
			return next;
		});
	};

	const handleUpdateQty = (itemKey: string, delta: number) => {
		setQuantities((prev) => {
			const current = prev[itemKey] ?? 1;
			const next = Math.max(1, Math.min(20, current + delta));
			return { ...prev, [itemKey]: next };
		});
	};

	const handleSetQuickDiscount = (pct: number) => {
		setIsDiscountCustom(false);
		setDiscountPercent(pct);
	};

	const handleExportToPlan = () => {
		if (baseItems.length === 0) {
			showToast("Смета пуста: нет позиций для экспорта", "warning", 3000);
			return;
		}
		if (onGenerateTreatmentPlan) {
			onGenerateTreatmentPlan(baseItems);
		}
		showToast(
			`Смета успешно экспортирована в план лечения: ${baseItems.length} позиций на сумму ${netTotalPrice.toLocaleString("ru-RU")} ₽`,
			"success",
			4000,
		);
	};

	const handleCreateInvoice = () => {
		if (baseItems.length === 0) {
			showToast("Смета пуста: отметьте зубы на формуле", "warning", 3000);
			return;
		}

		const invoiceData: LiveInvoiceCashierExport = {
			...(patientId ? { patientId } : {}),
			...(patientName ? { patientName } : {}),
			items: baseItems,
			grossTotalRub: grossTotalPrice,
			discountRub: totalDiscountRub,
			netTotalRub: netTotalPrice,
			discountPercent: isDiscountCustom
				? Math.round((totalDiscountRub / (grossTotalPrice || 1)) * 100)
				: discountPercent,
			createdAtIso: new Date().toISOString(),
		};

		if (onCreateInvoice) {
			onCreateInvoice(invoiceData);
		}

		showToast(
			`Счет на оплату (${netTotalPrice.toLocaleString("ru-RU")} ₽) успешно выставлен кассиру!`,
			"success",
			5000,
		);
	};

	const handlePrint = () => {
		if (onPrintEstimate) {
			onPrintEstimate();
		} else {
			window.print();
		}
	};

	if (!isOpen) return null;

	return (
		<aside
			className={`odontogram-live-invoice-panel flex flex-col bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)] rounded-2xl shadow-2xl transition-all duration-300 w-full sm:max-w-md overflow-hidden ${className}`.trim()}
			data-testid="odontogram-live-invoice"
			aria-label="Живая смета и план лечения"
		>
			{/* Header */}
			<div className="flex items-center justify-between p-3.5 border-b border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]">
				<div className="flex items-center gap-2">
					<div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
						<Coins size={18} />
					</div>
					<div>
						<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
							<span>Живая смета лечения</span>
							<span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-mono font-bold border border-cyan-500/20">
								{baseItems.length} поз.
							</span>
						</h3>
						<p className="text-xs text-[var(--muted,#64748b)]">
							Каталог услуг · Авторасчет по зубной формуле
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] sm:min-h-[32px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#ffffff)] transition-colors cursor-pointer"
					title="Скрыть смету"
					aria-label="Закрыть смету"
				>
					<X size={18} />
				</button>
			</div>

			{/* Category Sub-total Badges */}
			{Object.keys(categoryBreakdown).length > 0 && (
				<div className="px-3 py-2 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--border,#cbd5e1)] flex flex-wrap items-center gap-1.5 text-xs">
					<span className="text-[var(--muted,#64748b)] font-semibold flex items-center gap-1">
						<Layers size={12} /> Разделы:
					</span>
					{Object.entries(categoryBreakdown).map(([cat, stat]) => (
						<span
							key={cat}
							className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] font-medium"
						>
							<span>{cat}:</span>
							<strong className="text-emerald-600 dark:text-emerald-400 font-mono">
								{stat.subtotal.toLocaleString("ru-RU")} ₽
							</strong>
						</span>
					))}
				</div>
			)}

			{/* 1-Click Discount Toolbar */}
			{baseItems.length > 0 && (
				<div className="px-3.5 py-2 bg-[var(--paper-strong,var(--paper,#ffffff))] border-b border-[var(--border,#cbd5e1)] flex items-center justify-between gap-2 text-xs">
					<span className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1">
						<Percent size={12} /> Скидка:
					</span>

					<div className="flex items-center gap-1 overflow-x-auto pb-0.5">
						{[0, 5, 10, 15, 20, 50, 100].map((pct) => (
							<button
								key={pct}
								type="button"
								onClick={() => handleSetQuickDiscount(pct)}
								className={`min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-md font-mono text-xs font-bold border transition-all cursor-pointer ${
									!isDiscountCustom && discountPercent === pct
										? pct === 100
											? "bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400"
											: "bg-teal-600 text-white border-teal-700 shadow-xs"
										: "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] border-[var(--border,#cbd5e1)] hover:text-[var(--ink,#0f172a)]"
								}`}
								title={pct === 100 ? "100% скидка на гарантийную переделку или персонал" : `Скидка ${pct}%`}
							>
								{pct === 0 ? "0%" : pct === 100 ? "100% (Гарантия)" : `${pct}%`}
							</button>
						))}
					</div>
				</div>
			)}

			{/* List of Invoice Items */}
			<div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[380px]">
				{baseItems.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center text-[var(--muted,#64748b)]">
						<Calculator size={36} className="mb-2 opacity-40 text-cyan-600 dark:text-cyan-400" />
						<p className="text-sm font-semibold text-[var(--ink,#0f172a)]">Все зубы интактны (здоровы)</p>
						<p className="text-xs max-w-xs mt-1 text-[var(--muted,#64748b)]">
							Отметьте патологии на формуле, чтобы позиции автоматически добавились в смету
						</p>
					</div>
				) : (
					<>
						{visibleBaseItems.map((item) => {
							const itemKey = `${item.toothNumber}-${item.code}`;
							const itemSubtotal = item.price * item.quantity;

							return (
								<div
									key={itemKey}
									className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-[var(--paper-soft,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] hover:border-cyan-500/50 hover:bg-[var(--paper-strong,var(--paper,#ffffff))] transition-all"
								>
									<div className="flex flex-col gap-0.5 flex-1 min-w-0">
										<div className="flex items-center gap-1.5 flex-wrap">
											<span className="text-xs font-black text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 font-mono">
												#{item.toothNumber}
											</span>
											<span className="text-xs text-[var(--muted,#64748b)] font-mono font-semibold">
												{item.code}
											</span>
											<span className="text-xs px-1.5 py-0.2 rounded-md bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#64748b)] font-bold border border-[var(--border,#cbd5e1)]">
												{item.category}
											</span>
										</div>
										<span className="text-xs font-medium text-[var(--ink,#0f172a)] line-clamp-2">
											{item.title}
										</span>
										<div className="flex items-center gap-2 mt-1">
											{/* Quantity +/- controls */}
											<div className="flex items-center gap-1 bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] rounded-md px-1 py-0.5">
												<button
													type="button"
													onClick={() => handleUpdateQty(itemKey, -1)}
													className="min-h-[44px] sm:min-h-[32px] min-w-[44px] flex items-center justify-center p-1 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
													title="Уменьшить количество"
													aria-label={`Уменьшить количество для зуба ${item.toothNumber}`}
												>
													<Minus size={13} />
												</button>
												<span className="text-xs font-mono font-bold px-1.5">
													{item.quantity}
												</span>
												<button
													type="button"
													onClick={() => handleUpdateQty(itemKey, 1)}
													className="min-h-[44px] sm:min-h-[32px] min-w-[44px] flex items-center justify-center p-1 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
													title="Увеличить количество"
													aria-label={`Увеличить количество для зуба ${item.toothNumber}`}
												>
													<Plus size={13} />
												</button>
											</div>

											<button
												type="button"
												onClick={() => handleExcludeItem(itemKey)}
												className="min-h-[44px] sm:min-h-[32px] px-2 text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer ml-1"
												title="Исключить из сметы"
											>
												<Trash2 size={12} />
												<span>Убрать</span>
											</button>
										</div>
									</div>

									<div className="text-right shrink-0">
										<span className="text-sm font-bold text-[var(--ink,#0f172a)] font-mono">
											{itemSubtotal.toLocaleString("ru-RU")} ₽
										</span>
										{item.quantity > 1 && (
											<div className="text-xs text-[var(--muted,#64748b)] font-mono font-semibold">
												{item.price.toLocaleString("ru-RU")} ₽/ед.
											</div>
										)}
									</div>
								</div>
							);
						})}

						{baseItems.length > visibleItemsLimit && (
							<div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--paper-soft,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-xs">
								<span className="text-[var(--muted,#64748b)] font-medium">
									Показано {visibleBaseItems.length} из {baseItems.length} позиций
								</span>
								<div className="flex items-center gap-1.5">
									<button
										type="button"
										onClick={() => setVisibleItemsLimit((prev) => prev + 30)}
										className="px-2.5 py-1 rounded bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors cursor-pointer"
									>
										Загрузить ещё 30
									</button>
									<button
										type="button"
										onClick={() => setVisibleItemsLimit(baseItems.length)}
										className="px-2 py-1 rounded bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] font-medium border border-[var(--border,#cbd5e1)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors cursor-pointer"
									>
										Все ({baseItems.length})
									</button>
								</div>
							</div>
						)}
					</>
				)}
			</div>

			{/* Summary Footer */}
			<div className="p-3.5 border-t border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-3">
				{/* Breakdown Row */}
				<div className="space-y-1">
					{totalDiscountRub > 0 && (
						<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] font-medium">
							<span>Сумма без скидки:</span>
							<span className="line-through font-mono">
								{grossTotalPrice.toLocaleString("ru-RU")} ₽
							</span>
						</div>
					)}

					{totalDiscountRub > 0 && (
						<div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
							<span>Скидка ({discountPercent}%):</span>
							<span className="font-mono">
								−{totalDiscountRub.toLocaleString("ru-RU")} ₽
							</span>
						</div>
					)}

					<div className="flex items-center justify-between text-sm font-bold pt-1 border-t border-[var(--border,#cbd5e1)]">
						<span className="text-[var(--ink,#0f172a)]">Итого к оплате:</span>
						<span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
							{netTotalPrice.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>

				{/* 4 Main Action Buttons */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
					{/* Create Cashier Invoice */}
					<button
						type="button"
						onClick={handleCreateInvoice}
						className="min-h-[44px] sm:min-h-[32px] flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 active:scale-95"
						title="Создать официальный счет на оплату в кассу"
					>
						<Receipt size={15} />
						<span>В кассу</span>
					</button>

					{/* 54-FZ Fiscal Receipt */}
					<button
						type="button"
						onClick={() => setIsFiscalModalOpen(true)}
						className="min-h-[44px] sm:min-h-[32px] flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-md shadow-teal-600/20 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 active:scale-95"
						title="Принять оплату (карты, СБП, наличные) и выдать кассовый чек"
					>
						<ShieldCheck size={15} />
						<span>Кассовый чек</span>
					</button>

					{/* Export to Comprehensive Plan */}
					<button
						type="button"
						onClick={handleExportToPlan}
						className="min-h-[44px] sm:min-h-[32px] flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 shadow-md shadow-teal-600/20 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 active:scale-95"
						title="Перенести услуги сметы в комплексный план лечения пациента"
					>
						<Zap size={15} />
						<span>В план</span>
					</button>

					{/* Print */}
					<button
						type="button"
						onClick={handlePrint}
						className="min-h-[44px] sm:min-h-[32px] flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 active:scale-95"
						title="Распечатать смету или сохранить в PDF"
					>
						<Printer size={15} />
						<span>Печать</span>
					</button>
				</div>
			</div>

			{/* 54-FZ Fiscal Receipt Modal */}
			{isFiscalModalOpen && (
				<FiscalReceipt54FzModal
					isOpen={isFiscalModalOpen}
					items={baseItems.map((it, idx) => ({
						id: `live-inv-${idx}-${it.toothNumber}`,
						toothNumber: it.toothNumber,
						code804n: it.code,
						name: it.title,
						category: it.category,
						unitPriceRub: it.price,
						priceRub: it.price * it.quantity - (it.discountRub || 0),
						quantity: it.quantity,
						discountRub: it.discountRub || 0,
						phase: 1,
						stageKind: "stage_1_therapy" as const,
					}))}
					patientId={patientId || "patient-001"}
					patientName={patientName}
					onClose={() => setIsFiscalModalOpen(false)}
					onReceiptFiscalized={(receiptNum) => {
						showToast(
							`Чек №${receiptNum} на сумму ${netTotalPrice.toLocaleString("ru-RU")} ₽ успешно пробит`,
							"success",
						);
					}}
				/>
			)}
		</aside>
	);
};
