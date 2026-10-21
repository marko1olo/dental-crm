import { Check, Truck, X } from "lucide-react";
import type React from "react";
import {
	TRANSFER_STATUS_PIPELINE,
	type WarehouseTransferStatus,
} from "./warehouseTransferPresets.js";

export interface WarehouseTransferHeaderProps {
	readonly status: WarehouseTransferStatus;
	readonly onStatusChange: (status: WarehouseTransferStatus) => void;
	readonly onClose: () => void;
}

const STATUS_KEYS = ["draft", "requested", "dispatched", "in_transit", "received_ok"] as const;

export const WarehouseTransferHeader: React.FC<WarehouseTransferHeaderProps> = ({
	status,
	onStatusChange,
	onClose,
}) => {
	return (
		<>
			<header className="wh-transfer-header">
				<div className="wh-transfer-title" id="wh-modal-title">
					<Truck size={24} className="text-teal-600" />
					<div className="min-w-0">
						<div
							className="font-bold text-lg leading-tight truncate"
							title="Межфилиальное перемещение материалов"
						>
							Перемещение материалов
						</div>
						<div className="text-xs font-normal text-muted truncate">
							Складская логистика • Партионный учет • Сверка расхождений
						</div>
					</div>
				</div>

				<button
					type="button"
					className="wh-btn wh-btn-ghost !min-h-[32px] !min-w-[32px] h-8 w-8 p-1.5 rounded-lg"
					onClick={onClose}
					aria-label="Закрыть окно перемещения"
				>
					<X size={18} />
				</button>
			</header>

			<div className="px-6 pt-3 bg-paper-strong border-b border-line">
				<div className="wh-stepper">
					{STATUS_KEYS.map((st) => {
						const def = TRANSFER_STATUS_PIPELINE[st];
						const currentIdx = TRANSFER_STATUS_PIPELINE[status]?.stepIndex || 1;
						const isCompleted = currentIdx > def.stepIndex;
						const isActive = status === st;

						return (
							<div
								key={st}
								className={`wh-step-item cursor-pointer ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
								onClick={() => onStatusChange(st)}
							>
								<div className="wh-step-circle">
									{isCompleted ? <Check size={14} /> : def.stepIndex}
								</div>
								<span>{def.labelRu}</span>
							</div>
						);
					})}
				</div>
			</div>
		</>
	);
};
