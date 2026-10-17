import type React from "react";
import { Check } from "lucide-react";
import {
	type CanonicalLabOrderStatus,
	CANONICAL_LAB_STATUSES,
} from "../lab/labMath";
import "./LabOrderStatusStrip.css";

interface LabOrderStatusStripProps {
	canonicalStatus: CanonicalLabOrderStatus;
	orderId: string;
	onStatusTransition: (orderId: string, targetStatus: CanonicalLabOrderStatus) => void;
}

export const LabOrderStatusStrip: React.FC<LabOrderStatusStripProps> = ({
	canonicalStatus,
	orderId,
	onStatusTransition,
}) => (
	<div className="lab-status-strip-1line" role="group" aria-label="Статус наряда ЗТЛ">
		{CANONICAL_LAB_STATUSES.map((st) => {
			const isActive = canonicalStatus === st.id;
			return (
				<button
					key={st.id}
					type="button"
					onClick={() => onStatusTransition(orderId, st.id)}
					className={`lab-status-step ${isActive ? `is-active status-${st.id}` : ""}`}
					title={`Переключить статус на: ${st.label}`}
				>
					{isActive && <Check className="w-3 h-3" />}
					<span>{st.shortLabel}</span>
				</button>
			);
		})}
	</div>
);
