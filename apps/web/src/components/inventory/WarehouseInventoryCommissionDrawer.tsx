import { UserCheck } from "lucide-react";
import React from "react";
import type { WarehouseInventoryCommissionMember } from "./warehouseInventoryEngine.js";

export interface WarehouseInventoryCommissionDrawerProps {
	readonly showMetaDrawer: boolean;
	readonly docNumber: string;
	readonly setDocNumber: (val: string) => void;
	readonly auditDate: string;
	readonly setAuditDate: (val: string) => void;
	readonly orderNumber?: string;
	readonly setOrderNumber?: (val: string) => void;
	readonly orderDate?: string;
	readonly setOrderDate?: (val: string) => void;
	readonly molFullName: string;
	readonly onMolFullNameChange: (val: string) => void;
	readonly molPosition: string;
	readonly onMolPositionChange: (val: string) => void;
	readonly warehouseNameRu: string;
	readonly setWarehouseNameRu: (val: string) => void;
	readonly commission?: readonly WarehouseInventoryCommissionMember[];
	readonly onSetSoloCommission?: () => void;
	readonly onSetStandardCommission?: () => void;
	readonly onCommissionMemberChange?: (idx: number, field: "fullName" | "position", value: string) => void;
	readonly onRemoveCommissionMember?: (idx: number) => void;
}

/**
 * Экспресс-панель параметров инвентаризации остатков (Мандаты 8e, 8n: Соло-врач и небольшая клиника).
 * Ликвидирован бюрократический маразм: выбор председателя комиссии, приказов и членов комиссии
 * для пересчета перчаток упразднен. Действует единоличный оперативный учет МОЛ/врача в 1 клик.
 */
export const WarehouseInventoryCommissionDrawer: React.FC<WarehouseInventoryCommissionDrawerProps> = ({
	showMetaDrawer,
	docNumber,
	setDocNumber,
	auditDate,
	setAuditDate,
	molFullName,
	onMolFullNameChange,
	molPosition,
	onMolPositionChange,
	warehouseNameRu,
	setWarehouseNameRu,
}) => {
	if (!showMetaDrawer) return null;

	return (
		<div className="warehouse-meta-drawer p-3 bg-[var(--paper-soft)] border-b border-[var(--line)]">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
				<div className="warehouse-meta-field flex flex-col gap-1">
					<label className="warehouse-meta-label text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
						<UserCheck size={14} className="text-[var(--primary)] shrink-0" />
						<span>Ответственный (МОЛ / Врач)</span>
					</label>
					<div className="flex gap-2">
						<input
							className="warehouse-meta-input flex-1 h-8 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
							value={molFullName}
							onChange={(e) => onMolFullNameChange(e.target.value)}
							placeholder="ФИО врача или медсестры"
						/>
						<input
							className="warehouse-meta-input w-36 h-8 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
							value={molPosition}
							onChange={(e) => onMolPositionChange(e.target.value)}
							placeholder="Должность"
						/>
					</div>
				</div>

				<div className="warehouse-meta-field flex flex-col gap-1">
					<label className="warehouse-meta-label text-xs font-semibold text-[var(--ink)]">
						Склад / Кабинет
					</label>
					<input
						className="warehouse-meta-input w-full h-8 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
						value={warehouseNameRu}
						onChange={(e) => setWarehouseNameRu(e.target.value)}
						placeholder="Главный склад / Кабинет №1"
					/>
				</div>

				<div className="warehouse-meta-field flex flex-col gap-1">
					<label className="warehouse-meta-label text-xs font-semibold text-[var(--ink)]">
						Номер и дата описи
					</label>
					<div className="flex gap-2">
						<input
							className="warehouse-meta-input flex-1 h-8 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono"
							value={docNumber}
							onChange={(e) => setDocNumber(e.target.value)}
							placeholder="Номер описи"
						/>
						<input
							className="warehouse-meta-input w-32 h-8 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
							type="date"
							value={auditDate}
							onChange={(e) => setAuditDate(e.target.value)}
						/>
					</div>
				</div>
			</div>

			<div className="mt-2.5 pt-2 border-t border-[var(--line-subtle)] flex items-center justify-between text-[11px] text-[var(--muted)]">
				<span className="font-medium text-[var(--primary)]">
					✓ Единоличный оперативный учет (без созыва комиссий и бюрократии)
				</span>
				<span>Опись остатков ТМЦ</span>
			</div>
		</div>
	);
};

export default WarehouseInventoryCommissionDrawer;
