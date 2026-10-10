import { Truck, X, Zap } from "lucide-react";
import React from "react";
import { money } from "../../../AppHelpers.js";
import {
	CANONICAL_DENTAL_MATERIAL_TEMPLATES,
	CANONICAL_DENTAL_SUPPLIERS,
	kopecksToRubles,
} from "../../inventory/acceptanceWaybillsEngine.js";
import { WaybillItemsGrid } from "./WaybillItemsGrid.js";
import type { ExpressWaybillModalProps, WaybillEditorModalProps } from "./types.js";

export const WaybillEditorModal: React.FC<WaybillEditorModalProps> = ({
	draftWaybill,
	onChangeSupplier,
	onChangeWaybillNumber,
	onChangeReceiptDate,
	onAddTemplateItem,
	onRemoveDraftItem,
	onCancel,
	onSubmit,
}) => {
	return (
		<div className="flex-1 flex flex-col min-h-0 overflow-hidden" data-testid="waybill-create-form">
			{/* Шапка формы */}
			<div className="p-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between shrink-0">
				<div>
					<h4 className="text-xs font-bold text-[var(--ink,#0f172a)]">
						Новая приходная накладная
					</h4>
					<p className="text-[11px] text-[var(--muted,#64748b)]">
						Пополнение склада и погашение отрицательных остатков
					</p>
				</div>
				<button
					type="button"
					onClick={onCancel}
					className="text-xs text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
				>
					Отмена
				</button>
			</div>

			{/* Параметры поставщика */}
			<div className="p-3 border-b border-[var(--line,#e2e8f0)] grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0 text-xs">
				<div>
					<label className="block text-[11px] font-semibold text-[var(--muted,#64748b)] mb-1">
						Поставщик:
					</label>
					<select
						className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
						value={draftWaybill.supplier.id}
						onChange={(e) => {
							const s = CANONICAL_DENTAL_SUPPLIERS.find(
								(sup) => sup.id === e.target.value,
							);
							if (s) onChangeSupplier(s);
						}}
					>
						{CANONICAL_DENTAL_SUPPLIERS.map((s) => (
							<option key={s.id} value={s.id}>
								{s.name}
							</option>
						))}
					</select>
				</div>

				<div>
					<label className="block text-[11px] font-semibold text-[var(--muted,#64748b)] mb-1">
						Номер накладной:
					</label>
					<input
						type="text"
						className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
						value={draftWaybill.waybillNumber}
						onChange={(e) => onChangeWaybillNumber(e.target.value)}
					/>
				</div>

				<div>
					<label className="block text-[11px] font-semibold text-[var(--muted,#64748b)] mb-1">
						Дата накладной:
					</label>
					<input
						type="date"
						className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
						value={draftWaybill.receiptDate}
						onChange={(e) => onChangeReceiptDate(e.target.value)}
					/>
				</div>
			</div>

			{/* Экспресс-добавление из стоматологических шаблонов */}
			<div className="p-2 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none shrink-0 text-xs">
				<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] shrink-0">
					Быстрое добавление:
				</span>
				{CANONICAL_DENTAL_MATERIAL_TEMPLATES.slice(0, 5).map((t) => (
					<button
						key={t.sku}
						type="button"
						onClick={() => onAddTemplateItem(t.sku)}
						className="h-6 px-2 rounded-md bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] hover:border-teal-500 text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors"
						title={`Добавить ${t.name} (10 ${t.unit})`}
					>
						+ {t.name.split(" ")[0]} ({t.unit})
					</button>
				))}
			</div>

			{/* Таблица строк накладной */}
			<div className="flex-1 overflow-y-auto p-3">
				<WaybillItemsGrid
					items={draftWaybill.items}
					mode="draft"
					onRemoveItem={onRemoveDraftItem}
				/>
			</div>

			{/* Футер формы проведения */}
			<div className="p-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between shrink-0 text-xs">
				<div>
					<span>Итого с НДС: </span>
					<strong className="text-sm font-bold text-teal-700 dark:text-teal-300">
						{money(kopecksToRubles(draftWaybill.totals.totalCostKopecks))}
					</strong>
					<span className="text-[11px] text-[var(--muted,#64748b)] ml-2">
						({draftWaybill.items.length} поз.)
					</span>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onCancel}
						className="h-8 px-3 rounded-lg border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] cursor-pointer"
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={() => onSubmit(draftWaybill)}
						className="h-8 px-4 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 active:scale-98 shadow-xs cursor-pointer"
						data-testid="btn-confirm-post-waybill"
					>
						Провести накладную
					</button>
				</div>
			</div>
		</div>
	);
};

export const ExpressWaybillModal: React.FC<ExpressWaybillModalProps> = ({
	isOpen,
	supplierId,
	waybillNum,
	receiptDate,
	amountRub,
	onSupplierIdChange,
	onWaybillNumChange,
	onReceiptDateChange,
	onAmountRubChange,
	onClose,
	onSubmit,
}) => {
	if (!isOpen) return null;

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: "rgba(15, 23, 42, 0.6)",
				backdropFilter: "blur(4px)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 9999,
				padding: 16,
			}}
			onClick={onClose}
			data-testid="modal-express-waybill-overlay"
		>
			<div
				style={{
					background: "var(--paper, #ffffff)",
					borderRadius: 12,
					width: "100%",
					maxWidth: 520,
					boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
					border: "1px solid var(--line, #cbd5e1)",
					overflow: "hidden",
				}}
				onClick={(e) => e.stopPropagation()}
				data-testid="modal-express-waybill"
			>
				{/* Header */}
				<div
					style={{
						padding: "12px 16px",
						borderBottom: "1px solid var(--line, #e2e8f0)",
						background: "var(--paper-soft, #f8fafc)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<div
							style={{
								width: 28,
								height: 28,
								borderRadius: 6,
								background: "var(--primary, #0284c7)",
								color: "#fff",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Zap size={14} />
						</div>
						<div>
							<h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
								Экспресс-оприходование накладной
							</h3>
							<p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
								Быстрое пополнение склада и автоматическое погашение овердрафта
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						style={{
							border: "none",
							background: "transparent",
							cursor: "pointer",
							color: "var(--muted, #64748b)",
							padding: 4,
						}}
						aria-label="Закрыть"
					>
						<X size={16} />
					</button>
				</div>

				{/* Form (4 поля) */}
				<div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
					{/* 1. Поставщик */}
					<div>
						<label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--muted, #64748b)", marginBottom: 4 }}>
							1. Поставщик:
						</label>
						<select
							style={{
								width: "100%",
								height: 36,
								padding: "0 10px",
								borderRadius: 8,
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper, #fff)",
								fontSize: "0.8125rem",
								color: "var(--ink, #0f172a)",
							}}
							value={supplierId}
							onChange={(e) => onSupplierIdChange(e.target.value)}
							data-testid="express-wb-supplier"
						>
							{CANONICAL_DENTAL_SUPPLIERS.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name} (ИНН: {s.inn})
								</option>
							))}
						</select>
					</div>

					{/* 2. Номер накладной */}
					<div>
						<label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--muted, #64748b)", marginBottom: 4 }}>
							2. Номер накладной:
						</label>
						<input
							type="text"
							style={{
								width: "100%",
								height: 36,
								padding: "0 10px",
								borderRadius: 8,
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper, #fff)",
								fontSize: "0.8125rem",
								color: "var(--ink, #0f172a)",
								boxSizing: "border-box",
							}}
							value={waybillNum}
							onChange={(e) => onWaybillNumChange(e.target.value)}
							placeholder="например, ТОРГ-2026/10-091"
							data-testid="express-wb-number"
						/>
					</div>

					{/* 3. Дата */}
					<div>
						<label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--muted, #64748b)", marginBottom: 4 }}>
							3. Дата накладной:
						</label>
						<input
							type="date"
							style={{
								width: "100%",
								height: 36,
								padding: "0 10px",
								borderRadius: 8,
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper, #fff)",
								fontSize: "0.8125rem",
								color: "var(--ink, #0f172a)",
								boxSizing: "border-box",
							}}
							value={receiptDate}
							onChange={(e) => onReceiptDateChange(e.target.value)}
							data-testid="express-wb-date"
						/>
					</div>

					{/* 4. Итоговая сумма */}
					<div>
						<label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--muted, #64748b)", marginBottom: 4 }}>
							4. Итоговая сумма (₽):
						</label>
						<input
							type="number"
							style={{
								width: "100%",
								height: 36,
								padding: "0 10px",
								borderRadius: 8,
								border: "1px solid var(--line, #cbd5e1)",
								background: "var(--paper, #fff)",
								fontSize: "0.875rem",
								fontWeight: 700,
								color: "var(--teal-700, #0f766e)",
								boxSizing: "border-box",
							}}
							value={amountRub}
							onChange={(e) => onAmountRubChange(e.target.value)}
							min="0"
							step="100"
							data-testid="express-wb-amount"
						/>
					</div>
				</div>

				{/* Footer CTA */}
				<div
					style={{
						padding: "12px 16px",
						borderTop: "1px solid var(--line, #e2e8f0)",
						background: "var(--paper-soft, #f8fafc)",
						display: "flex",
						alignItems: "center",
						justifyContent: "flex-end",
						gap: 8,
					}}
				>
					<button
						type="button"
						onClick={onClose}
						style={{
							height: 36,
							padding: "0 16px",
							borderRadius: 8,
							border: "1px solid var(--line, #cbd5e1)",
							background: "var(--paper, #fff)",
							fontSize: "0.8125rem",
							fontWeight: 600,
							color: "var(--ink, #0f172a)",
							cursor: "pointer",
						}}
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={onSubmit}
						style={{
							height: 36,
							padding: "0 18px",
							borderRadius: 8,
							border: "none",
							background: "var(--teal-600, #0d9488)",
							color: "#ffffff",
							fontSize: "0.8125rem",
							fontWeight: 700,
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: 6,
						}}
						data-testid="btn-submit-express-wb"
					>
						<Truck size={14} />
						<span>Оприходовать накладную</span>
					</button>
				</div>
			</div>
		</div>
	);
};
