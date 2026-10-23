import React from "react";
import { Plus } from "lucide-react";
import { CANONICAL_SUPPLIERS } from "./inboundWaybillPresets.js";

interface InboundWaybillRequisitesProps {
	readonly waybillNumber: string;
	readonly setWaybillNumber: (n: string) => void;
	readonly receiptDate: string;
	readonly setReceiptDate: (d: string) => void;
	readonly supplierName: string;
	readonly setSupplierName: (s: string) => void;
	readonly warehouseName: string;
	readonly setWarehouseName: (w: string) => void;
	readonly onLoadPreset: (key: "stomtorg" | "consumables") => void;
	readonly onAddEmptyLine: () => void;
}

export const InboundWaybillRequisites: React.FC<InboundWaybillRequisitesProps> = ({
	waybillNumber,
	setWaybillNumber,
	receiptDate,
	setReceiptDate,
	supplierName,
	setSupplierName,
	warehouseName,
	setWarehouseName,
	onLoadPreset,
	onAddEmptyLine,
}) => {
	return (
		<div className="p-3 sm:p-4 border-b border-[var(--line)] bg-[var(--paper)] shrink-0 space-y-3">
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
				<div>
					<label className="font-semibold text-[var(--muted)] block mb-1">Номер накладной</label>
					<input
						type="text"
						value={waybillNumber}
						onChange={(e) => setWaybillNumber(e.target.value)}
						className="w-full h-9 min-h-[36px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] font-mono font-bold"
						placeholder="НАКЛ-261022-01"
					/>
				</div>

				<div>
					<label className="font-semibold text-[var(--muted)] block mb-1">Дата приёмки</label>
					<input
						type="date"
						value={receiptDate}
						onChange={(e) => setReceiptDate(e.target.value)}
						className="w-full h-9 min-h-[36px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
					/>
				</div>

				<div>
					<label className="font-semibold text-[var(--muted)] block mb-1">Поставщик</label>
					<select
						value={supplierName}
						onChange={(e) => setSupplierName(e.target.value)}
						className="w-full h-9 min-h-[36px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
					>
						{CANONICAL_SUPPLIERS.map((s) => (
							<option key={s.id} value={s.name}>
								{s.name}
							</option>
						))}
					</select>
				</div>

				<div>
					<label className="font-semibold text-[var(--muted)] block mb-1">Склад размещения</label>
					<input
						type="text"
						value={warehouseName}
						onChange={(e) => setWarehouseName(e.target.value)}
						className="w-full h-9 min-h-[36px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
						placeholder="Основной склад"
					/>
				</div>
			</div>

			<div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[var(--line-subtle)]">
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mr-1">
						Образцы:
					</span>
					<button
						type="button"
						onClick={() => onLoadPreset("stomtorg")}
						className="h-8 px-2.5 text-xs font-medium rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)]/10 text-[var(--ink)] transition cursor-pointer"
					>
						📦 Стомторг (Септанест, Филтек, ОптиБонд)
					</button>
					<button
						type="button"
						onClick={() => onLoadPreset("consumables")}
						className="h-8 px-2.5 text-xs font-medium rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--line)]/10 text-[var(--ink)] transition cursor-pointer"
					>
						🧤 Расходники (Перчатки, слюноотсосы, валики)
					</button>
				</div>

				<button
					type="button"
					onClick={onAddEmptyLine}
					className="h-8 px-3 text-xs font-semibold rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition inline-flex items-center gap-1 cursor-pointer"
					data-testid="btn-add-waybill-line"
				>
					<Plus size={14} />
					<span>+ Добавить строку</span>
				</button>
			</div>
		</div>
	);
};
