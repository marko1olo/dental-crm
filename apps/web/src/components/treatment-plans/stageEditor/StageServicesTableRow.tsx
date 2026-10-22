import React from "react";
import { Trash2 } from "lucide-react";
import { getItemUnitPrice } from "../stageRow/stageRowHelpers";
import type { StageServicesTableRowProps } from "./StageServicesTableRowTypes";

export type { StageServicesTableRowProps };

export const StageServicesTableRow: React.FC<StageServicesTableRowProps> = ({
	item,
	doctors,
	onUpdateItemQuantity,
	onRemoveItem,
	onAssignDoctorToItem,
}) => {
	const unitPrice = getItemUnitPrice(item);
	const qty = item.quantity || 1;

	return (
		<div className="stage-table-row" data-testid={`stage-row-${item.id}`}>
			<div className="stage-col-service">
				<div className="stage-row-service-meta">
					<span className="stage-row-code font-mono">{item.code804n || item.serviceCode || "A16"}</span>
					<span className="stage-row-category">{item.category || "Общее"}</span>
				</div>
				<div className="stage-row-title">{item.name}</div>
			</div>

			<div className="stage-col-tooth">
				{item.toothNumber ? (
					<span className="stage-tooth-badge font-mono" title={`Зуб ${item.toothNumber}`}>
						{`№${item.toothNumber}`}
					</span>
				) : (
					<span className="stage-tooth-none">—</span>
				)}
			</div>

			<div className="stage-col-doctor">
				{doctors && doctors.length > 0 && onAssignDoctorToItem ? (
					<select
						value={item.doctorId || ""}
						onChange={(e) => {
							const doc = doctors.find((d) => d.id === e.target.value);
							onAssignDoctorToItem(item.id, doc?.id ?? null, doc?.fullName ?? null, doc?.specialty ?? null);
						}}
						className="stage-doctor-select"
						aria-label="Назначить врача на услугу"
					>
						<option value="">Не назначен</option>
						{doctors.map((d) => (
							<option key={d.id} value={d.id}>{d.fullName}</option>
						))}
					</select>
				) : (
					<span className="stage-doctor-label">{item.doctorName || "—"}</span>
				)}
			</div>

			<div className="stage-col-qty">
				{onUpdateItemQuantity ? (
					<div className="stage-qty-stepper">
						<button
							type="button"
							onClick={() => onUpdateItemQuantity(item.id, Math.max(1, qty - 1))}
							className="stage-qty-btn"
							data-testid={`dec-qty-${item.id}`}
							title="Уменьшить количество"
						>
							-
						</button>
						<span className="stage-qty-value font-mono">{qty}</span>
						<button
							type="button"
							onClick={() => onUpdateItemQuantity(item.id, qty + 1)}
							className="stage-qty-btn"
							data-testid={`inc-qty-${item.id}`}
							title="Увеличить количество"
						>
							+
						</button>
					</div>
				) : (
					<span className="font-mono font-bold text-xs">×{qty}</span>
				)}
			</div>

			<div className="stage-col-price font-mono">
				{unitPrice.toLocaleString("ru-RU")} ₽
			</div>

			<div className="stage-col-disc font-mono">
				{(item.discountRub || 0) > 0 ? `−${(item.discountRub || 0).toLocaleString("ru-RU")} ₽` : "—"}
			</div>

			<div className="stage-col-total font-mono font-bold">
				{(item.priceRub || 0).toLocaleString("ru-RU")} ₽
			</div>

			<div className="stage-col-actions">
				{onRemoveItem && (
					<button
						type="button"
						onClick={() => onRemoveItem(item.id)}
						className="stage-remove-item-btn"
						title={`Удалить «${item.name}»`}
						data-testid={`stage-remove-${item.id}`}
					>
						<Trash2 size={13} />
					</button>
				)}
			</div>
		</div>
	);
};
