import { FileCheck, Printer } from "lucide-react";
import type React from "react";
import { formatShortDate, type WarrantyRemediationOrder } from "../../warrantyEngine.js";

export interface WarrantyRemediationsHistoryProps {
	certificateId: string;
	remediations: WarrantyRemediationOrder[];
	onPrintRemediationAct: (order: WarrantyRemediationOrder) => void;
}

export const WarrantyRemediationsHistory: React.FC<WarrantyRemediationsHistoryProps> = ({
	certificateId,
	remediations,
	onPrintRemediationAct,
}) => {
	if (remediations.length === 0) return null;

	return (
		<div className="warranty-remediation-history-card">
			<div className="warranty-section-header">
				<h4 style={{ margin: 0 }}>
					<FileCheck size={16} />
					Оформленные гарантийные акты по сертификату {certificateId} ({remediations.length}):
				</h4>
			</div>
			<div className="warranty-remediations-list">
				{remediations.map((rem) => (
					<div key={rem.id} className="warranty-remediation-item-card">
						<div className="rem-card-head">
							<div className="rem-card-head-left">
								<strong className="rem-card-number">{rem.orderNumber}</strong>
								<span className="rem-card-tooth">Зуб {rem.toothNumber}</span>
								<span className="rem-card-date">
									{formatShortDate(rem.performedAtIso.slice(0, 10))}
								</span>
							</div>
							<div className="rem-card-badge-free">0 ₽ (Скидка 100%)</div>
						</div>
						<div className="rem-card-body">
							<p><strong>Дефект:</strong> {rem.defectTitle}</p>
							<p><strong>Манипуляция:</strong> {rem.remediationAction}</p>
							<p className="rem-materials">
								<strong>Списано со склада:</strong>{" "}
								{rem.materialsDeducted.map((m) => `${m.name} (${m.quantity} ${m.unit})`).join(", ")}
							</p>
						</div>
						<div className="rem-card-actions">
							<button
								type="button"
								className="warranty-btn-secondary"
								onClick={() => onPrintRemediationAct(rem)}
								title="Распечатать отдельный Акт устранения дефекта (0 ₽)"
							>
								<Printer size={14} />
								Печать Акта (0 ₽)
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
