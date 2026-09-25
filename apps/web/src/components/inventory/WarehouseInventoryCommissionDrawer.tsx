import { Layers, Trash2, User } from "lucide-react";
import type React from "react";
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
	if (!showMetaDrawer) return null;

	return (
		<div className="warehouse-meta-drawer">
			<div className="warehouse-meta-field">
				<label className="warehouse-meta-label">Номер и дата описи</label>
				<div style={{ display: "flex", gap: 6 }}>
					<input
						className="warehouse-meta-input"
						value={docNumber}
						onChange={(e) => setDocNumber(e.target.value)}
						placeholder="Номер описи"
						style={{ width: "60%" }}
					/>
					<input
						className="warehouse-meta-input"
						type="date"
						value={auditDate}
						onChange={(e) => setAuditDate(e.target.value)}
						style={{ width: "40%" }}
					/>
				</div>
			</div>

			<div className="warehouse-meta-field">
				<label className="warehouse-meta-label">Приказ о ревизии (ИНВ-22)</label>
				<div style={{ display: "flex", gap: 6 }}>
					<input
						className="warehouse-meta-input"
						value={orderNumber}
						onChange={(e) => setOrderNumber(e.target.value)}
						placeholder="Приказ №"
						style={{ width: "60%" }}
					/>
					<input
						className="warehouse-meta-input"
						type="date"
						value={orderDate}
						onChange={(e) => setOrderDate(e.target.value)}
						style={{ width: "40%" }}
					/>
				</div>
			</div>

			<div className="warehouse-meta-field">
				<label className="warehouse-meta-label">Материально ответственное лицо (МОЛ)</label>
				<input
					className="warehouse-meta-input"
					value={molFullName}
					onChange={(e) => onMolFullNameChange(e.target.value)}
					placeholder="ФИО МОЛ"
				/>
			</div>

			<div className="warehouse-meta-field">
				<label className="warehouse-meta-label">Должность МОЛ</label>
				<input
					className="warehouse-meta-input"
					value={molPosition}
					onChange={(e) => onMolPositionChange(e.target.value)}
					placeholder="Должность МОЛ"
				/>
			</div>

			<div className="warehouse-meta-field">
				<label className="warehouse-meta-label">Склад / Подразделение</label>
				<input
					className="warehouse-meta-input"
					value={warehouseNameRu}
					onChange={(e) => setWarehouseNameRu(e.target.value)}
					placeholder="Склад"
				/>
			</div>

			{/* Блок комиссии (Мандат 8e / 8n: Соло-врач и небольшая клиника) */}
			<div
				style={{
					gridColumn: "1 / -1",
					marginTop: 6,
					paddingTop: 12,
					borderTop: "1px solid var(--border, #e2e8f0)",
					display: "flex",
					flexDirection: "column",
					gap: 10,
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						flexWrap: "wrap",
						gap: 8,
					}}
				>
					<div>
						<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
							<label className="warehouse-meta-label" style={{ fontSize: "0.8125rem", margin: 0 }}>
								Состав инвентаризационной комиссии (ИНВ-3 / ИНВ-19)
							</label>
							<span
								style={{
									fontSize: "0.75rem",
									fontWeight: 700,
									padding: "2px 8px",
									borderRadius: 4,
									background: commission.length === 1 ? "var(--ok-bg, #ecfdf5)" : "var(--info-bg, #eff6ff)",
									color: commission.length === 1 ? "var(--ok-fg, #047857)" : "var(--info-fg, #1d4ed8)",
									border: `1px solid ${commission.length === 1 ? "var(--ok-border, #a7f3d0)" : "var(--info-border, #bfdbfe)"}`,
								}}
							>
								{commission.length === 1 ? "Единолично (1 чел.)" : `Комиссия (${commission.length} чел.)`}
							</span>
						</div>
						<p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: "2px 0 0 0" }}>
							{commission.length === 1
								? "Режим соло-врача / небольшой клиники (Клинический регламент): подпись описи формируется за одного ответственного сотрудника без навязывания 4 фиктивных должностей."
								: "Стандартный многоместный состав комиссии для крупных стоматологических клиник (ИНВ-22)."}
						</p>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
						<button
							type="button"
							className={`warehouse-btn ${commission.length === 1 ? "warehouse-btn-primary" : "warehouse-btn-secondary"}`}
							onClick={onSetSoloCommission}
							title="Единоличная инвентаризация для соло-врача или ответственного сотрудника (1 член комиссии)"
						>
							<User size={14} />
							<span>Единоличная инвентаризация (Соло-врач / Ответственный)</span>
						</button>

						{commission.length === 1 && (
							<button
								type="button"
								className="warehouse-btn warehouse-btn-secondary"
								onClick={onSetStandardCommission}
								title="Восстановить комиссию из 4 человек (Главный врач, МОЛ, Главная медсестра, Бухгалтер)"
							>
								<Layers size={14} />
								<span>Комиссия из 4 человек (Стандарт)</span>
							</button>
						)}
					</div>
				</div>

				{/* Список членов комиссии */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 6,
						background: "var(--paper, #ffffff)",
						padding: 10,
						borderRadius: 6,
						border: "1px solid var(--border, #e2e8f0)",
					}}
				>
					{commission.map((member, idx) => (
						<div
							key={idx}
							style={{
								display: "flex",
								alignItems: "center",
								gap: 8,
								flexWrap: "wrap",
							}}
						>
							<span
								style={{
									fontSize: "0.75rem",
									fontWeight: 600,
									minWidth: 160,
									color: "var(--muted, #64748b)",
								}}
							>
								{member.roleRu || (member.role === "chairman" ? "Председатель" : member.role === "mol" ? "МОЛ" : member.role === "accountant" ? "Бухгалтер" : "Член комиссии")}:
							</span>
							<input
								className="warehouse-meta-input"
								value={member.fullName}
								onChange={(e) => onCommissionMemberChange(idx, "fullName", e.target.value)}
								placeholder="ФИО сотрудника"
								style={{ flex: 1, minWidth: 180 }}
							/>
							<input
								className="warehouse-meta-input"
								value={member.position}
								onChange={(e) => onCommissionMemberChange(idx, "position", e.target.value)}
								placeholder="Должность"
								style={{ width: 200 }}
							/>
							{commission.length > 1 && (
								<button
									type="button"
									className="warehouse-btn warehouse-btn-ghost"
									onClick={() => onRemoveCommissionMember(idx)}
									title="Удалить члена комиссии"
									style={{ padding: "0 6px", height: 28 }}
								>
									<Trash2 size={13} />
								</button>
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
