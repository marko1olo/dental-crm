import { RotateCcw, X } from "lucide-react";
import type { DentalLabWorkflowOrder } from "../dentalLabWorkflowEngine";
import type { LabTechnologicalStageId } from "../orders/labWorkOrderPresets";
import { DentalLabOrderInspectFooter } from "./DentalLabOrderInspectFooter";
import { DentalLabOrderInspectMeta } from "./DentalLabOrderInspectMeta";
import { DentalLabOrderStageHistory } from "./DentalLabOrderStageHistory";
import { DentalLabOrderTechStagesGrid } from "./DentalLabOrderTechStagesGrid";

export interface DentalLabOrderInspectCardProps {
	readonly order: DentalLabWorkflowOrder;
	readonly onClose: () => void;
	readonly onPrintBlank: (order: DentalLabWorkflowOrder) => void;
	readonly onAdvanceTechStage: (
		order: DentalLabWorkflowOrder,
		targetTechStage?: LabTechnologicalStageId,
	) => void;
	readonly onOpenWarrantyRework: (order: DentalLabWorkflowOrder) => void;
	readonly onView3DScan?: (order: DentalLabWorkflowOrder) => void;
}

export function DentalLabOrderInspectCard({
	order,
	onClose,
	onPrintBlank,
	onAdvanceTechStage,
	onOpenWarrantyRework,
	onView3DScan,
}: DentalLabOrderInspectCardProps) {
	return (
		<div className="ztl-detail-overlay">
			<div className="ztl-detail-card">
				<header className="ztl-detail-header">
					<h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
						Детали наряд-заказа № {order.orderNumber}
					</h3>
					<button type="button" className="ztl-btn-icon" onClick={onClose}>
						<X size={16} />
					</button>
				</header>

				<div className="ztl-detail-body space-y-3">
					{order.isWarrantyRework && (
						<div
							style={{
								background: "rgba(225, 29, 72, 0.08)",
								border: "1px solid rgba(225, 29, 72, 0.3)",
								color: "var(--bad-fg, #e11d48)",
								padding: "8px 12px",
								borderRadius: "6px",
								fontSize: "12px",
								display: "flex",
								alignItems: "center",
								gap: "8px",
							}}
						>
							<RotateCcw size={16} color="var(--bad-fg, #e11d48)" />
							<div>
								<strong>Гарантийная рекламация!</strong> Исходный наряд:{" "}
								<strong>
									№ {order.originalOrderNumber || order.originalOrderId}
								</strong>
								{order.reworkReason && (
									<div style={{ fontSize: "11px", marginTop: "2px" }}>
										Причина: {order.reworkReason}
									</div>
								)}
							</div>
						</div>
					)}

					<DentalLabOrderInspectMeta order={order} />
					<DentalLabOrderTechStagesGrid
						order={order}
						onAdvanceTechStage={onAdvanceTechStage}
					/>
					<DentalLabOrderStageHistory order={order} />
				</div>

				<DentalLabOrderInspectFooter
					order={order}
					onClose={onClose}
					onPrintBlank={onPrintBlank}
					onOpenWarrantyRework={onOpenWarrantyRework}
					onView3DScan={onView3DScan}
				/>
			</div>
		</div>
	);
}
