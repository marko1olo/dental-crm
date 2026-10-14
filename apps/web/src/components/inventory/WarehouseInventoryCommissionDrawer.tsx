import { ChevronDown, ChevronUp, Layers, Trash2, User, UserCheck } from "lucide-react";
import React, { useState } from "react";
import type { WarehouseInventoryCommissionMember } from "./warehouseInventoryEngine.js";

export interface WarehouseInventoryCommissionDrawerProps {
	readonly showMetaDrawer: boolean;
	readonly docNumber: string;
	readonly setDocNumber: (val: string) => void;
	readonly auditDate: string;
	readonly setAuditDate: (val: string) => void;
	readonly orderNumber: string;
	readonly setOrderNumber: (val: string) => void;
	readonly orderDate: string;
	readonly setOrderDate: (val: string) => void;
	readonly molFullName: string;
	readonly onMolFullNameChange: (val: string) => void;
	readonly molPosition: string;
	readonly onMolPositionChange: (val: string) => void;
	readonly warehouseNameRu: string;
	readonly setWarehouseNameRu: (val: string) => void;
	readonly commission: readonly WarehouseInventoryCommissionMember[];
	readonly onSetSoloCommission: () => void;
	readonly onSetStandardCommission: () => void;
	readonly onCommissionMemberChange: (
		idx: number,
		field: "fullName" | "position",
		value: string,
	) => void;
	readonly onRemoveCommissionMember: (idx: number) => void;
}

/**
 * Экспресс-панель параметров инвентаризации (Мандаты 8e, 8n: Соло-врач и небольшая клиника).
 * Устранена бюрократия: по умолчанию единоличный учет врачом/МОЛ без принудительного созыва комиссии из 3-4 человек.
 * Реквизиты приказов и расширенный состав комиссии убраны в опциональный аккордеон.
 */
export const WarehouseInventoryCommissionDrawer: React.FC<
	WarehouseInventoryCommissionDrawerProps
> = ({
	showMetaDrawer,
	docNumber,
	setDocNumber,
	auditDate,
	setAuditDate,
	orderNumber,
	setOrderNumber,
	orderDate,
	setOrderDate,
	molFullName,
	onMolFullNameChange,
	molPosition,
	onMolPositionChange,
	warehouseNameRu,
	setWarehouseNameRu,
	commission,
	onSetSoloCommission,
	onSetStandardCommission,
	onCommissionMemberChange,
	onRemoveCommissionMember,
}) => {
	const [showAdvanced, setShowAdvanced] = useState(commission.length > 1);

	if (!showMetaDrawer) return null;

	return (
		<div className="warehouse-meta-drawer p-3 bg-[var(--paper-soft)] border-b border-[var(--line)]">
			{/* Экспресс-строка: Ответственный, Склад, Опись */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
				{/* 1. Ответственное лицо (МОЛ / Врач) */}
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

				{/* 2. Склад / Кабинет */}
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

				{/* 3. Номер и дата описи */}
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

			{/* Переключатель расширенных параметров (приказ, члены комиссии) */}
			<div className="mt-2.5 pt-2 border-t border-[var(--line-subtle)] flex items-center justify-between">
				<button
					type="button"
					onClick={() => setShowAdvanced((prev) => !prev)}
					className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
				>
					{showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
					<span>
						{showAdvanced
							? "Скрыть реквизиты приказа и состав комиссии"
							: "Реквизиты приказа и расширенная комиссия (опционально)"}
					</span>
					{commission.length > 1 && (
						<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
							{commission.length} чел.
						</span>
					)}
				</button>

				<span className="text-[11px] text-[var(--muted)]">
					{commission.length === 1 ? "Единоличный учет (без бюрократии)" : `Комиссия: ${commission.length} чел.`}
				</span>
			</div>

			{/* Свернутый по умолчанию блок расширенных реквизитов */}
			{showAdvanced && (
				<div className="mt-3 p-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-3">
					{/* Реквизиты приказа */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-semibold text-[var(--muted)]">
								Приказ о проведении инвентаризации
							</label>
							<div className="flex gap-2">
								<input
									className="flex-1 h-8 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] font-mono"
									value={orderNumber}
									onChange={(e) => setOrderNumber(e.target.value)}
									placeholder="Приказ №"
								/>
								<input
									className="w-32 h-8 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
									type="date"
									value={orderDate}
									onChange={(e) => setOrderDate(e.target.value)}
								/>
							</div>
						</div>

						{/* Кнопки переключения режима комиссии */}
						<div className="flex flex-col gap-1 justify-end">
							<div className="flex items-center gap-2">
								<button
									type="button"
									className={`h-8 px-3 rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
										commission.length === 1
											? "bg-[var(--primary)] text-white shadow-xs"
											: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--line)]"
									}`}
									onClick={onSetSoloCommission}
								>
									<User size={13} />
									<span>Единолично (1 чел.)</span>
								</button>
								<button
									type="button"
									className={`h-8 px-3 rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
										commission.length > 1
											? "bg-[var(--primary)] text-white shadow-xs"
											: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--line)]"
									}`}
									onClick={onSetStandardCommission}
								>
									<Layers size={13} />
									<span>Комиссия клиники (4 чел.)</span>
								</button>
							</div>
						</div>
					</div>

					{/* Список членов комиссии */}
					<div className="flex flex-col gap-2 pt-2 border-t border-[var(--line-subtle)]">
						<div className="text-[11px] font-semibold text-[var(--muted)]">
							Члены инвентаризационной комиссии:
						</div>
						{commission.map((member, idx) => (
							<div key={idx} className="flex items-center gap-2 flex-wrap">
								<span className="text-xs font-medium text-[var(--muted)] min-w-[140px]">
									{member.roleRu || (member.role === "chairman" ? "Председатель" : member.role === "mol" ? "МОЛ" : member.role === "accountant" ? "Бухгалтер" : "Член комиссии")}:
								</span>
								<input
									className="flex-1 min-w-[160px] h-8 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
									value={member.fullName}
									onChange={(e) => onCommissionMemberChange(idx, "fullName", e.target.value)}
									placeholder="ФИО сотрудника"
								/>
								<input
									className="w-48 h-8 px-2 text-xs rounded border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
									value={member.position}
									onChange={(e) => onCommissionMemberChange(idx, "position", e.target.value)}
									placeholder="Должность"
								/>
								{commission.length > 1 && (
									<button
										type="button"
										className="h-8 w-8 rounded flex items-center justify-center text-[var(--muted)] hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
										onClick={() => onRemoveCommissionMember(idx)}
										title="Удалить члена комиссии"
									>
										<Trash2 size={13} />
									</button>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
