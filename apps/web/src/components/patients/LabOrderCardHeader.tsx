import type React from "react";
import { Calendar } from "lucide-react";
import { money } from "../../AppHelpers";
import type { LabOrder } from "./LabOrdersPanel";

export const LabOrderCardHeader: React.FC<{ order: LabOrder }> = ({ order }) => (
	<div className="lab-order-main-row">
		<div className="lab-order-info-group">
			<div className="fdi-badge-compact">Зуб {order.toothFdi || "—"}</div>
			<div className="lab-order-title-block">
				<strong>{order.patientName || "Пациент"}</strong>
				<div className="lab-order-spec-line">
					<span className="lab-order-spec-chip">{order.material || "Цирконий"}</span>
					<span>·</span>
					<span>Цвет VITA: <strong className="text-[var(--teal)]">{order.colorVita || "A2"}</strong></span>
					{order.doctorName && <><span>·</span><span>Врач: {order.doctorName}</span></>}
					{order.dueDate && (
						<>
							<span>·</span>
							<span className="text-[var(--ink)] font-semibold flex items-center gap-1">
								<Calendar className="w-3 h-3 text-[var(--teal)]" />
								Срок: {new Date(order.dueDate).toLocaleDateString("ru-RU")}
							</span>
						</>
					)}
				</div>
			</div>
		</div>
		<div className="lab-card-financials">
			<span>Себестоимость:</span>
			<span className="lab-card-price">{order.priceRub != null ? money(order.priceRub) : "—"}</span>
		</div>
	</div>
);
