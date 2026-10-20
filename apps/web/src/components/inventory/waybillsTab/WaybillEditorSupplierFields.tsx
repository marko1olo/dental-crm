import type React from "react";
import {
	type AcceptanceSupplier,
	CANONICAL_DENTAL_MATERIAL_TEMPLATES,
} from "../acceptanceWaybillsEngine.js";

export interface WaybillEditorSupplierFieldsProps {
	readonly supplier: AcceptanceSupplier;
	readonly waybillNumber: string;
	readonly receiptDate: string;
	readonly onChangeSupplier: (supplier: AcceptanceSupplier) => void;
	readonly onChangeWaybillNumber: (num: string) => void;
	readonly onChangeReceiptDate: (date: string) => void;
	readonly onAddTemplateItem: (sku: string) => void;
}

export const WaybillEditorSupplierFields: React.FC<
	WaybillEditorSupplierFieldsProps
> = ({
	supplier,
	waybillNumber,
	receiptDate,
	onChangeSupplier,
	onChangeWaybillNumber,
	onChangeReceiptDate,
	onAddTemplateItem,
}) => {
	return (
		<>
			<div className="p-3 border-b border-[var(--line)] grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0 text-xs">
				<div>
					<span className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
						Поставщик и ИНН:
					</span>
					<div className="flex gap-1.5">
						<input
							type="text"
							aria-label="Название поставщика"
							placeholder="Название поставщика"
							className="flex-1 h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)]"
							value={supplier.name}
							onChange={(e) =>
								onChangeSupplier({
									...supplier,
									id: `custom_${Date.now()}`,
									name: e.target.value,
								})
							}
						/>
						<input
							type="text"
							aria-label="ИНН поставщика"
							placeholder="ИНН"
							maxLength={12}
							className="w-28 h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)]"
							value={supplier.inn || ""}
							onChange={(e) =>
								onChangeSupplier({
									...supplier,
									inn: e.target.value.replace(/\D/g, ""),
								})
							}
						/>
					</div>
				</div>
				<div>
					<span className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
						Номер накладной:
					</span>
					<input
						type="text"
						aria-label="Номер накладной"
						className="w-full h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs"
						value={waybillNumber}
						onChange={(e) => onChangeWaybillNumber(e.target.value)}
					/>
				</div>
				<div>
					<span className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
						Дата накладной:
					</span>
					<input
						type="date"
						aria-label="Дата накладной"
						className="w-full h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs"
						value={receiptDate}
						onChange={(e) => onChangeReceiptDate(e.target.value)}
					/>
				</div>
			</div>

			<div className="p-2 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none shrink-0 text-xs">
				<span className="text-[11px] font-semibold text-[var(--muted)] shrink-0">
					Быстрое добавление:
				</span>
				{CANONICAL_DENTAL_MATERIAL_TEMPLATES.slice(0, 5).map((t) => (
					<button
						key={t.sku}
						type="button"
						onClick={() => onAddTemplateItem(t.sku)}
						className="h-6 px-2 rounded-md bg-[var(--paper)] border border-[var(--line)] hover:border-teal-500 text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors"
						title={`Добавить ${t.name} (10 ${t.unit})`}
					>
						+ {t.name.split(" ")[0]} ({t.unit})
					</button>
				))}
			</div>
		</>
	);
};

export default WaybillEditorSupplierFields;
