import { Plus, ShieldCheck } from "lucide-react";
import React from "react";

export interface AutoclaveNoDevicesEmptyStateProps {
	readonly onOpenEquipmentModal: () => void;
}

export function AutoclaveNoDevicesEmptyState({ onOpenEquipmentModal }: AutoclaveNoDevicesEmptyStateProps) {
	return (
		<tr>
			<td colSpan={9} style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: "0.75rem",
						maxWidth: "560px",
						margin: "0 auto",
					}}
				>
					<ShieldCheck size={42} color="var(--teal, #0d9488)" />
					<div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--ink, #0f172a)" }}>
						В клинике не зарегистрировано автоклавов
					</div>
					<div style={{ fontSize: "0.875rem", color: "var(--muted, #64748b)", lineHeight: 1.45 }}>
						Зарегистрируйте автоклав или сухожаровой шкаф клиники для ведения журнала
						стерилизации и генерации крафт-пакетов.
					</div>
					<button
						type="button"
						onClick={onOpenEquipmentModal}
						className="sanpin-btn sanpin-btn-primary"
						style={{
							minHeight: "44px",
							padding: "0.5rem 1.5rem",
							fontSize: "0.875rem",
							fontWeight: 700,
							display: "inline-flex",
							alignItems: "center",
							gap: "0.4rem",
							marginTop: "0.25rem",
						}}
						data-testid="add-first-autoclave-table-btn"
					>
						<Plus size={16} /> <span>Зарегистрировать автоклав клиники</span>
					</button>
				</div>
			</td>
		</tr>
	);
}
