import React from "react";
import { AlertCircle, Check, RefreshCw } from "lucide-react";
import type { SbpPaymentStatus } from "../omnichannelTypes.js";

export interface SbpLiveStatusPillProps {
	readonly status: SbpPaymentStatus;
	readonly isManualReconciliation: boolean;
}

export const SbpLiveStatusPill: React.FC<SbpLiveStatusPillProps> = ({
	status,
	isManualReconciliation,
}) => {
	return (
		<div className={`sbp-live-status-pill status-${status}`}>
			{status === "awaiting_scan" && (
				<>
					<span className="sbp-pulse-dot" />
					<span>Ожидание сканирования пациентом...</span>
				</>
			)}
			{status === "scanned" && (
				<>
					<RefreshCw size={14} className="sbp-spin-icon" />
					<span>QR-код отсканирован, ожидание подтверждения в банке...</span>
				</>
			)}
			{status === "paid_success" && (
				<>
					<Check size={14} />
					<span>
						{isManualReconciliation
							? "Зачисление подтверждено кассиром (ручная сверка)"
							: "Платеж зачислен на расчетный счет"}
					</span>
				</>
			)}
			{status === "expired" && (
				<>
					<AlertCircle size={14} />
					<span>Код аннулирован</span>
				</>
			)}
		</div>
	);
};
