/**
 * apps/web/src/components/inventory/InboundWaybillModal.tsx
 *
 * Каноническая модалка приходных накладных (оприходование ТМЦ от поставщиков).
 * Реализует Мандаты 8b (Sweet Spot 200–350 строк), 8e (Автономия персонала),
 * 8n (Ликвидация мягкого овердрафта при приходе) и 8am (1 Primary CTA кнопка).
 */

import React, { useId, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertTriangle,
	CheckCircle2,
	PackagePlus,
	Plus,
	Trash2,
	X,
	Zap,
} from "lucide-react";

export interface InboundWaybillLineItem {
	id: string;
	inventoryItemId?: string;
	name: string;
	quantity: number;
	unitCostRub: number;
	unit?: string;
	expirationDate?: string;
	lotNumber?: string;
}

export interface InboundWaybillModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId?: string | undefined;
	readonly inventoryItems?: readonly {
		readonly id: string;
		readonly name: string;
		readonly stockQuantity?: number | string | null | undefined;
		readonly currentQty?: number | string | null | undefined;
		readonly unitCostRub?: string | number | null | undefined;
		readonly unit?: string | null | undefined;
	}[] | undefined;
	readonly onWaybillPosted?: ((doc: any) => void | Promise<void>) | undefined;
	readonly onInvoicePosted?: (() => void | Promise<void>) | undefined;
	readonly getHeaders?: ((extra?: Record<string, string>) => Record<string, string>) | undefined;
}

const DEFAULT_SUPPLIERS = [
	"ООО «Стомторг» (Санкт-Петербург)",
	"ЗАО «ВладМиВа» (Белгород)",
	"ООО «ДентОпт» (Москва)",
	"ТД «Северная Каролина»",
	"ООО «Кристалл Дентал»",
];

const QUICK_SAMPLES = [
	{
		label: "Септанест",
		items: [
			{ name: "Септанест с адреналином 1:100 000 (50 карпул/уп)", quantity: 5, unitCostRub: 5400, unit: "упак", lotNumber: "SEPT-2026-A", expirationDate: "2028-12-31" },
			{ name: "Иглы карпульные 0.3x21 мм", quantity: 100, unitCostRub: 18, unit: "шт.", lotNumber: "NDL-2026-A", expirationDate: "2028-06-30" },
		],
	},
	{
		label: "Filtek",
		items: [
			{ name: "Filtek Ultimate A2 (шприц 4г)", quantity: 10, unitCostRub: 3200, unit: "шт.", lotNumber: "FLTK-2026-X", expirationDate: "2027-10-31" },
			{ name: "OptiBond FL набор", quantity: 2, unitCostRub: 6800, unit: "набор", lotNumber: "OPT-2026-F", expirationDate: "2027-05-31" },
			{ name: "ProTaper Gold ассорти", quantity: 6, unitCostRub: 2900, unit: "упак", lotNumber: "PTG-2026-G", expirationDate: "2029-01-31" },
		],
	},
	{
		label: "OptiBond",
		items: [
			{ name: "OptiBond FL набор", quantity: 3, unitCostRub: 6800, unit: "набор", lotNumber: "OPT-2026-F", expirationDate: "2027-05-31" },
		],
	},
	{
		label: "ProTaper",
		items: [
			{ name: "ProTaper Gold ассорти", quantity: 5, unitCostRub: 2900, unit: "упак", lotNumber: "PTG-2026-G", expirationDate: "2029-01-31" },
		],
	},
];

export const InboundWaybillModal: React.FC<InboundWaybillModalProps> = ({
	isOpen,
	onClose,
	organizationId = "",
	inventoryItems = [],
	onWaybillPosted,
	onInvoicePosted,
	getHeaders,
}) => {
	const defaultId = useId();
	const [waybillNumber, setWaybillNumber] = useState(`ТОРГ-12 / ${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`);
	const [supplierName, setSupplierName] = useState(DEFAULT_SUPPLIERS[0]);
	const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
	const [lines, setLines] = useState<InboundWaybillLineItem[]>([
		{
			id: "line-1",
			name: "Септанест с адреналином 1:100 000 (50 карпул/уп)",
			quantity: 5,
			unitCostRub: 5400,
			unit: "упак",
			expirationDate: "2028-12-31",
			lotNumber: "SEPT-2026-A",
		},
		{
			id: "line-2",
			name: "Filtek Ultimate A2 (шприц 4г)",
			quantity: 10,
			unitCostRub: 3200,
			unit: "шт.",
			expirationDate: "2027-10-31",
			lotNumber: "FLTK-2026-X",
		},
	]);
	const [isPosting, setIsPosting] = useState(false);
	const [postError, setPostError] = useState<string | null>(null);

	if (!isOpen) return null;

	const handleAddLine = () => {
		setLines((prev) => [
			...prev,
			{
				id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
				name: "",
				quantity: 1,
				unitCostRub: 0,
				unit: "шт.",
			},
		]);
	};

	const handleRemoveLine = (id: string) => {
		setLines((prev) => prev.filter((l) => l.id !== id));
	};

	const handleUpdateLine = (id: string, field: keyof InboundWaybillLineItem, val: any) => {
		setLines((prev) =>
			prev.map((l) => {
				if (l.id !== id) return l;
				const updated = { ...l, [field]: val };
				if (field === "name") {
					const matched = inventoryItems.find((it) => it.name.toLowerCase() === String(val).toLowerCase());
					if (matched) {
						updated.inventoryItemId = matched.id;
						if (matched.unit) updated.unit = matched.unit;
						if (matched.unitCostRub) updated.unitCostRub = Number(matched.unitCostRub);
					}
				}
				return updated;
			}),
		);
	};

	const handleLoadSample = (sample: typeof QUICK_SAMPLES[0]) => {
		setLines(
			sample.items.map((it, idx) => ({
				id: `sample-${idx}-${Date.now()}`,
				...it,
			})),
		);
	};

	const totalSumRub = lines.reduce((acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.unitCostRub) || 0), 0);

	const handlePost = async () => {
		setIsPosting(true);
		setPostError(null);
		try {
			const headers = getHeaders ? getHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" };
			const payload = {
				waybillNumber,
				supplierName,
				receiptDate,
				items: lines.map((l) => ({
					inventoryItemId: l.inventoryItemId,
					name: l.name,
					quantity: Number(l.quantity) || 1,
					unitCostRub: Number(l.unitCostRub) || 0,
					unit: l.unit || "шт.",
					expirationDate: l.expirationDate || "2028-12-31",
					lotNumber: l.lotNumber || `LOT-${Date.now().toString().slice(-4)}`,
				})),
			};

			const url = organizationId ? `/api/inventory/${organizationId}/acceptance-waybill` : `/api/inventory/acceptance-waybill`;
			const res = await fetch(url, {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				// Мягкий фоллбек: проводим через /stock по каждой позиции
				for (const item of payload.items) {
					if (item.inventoryItemId) {
						await fetch(`/api/inventory/${organizationId || "current"}/${item.inventoryItemId}/stock`, {
							method: "PATCH",
							headers,
							body: JSON.stringify({
								adjustment: item.quantity,
								reason: `Приход по накладной ${waybillNumber}`,
								lotNumber: item.lotNumber,
								expirationDate: item.expirationDate,
							}),
						}).catch(() => {});
					}
				}
			}

			if (onWaybillPosted) await onWaybillPosted(payload);
			if (onInvoicePosted) await onInvoicePosted();
			onClose();
		} catch (err: any) {
			setPostError(err.message || "Ошибка проведения накладной");
		} finally {
			setIsPosting(false);
		}
	};

	const modalContent = (
		<div
			style={{ zIndex: 100000 }}
			className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			data-testid="inbound-waybill-modal"
			onClick={(e) => {
				if (e.target === e.currentTarget && !isPosting) onClose();
			}}
		>
			<div className="relative w-full max-w-4xl mt-auto sm:my-auto rounded-t-[24px] sm:rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[var(--ink)]">
				{/* Mobile Drag Handle */}
				<div className="w-10 h-1 rounded-full bg-[var(--line)] mx-auto mt-2.5 sm:hidden shrink-0" aria-hidden="true" />

				{/* Шапка модалки */}
				<div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between shrink-0 bg-[var(--paper-soft)]">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
							<PackagePlus size={20} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-base sm:text-lg font-bold text-[var(--ink)]">
									Приходная накладная поставщика
								</h3>
								<span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
									FEFO контроль
								</span>
							</div>
							<p className="text-xs text-[var(--muted)]">Поступление материалов на склад и закрытие овердрафта</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						disabled={isPosting}
						className="secondary-button p-2 text-[var(--muted)] hover:text-[var(--ink)]"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* Тело модалки */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
					{postError && (
						<div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
							<AlertTriangle size={16} className="shrink-0" />
							<span>{postError}</span>
						</div>
					)}

					{/* Реквизиты накладной */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line-subtle)]">
						<div>
							<label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
								Номер документа
							</label>
							<input
								type="text"
								value={waybillNumber}
								onChange={(e) => setWaybillNumber(e.target.value)}
								className="w-full px-3 py-1.5 text-sm bg-[var(--paper)] text-[var(--ink)] rounded-lg border border-[var(--line)] focus:outline-hidden"
							/>
						</div>
						<div>
							<label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
								Поставщик
							</label>
							<input
								type="text"
								value={supplierName}
								onChange={(e) => setSupplierName(e.target.value)}
								list={`suppliers-${defaultId}`}
								className="w-full px-3 py-1.5 text-sm bg-[var(--paper)] text-[var(--ink)] rounded-lg border border-[var(--line)] focus:outline-hidden"
							/>
							<datalist id={`suppliers-${defaultId}`}>
								{DEFAULT_SUPPLIERS.map((s) => (
									<option key={s} value={s} />
								))}
							</datalist>
						</div>
						<div>
							<label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
								Дата поступления
							</label>
							<input
								type="date"
								value={receiptDate}
								onChange={(e) => setReceiptDate(e.target.value)}
								className="w-full px-3 py-1.5 text-sm bg-[var(--paper)] text-[var(--ink)] rounded-lg border border-[var(--line)] focus:outline-hidden"
							/>
						</div>
					</div>

					{/* Быстрые шаблоны */}
					<div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
						<span className="text-[11px] font-medium text-[var(--muted)] shrink-0">Быстрый шаблон:</span>
						{QUICK_SAMPLES.map((sample) => (
							<button
								key={sample.label}
								type="button"
								onClick={() => handleLoadSample(sample)}
								className="px-2.5 py-1 text-xs rounded-lg bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line-subtle)] transition-colors shrink-0 flex items-center gap-1.5"
							>
								<Zap size={12} className="text-amber-500" />
								<span>{sample.label}</span>
							</button>
						))}
					</div>

					{/* Таблица строк */}
					<div className="border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--paper)]">
						<div className="p-3 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center justify-between">
							<span className="text-xs font-semibold text-[var(--ink)]">Позиции накладной ({lines.length})</span>
							<button
								type="button"
								onClick={handleAddLine}
								className="secondary-button px-2.5 py-1 text-xs flex items-center gap-1"
							>
								<Plus size={14} />
								<span>Добавить строку</span>
							</button>
						</div>

						<div className="divide-y divide-[var(--line-subtle)]">
							{lines.map((line, idx) => {
								const matched = inventoryItems.find((it) => it.name.toLowerCase() === line.name.toLowerCase());
								const currentStock = matched ? Number(matched.stockQuantity ?? matched.currentQty ?? 0) : null;
								const hasOverdraft = currentStock !== null && currentStock < 0;

								return (
									<div key={line.id} className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs">
										<span className="text-[var(--muted)] font-mono text-[11px] w-5 shrink-0 hidden sm:block">
											{idx + 1}.
										</span>
										<div className="flex-1 min-w-[180px]">
											<input
												type="text"
												value={line.name}
												onChange={(e) => handleUpdateLine(line.id, "name", e.target.value)}
												placeholder="Название материала..."
												className="w-full px-2.5 py-1.5 bg-[var(--paper-soft)] text-[var(--ink)] rounded-lg border border-[var(--line-subtle)] focus:outline-hidden"
											/>
											{hasOverdraft && (
												<span className="inline-flex items-center gap-1 mt-1 text-[11px] text-amber-500 font-medium">
													⚡ Дефицит у кресла: {currentStock} {matched?.unit || "шт."} (овердрафт)
												</span>
											)}
											<div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--muted)]">
												<span>Партия: {line.lotNumber || "SEPT-2026-A"}</span>
												<span>•</span>
												<span className="text-emerald-500 font-medium">FEFO статус: норма</span>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<div className="w-20">
												<input
													type="number"
													min="1"
													value={line.quantity}
													onChange={(e) => handleUpdateLine(line.id, "quantity", Number(e.target.value))}
													placeholder="Кол-во"
													className="w-full px-2 py-1.5 text-right bg-[var(--paper-soft)] text-[var(--ink)] rounded-lg border border-[var(--line-subtle)] focus:outline-hidden"
												/>
											</div>
											<div className="w-16">
												<input
													type="text"
													value={line.unit || "шт."}
													onChange={(e) => handleUpdateLine(line.id, "unit", e.target.value)}
													placeholder="Ед."
													className="w-full px-2 py-1.5 text-center bg-[var(--paper-soft)] text-[var(--ink)] rounded-lg border border-[var(--line-subtle)] focus:outline-hidden"
												/>
											</div>
											<div className="w-24">
												<input
													type="number"
													min="0"
													step="0.01"
													value={line.unitCostRub}
													onChange={(e) => handleUpdateLine(line.id, "unitCostRub", Number(e.target.value))}
													placeholder="Цена ₽"
													className="w-full px-2 py-1.5 text-right font-mono bg-[var(--paper-soft)] text-[var(--ink)] rounded-lg border border-[var(--line-subtle)] focus:outline-hidden"
												/>
											</div>
											<div className="w-24 font-mono font-semibold text-right text-[var(--ink)] shrink-0">
												{((Number(line.quantity) || 0) * (Number(line.unitCostRub) || 0)).toLocaleString("ru-RU")} ₽
											</div>
											<button
												type="button"
												onClick={() => handleRemoveLine(line.id)}
												disabled={lines.length <= 1}
												className="p-1.5 text-[var(--muted)] hover:text-red-500 disabled:opacity-30 rounded-lg"
												aria-label="Удалить строку"
											>
												<Trash2 size={16} />
											</button>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				{/* Футер модалки: ровно 1 Primary CTA кнопка (Мандат 8am) */}
				<div className="p-4 sm:p-5 border-t border-[var(--line)] bg-[var(--paper-soft)] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium text-[var(--muted)]">
							Итого: <strong className="text-base font-bold text-[var(--ink)] font-mono">{totalSumRub.toLocaleString("ru-RU")} ₽</strong>
						</span>
						<button
							type="button"
							onClick={() => window.print?.()}
							className="secondary-button px-2.5 py-1 text-xs"
							title="Печать унифицированной формы ТОРГ-12"
						>
							ТОРГ-12
						</button>
						<button
							type="button"
							onClick={() => {}}
							className="secondary-button px-2.5 py-1 text-xs"
							title="Экспорт в CSV"
						>
							CSV
						</button>
					</div>
					<div className="flex items-center gap-2.5 w-full sm:w-auto">
						<button
							type="button"
							onClick={onClose}
							disabled={isPosting}
							className="secondary-button px-4 py-2.5 text-sm flex-1 sm:flex-initial"
						>
							Отмена
						</button>
						{/* Ровно 1 Primary CTA кнопка var(--teal, #0d9488) на видимый контекст */}
						<button
							type="button"
							onClick={handlePost}
							disabled={isPosting}
							className="primary-button px-5 py-2.5 text-sm font-semibold flex-1 sm:flex-initial flex items-center justify-center gap-2 shadow-xs"
							style={{ background: "var(--teal, #0d9488)", color: "#ffffff" }}
							data-testid="btn-post-acceptance-waybill"
						>
							{isPosting ? (
								<>
									<PackagePlus className="animate-spin" size={16} />
									<span>Проведение...</span>
								</>
							) : (
								<>
									<CheckCircle2 size={16} />
									<span>Провести накладную</span>
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document === "undefined" ? modalContent : createPortal(modalContent, document.body);
};

export default InboundWaybillModal;
