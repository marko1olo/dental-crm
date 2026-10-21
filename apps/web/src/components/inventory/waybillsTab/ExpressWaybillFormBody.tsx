import type React from "react";
import { CANONICAL_DENTAL_SUPPLIERS } from "../acceptanceWaybillsEngine.js";

export interface ExpressWaybillFormBodyProps {
	readonly supplierId: string;
	readonly waybillNum: string;
	readonly receiptDate: string;
	readonly amountRub: string;
	readonly onSupplierIdChange: (id: string) => void;
	readonly onWaybillNumChange: (num: string) => void;
	readonly onReceiptDateChange: (date: string) => void;
	readonly onAmountRubChange: (amount: string) => void;
}

export const ExpressWaybillFormBody: React.FC<ExpressWaybillFormBodyProps> = ({
	supplierId,
	waybillNum,
	receiptDate,
	amountRub,
	onSupplierIdChange,
	onWaybillNumChange,
	onReceiptDateChange,
	onAmountRubChange,
}) => (
	<div className="p-4 flex flex-col gap-3 text-xs">
		<div>
			<span className="block font-semibold text-[var(--muted)] mb-1">
				1. Поставщик:
			</span>
			<select
				aria-label="Поставщик"
				className="w-full h-9 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs"
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

		<div className="grid grid-cols-2 gap-2">
			<div>
				<span className="block font-semibold text-[var(--muted)] mb-1">
					2. Номер накладной:
				</span>
				<input
					type="text"
					aria-label="Номер накладной"
					className="w-full h-9 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs"
					value={waybillNum}
					onChange={(e) => onWaybillNumChange(e.target.value)}
					placeholder="НАКЛ-2026/10-091"
					data-testid="express-wb-number"
				/>
			</div>
			<div>
				<span className="block font-semibold text-[var(--muted)] mb-1">
					3. Дата:
				</span>
				<input
					type="date"
					aria-label="Дата накладной"
					className="w-full h-9 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs"
					value={receiptDate}
					onChange={(e) => onReceiptDateChange(e.target.value)}
					data-testid="express-wb-date"
				/>
			</div>
		</div>

		<div>
			<span className="block font-semibold text-[var(--muted)] mb-1">
				4. Итоговая сумма (₽):
			</span>
			<input
				type="number"
				aria-label="Итоговая сумма"
				className="w-full h-9 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--primary)] font-bold text-sm"
				value={amountRub}
				onChange={(e) => onAmountRubChange(e.target.value)}
				min="0"
				step="100"
				data-testid="express-wb-amount"
			/>
		</div>
	</div>
);
