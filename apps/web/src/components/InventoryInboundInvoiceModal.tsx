import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	Clock,
	FileText,
	Plus,
	Printer,
	Trash2,
	Truck,
	X,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { money } from "../AppHelpers.js";
import { showToast } from "./GlobalToast.js";
import type { InventoryItem } from "./inventory/useInventoryLogic.js";

export interface InboundInvoiceItemLine {
	id: string;
	inventoryItemId?: string;
	name: string;
	lotNumber: string;
	expirationDate: string;
	quantity: number;
	unit: string;
	unitCostRub: number;
}

export interface InventoryInboundInvoiceModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId: string;
	readonly inventoryItems: readonly InventoryItem[];
	readonly onInvoicePosted?: () => void | Promise<void>;
	readonly getHeaders?: (headers?: Record<string, string>) => Record<string, string>;
}

const DEFAULT_SUPPLIERS = [
	"ООО «Стомторг»",
	"KaVo Dental Russland",
	"ЗАО «ВладМиВа»",
	"ООО «ДенталМаркет»",
	"3M ESPE Стоматология",
	"Dentsply Sirona",
];

/**
 * Модальное окно приходной накладной и оприходования материалов (Мандаты 8b, 8d, 8e, 8n).
 * Обеспечивает партионный приход по ТОРГ-12 / УПД с фиксацией партий, сроков годности FEFO
 * и автоматическим погашением технологического овердрафта.
 */
export const InventoryInboundInvoiceModal: React.FC<InventoryInboundInvoiceModalProps> = ({
	isOpen,
	onClose,
	organizationId,
	inventoryItems,
	onInvoicePosted,
	getHeaders,
}) => {
	const [invoiceNumber, setInvoiceNumber] = useState(
		`ТОРГ12-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-01`,
	);
	const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
	const [supplierName, setSupplierName] = useState("ООО «Стомторг»");
	const [isPosting, setIsPosting] = useState(false);

	const [lines, setLines] = useState<InboundInvoiceItemLine[]>([
		{
			id: "line-1",
			name: "Перчатки нитриловые неопудренные",
			lotNumber: `LOT-${new Date().getFullYear()}-01`,
			expirationDate: "2028-12-31",
			quantity: 10,
			unit: "уп.",
			unitCostRub: 650,
		},
	]);

	// Итоги по накладной
	const totals = useMemo(() => {
		let totalQty = 0;
		let totalSumRub = 0;

		for (const line of lines) {
			const q = Number(line.quantity) || 0;
			const p = Number(line.unitCostRub) || 0;
			totalQty += q;
			totalSumRub += q * p;
		}

		return {
			totalPositions: lines.length,
			totalQty,
			totalSumRub,
			totalSumFormatted: money(Math.round(totalSumRub * 100)),
		};
	}, [lines]);

	if (!isOpen) return null;

	const handleAddLine = () => {
		setLines((prev) => [
			...prev,
			{
				id: `line-${Date.now()}`,
				name: "",
				lotNumber: `LOT-${new Date().getFullYear()}-${String(prev.length + 1).padStart(2, "0")}`,
				expirationDate: "2027-12-31",
				quantity: 1,
				unit: "шт.",
				unitCostRub: 0,
			},
		]);
	};

	const handleRemoveLine = (id: string) => {
		if (lines.length <= 1) {
			showToast("В накладной должна быть хотя бы одна позиция", "warning");
			return;
		}
		setLines((prev) => prev.filter((l) => l.id !== id));
	};

	const handleLineChange = (
		id: string,
		field: keyof InboundInvoiceItemLine,
		value: string | number,
	) => {
		setLines((prev) =>
			prev.map((line) => {
				if (line.id !== id) return line;

				if (field === "name") {
					// Автоматическое сопоставление с существующим товаром на складе
					const matchingItem = inventoryItems.find(
						(it) => it.name.toLowerCase() === String(value).toLowerCase(),
					);
					return {
						...line,
						name: String(value),
						inventoryItemId: matchingItem?.id,
						unit: matchingItem?.unit || line.unit,
						unitCostRub: matchingItem?.unitCostRub
							? Number(matchingItem.unitCostRub)
							: line.unitCostRub,
					};
				}

				return { ...line, [field]: value };
			}),
		);
	};

	const handlePostInvoice = async (e: React.FormEvent) => {
		e.preventDefault();
		if (lines.length === 0) {
			showToast("Добавьте позиции в накладную", "warning");
			return;
		}

		// Валидация
		for (const line of lines) {
			if (!line.name.trim()) {
				showToast("Заполните наименования всех материалов", "warning");
				return;
			}
			if (line.quantity <= 0) {
				showToast(`Укажите корректное количество для «${line.name}»`, "warning");
				return;
			}
		}

		setIsPosting(true);
		try {
			const headers = getHeaders
				? getHeaders({ "Content-Type": "application/json" })
				: { "Content-Type": "application/json" };

			let updatedCount = 0;

			// Оприходование каждой позиции на складе
			for (const line of lines) {
				let targetItemId = line.inventoryItemId;

				// Если ID нет, ищем по имени среди существующих позиций
				if (!targetItemId) {
					const found = inventoryItems.find(
						(it) => it.name.trim().toLowerCase() === line.name.trim().toLowerCase(),
					);
					if (found) {
						targetItemId = found.id;
					}
				}

				if (targetItemId) {
					// Пополнение существующего остатка
					const res = await fetch(`/api/inventory/${organizationId}/${targetItemId}/stock`, {
						method: "PATCH",
						headers,
						body: JSON.stringify({
							adjustment: line.quantity,
							allowOverdraft: true,
							reason: `Приходная накладная ${invoiceNumber} от ${supplierName} (партия ${line.lotNumber}, годен до ${line.expirationDate})`,
						}),
					});
					if (res.ok) updatedCount++;
				} else {
					// Создание новой номенклатурной единицы на складе
					const res = await fetch(`/api/inventory/${organizationId}/items`, {
						method: "POST",
						headers,
						body: JSON.stringify({
							name: line.name,
							stockQuantity: line.quantity,
							unit: line.unit,
							unitCostRub: String(line.unitCostRub),
							lotNumber: line.lotNumber,
							expirationDate: line.expirationDate,
							threshold: 5,
							allowOverdraft: true,
						}),
					});
					if (res.ok) updatedCount++;
				}
			}

			showToast(
				`Приходная накладная ${invoiceNumber} успешно оприходована (${updatedCount} поз. на сумму ${totals.totalSumFormatted})`,
				"success",
			);

			if (onInvoicePosted) {
				await onInvoicePosted();
			}
			onClose();
		} catch (error) {
			console.error("Ошибка при оприходовании накладной:", error);
			showToast("Не удалось оприходовать накладную на складе", "error");
		} finally {
			setIsPosting(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="inbound-invoice-title"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div
				className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Шапка модального окна */}
				<div className="px-5 py-3.5 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center justify-between shrink-0">
					<div className="flex items-center gap-2">
						<Truck className="text-teal-600 dark:text-teal-400 shrink-0" size={20} />
						<div>
							<h2 id="inbound-invoice-title" className="text-sm font-bold text-[var(--ink)] leading-tight">
								Приходная накладная поставщика (ТОРГ-12 / FEFO)
							</h2>
							<p className="text-[11px] text-[var(--muted)]">
								Оприходование партий стоматологических материалов и автоматическое погашение овердрафта
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer"
						aria-label="Закрыть окно"
					>
						<X size={18} />
					</button>
				</div>

				<form onSubmit={handlePostInvoice} className="flex flex-col flex-1 overflow-hidden">
					{/* Реквизиты накладной */}
					<div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-[var(--line)] bg-[var(--paper)] shrink-0">
						<div>
							<label htmlFor="inv-modal-number" className="block text-xs font-semibold text-[var(--muted)] mb-1">
								Номер накладной / УПД *
							</label>
							<input
								id="inv-modal-number"
								type="text"
								required
								value={invoiceNumber}
								onChange={(e) => setInvoiceNumber(e.target.value)}
								className="w-full h-8 px-2.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none focus:border-teal-500 font-mono font-medium"
								placeholder="ТОРГ-12 №..."
							/>
						</div>

						<div>
							<label htmlFor="inv-modal-date" className="block text-xs font-semibold text-[var(--muted)] mb-1">
								Дата поступления *
							</label>
							<input
								id="inv-modal-date"
								type="date"
								required
								value={invoiceDate}
								onChange={(e) => setInvoiceDate(e.target.value)}
								className="w-full h-8 px-2.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none focus:border-teal-500 font-mono"
							/>
						</div>

						<div>
							<label htmlFor="inv-modal-supplier" className="block text-xs font-semibold text-[var(--muted)] mb-1">
								Поставщик *
							</label>
							<input
								id="inv-modal-supplier"
								type="text"
								required
								list="supplier-suggestions"
								value={supplierName}
								onChange={(e) => setSupplierName(e.target.value)}
								className="w-full h-8 px-2.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none focus:border-teal-500"
								placeholder="ООО «Стомторг»..."
							/>
							<datalist id="supplier-suggestions">
								{DEFAULT_SUPPLIERS.map((s) => (
									<option key={s} value={s} />
								))}
							</datalist>
						</div>
					</div>

					{/* Табличная часть накладной */}
					<div className="flex-1 overflow-y-auto p-4 space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
								Товарные позиции ({lines.length})
							</span>
							<button
								type="button"
								onClick={handleAddLine}
								className="h-7 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-teal-600 dark:text-teal-400 border border-[var(--line)] text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
							>
								<Plus size={13} />
								<span>Добавить строку</span>
							</button>
						</div>

						<div className="border border-[var(--line)] rounded-xl overflow-hidden shadow-xs">
							<table className="w-full text-left text-xs border-collapse">
								<thead>
									<tr className="bg-[var(--paper-soft)] border-b border-[var(--line)] text-[var(--muted)] font-semibold">
										<th className="py-2 px-2.5 w-7">#</th>
										<th className="py-2 px-2.5">Материал *</th>
										<th className="py-2 px-2.5 w-32">Партия (Lot)</th>
										<th className="py-2 px-2.5 w-36">Годен до (FEFO)</th>
										<th className="py-2 px-2.5 w-20 text-right">Кол-во</th>
										<th className="py-2 px-2.5 w-16">Ед.</th>
										<th className="py-2 px-2.5 w-24 text-right">Цена (₽)</th>
										<th className="py-2 px-2.5 w-24 text-right">Сумма</th>
										<th className="py-2 px-2 w-8 text-center" />
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--line)]">
									{lines.map((line, idx) => {
										const lineSum = (Number(line.quantity) || 0) * (Number(line.unitCostRub) || 0);

										return (
											<tr key={line.id} className="hover:bg-[var(--paper-soft)] transition-colors">
												<td className="py-2 px-2.5 text-[var(--muted)] font-mono text-[11px]">
													{idx + 1}
												</td>
												<td className="py-1.5 px-2">
													<input
														type="text"
														required
														list="inventory-item-suggestions"
														value={line.name}
														onChange={(e) => handleLineChange(line.id, "name", e.target.value)}
														placeholder="Наименование материала..."
														className="w-full h-7 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500 font-medium"
													/>
												</td>
												<td className="py-1.5 px-2">
													<input
														type="text"
														value={line.lotNumber}
														onChange={(e) => handleLineChange(line.id, "lotNumber", e.target.value)}
														placeholder="Партия..."
														className="w-full h-7 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500 font-mono"
													/>
												</td>
												<td className="py-1.5 px-2">
													<input
														type="date"
														required
														value={line.expirationDate}
														onChange={(e) =>
															handleLineChange(line.id, "expirationDate", e.target.value)
														}
														className="w-full h-7 px-1.5 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500 font-mono"
													/>
												</td>
												<td className="py-1.5 px-2">
													<input
														type="number"
														min="0.001"
														step="any"
														required
														value={line.quantity}
														onChange={(e) =>
															handleLineChange(line.id, "quantity", Number(e.target.value))
														}
														className="w-full h-7 px-2 text-xs text-right rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500 font-mono font-bold"
													/>
												</td>
												<td className="py-1.5 px-2">
													<input
														type="text"
														value={line.unit}
														onChange={(e) => handleLineChange(line.id, "unit", e.target.value)}
														className="w-full h-7 px-1 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500"
														placeholder="уп."
													/>
												</td>
												<td className="py-1.5 px-2">
													<input
														type="number"
														min="0"
														step="0.01"
														value={line.unitCostRub}
														onChange={(e) =>
															handleLineChange(line.id, "unitCostRub", Number(e.target.value))
														}
														className="w-full h-7 px-2 text-xs text-right rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500 font-mono"
													/>
												</td>
												<td className="py-2 px-2.5 text-right font-mono text-[11px] font-bold text-[var(--ink)] whitespace-nowrap">
													{money(Math.round(lineSum * 100))}
												</td>
												<td className="py-2 px-1 text-center">
													<button
														type="button"
														onClick={() => handleRemoveLine(line.id)}
														className="text-[var(--muted)] hover:text-rose-600 cursor-pointer p-0.5"
														title="Удалить строку"
													>
														<Trash2 size={13} />
													</button>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
							<datalist id="inventory-item-suggestions">
								{inventoryItems.map((it) => (
									<option key={it.id} value={it.name} />
								))}
							</datalist>
						</div>
					</div>

					{/* Подвал с итогами и кнопками действия */}
					<div className="p-4 bg-[var(--paper-soft)] border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3 shrink-0">
						<div className="flex items-center gap-4 text-xs">
							<div>
								<span className="text-[var(--muted)]">Всего единиц: </span>
								<strong className="font-mono text-[var(--ink)] font-bold">{totals.totalQty}</strong>
							</div>
							<div>
								<span className="text-[var(--muted)]">Итого по ТОРГ-12: </span>
								<strong className="font-mono text-teal-600 dark:text-teal-400 font-bold text-sm">
									{totals.totalSumFormatted}
								</strong>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={onClose}
								className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold hover:bg-[var(--line)] transition-colors cursor-pointer"
							>
								Отмена
							</button>

							<button
								type="submit"
								disabled={isPosting}
								className="h-8 px-4 rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer hover:opacity-90 disabled:opacity-50 transition-all"
								data-testid="btn-post-inbound-invoice"
							>
								<CheckCircle2 size={14} />
								<span>{isPosting ? "Оприходование..." : "Оприходовать накладную"}</span>
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
};

export default InventoryInboundInvoiceModal;
