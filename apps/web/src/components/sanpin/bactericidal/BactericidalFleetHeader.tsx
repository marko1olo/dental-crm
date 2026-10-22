import React from "react";
import { Clock, Plus, Wind } from "lucide-react";

interface BactericidalFleetHeaderProps {
	equipmentCount: number;
	submitting: boolean;
	onOpenAddEquipModal: () => void;
	onOpenLogModal: () => void;
}

export function BactericidalFleetHeader({
	equipmentCount,
	submitting,
	onOpenAddEquipModal,
	onOpenLogModal,
}: BactericidalFleetHeaderProps) {
	return (
		<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
			<h3 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
				<Wind size={18} color="var(--brand-primary)" />
				Парк бактерицидных облучателей и рециркуляторов клиники ({equipmentCount} шт.)
			</h3>
			<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
				<button
					type="button"
					onClick={onOpenAddEquipModal}
					className="sanpin-btn sanpin-btn-secondary touch-manipulation"
					style={{ minHeight: "44px" }}
				>
					<Plus size={15} /> Добавить аппарат в реестр
				</button>
				<button
					type="button"
					onClick={onOpenLogModal}
					aria-busy={submitting}
					className="sanpin-btn sanpin-btn-primary touch-manipulation"
					style={{ minHeight: "44px", opacity: submitting ? 0.7 : 1 }}
					data-testid="bactericidal-manual-session-btn"
				>
					<Clock size={15} /> Внести сеанс облучения
				</button>
			</div>
		</div>
	);
}
