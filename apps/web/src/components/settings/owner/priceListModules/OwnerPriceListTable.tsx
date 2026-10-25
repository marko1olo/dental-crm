/**
 * OwnerPriceListTable.tsx
 *
 * Таблица услуг прейскуранта владельца клиники с расчетом маржинальности.
 * Модуль декомпозирован согласно Мандату 8b (строго <= 120 строк).
 */

import React from "react";
import type { ServiceWithMargin } from "./priceListTypes";
import { PriceListItemRow } from "./PriceListItemRow";

export interface OwnerPriceListTableProps {
	readonly items: readonly ServiceWithMargin[];
	readonly editingServiceId: string | null;
	readonly tempPriceInput: string;
	readonly priceOverrides: Record<string, number>;
	readonly onStartEdit: (id: string, currentKopecks: number) => void;
	readonly onSavePrice: (id: string) => void;
	readonly onTempPriceChange: (val: string) => void;
	readonly onCopyCode: (code: string) => void;
}

export const OwnerPriceListTable: React.FC<OwnerPriceListTableProps> = ({
	items,
	editingServiceId,
	tempPriceInput,
	priceOverrides,
	onStartEdit,
	onSavePrice,
	onTempPriceChange,
	onCopyCode,
}) => {
	return (
		<div className="border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--paper)]">
			<div className="hidden sm:grid grid-cols-12 gap-2 p-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] text-[11px] font-bold text-[var(--muted)]">
				<div className="col-span-2">Код услуги</div>
				<div className="col-span-4">Услуга / Каталог</div>
				<div className="col-span-2 text-right">Розница (пациент)</div>
				<div className="col-span-2 text-right">Материалы + ЗТЛ</div>
				<div className="col-span-2 text-right">Маржа клиники</div>
			</div>

			<div className="divide-y divide-[var(--line)] max-h-[500px] overflow-y-auto">
				{items.length === 0 ? (
					<div className="p-8 text-center text-xs text-[var(--muted)]">
						Позиций по заданным критериям не найдено.
					</div>
				) : (
					items.map((service) => (
						<PriceListItemRow
							key={service.id}
							service={service}
							isEditing={editingServiceId === service.id}
							tempPriceInput={tempPriceInput}
							hasCustomPrice={priceOverrides[service.id] !== undefined}
							onStartEdit={onStartEdit}
							onSavePrice={onSavePrice}
							onTempPriceChange={onTempPriceChange}
							onCopyCode={onCopyCode}
						/>
					))
				)}
			</div>
		</div>
	);
};
