import type React from "react";
import { AlertCircle, AlertTriangle, ShieldCheck, XCircle } from "lucide-react";
import type { ChestnyZnakScannedItem } from "@dental/shared";

export interface MdlpStatusBadgeProps {
	readonly item: ChestnyZnakScannedItem;
}

export const MdlpStatusBadge: React.FC<MdlpStatusBadgeProps> = ({ item }) => {
	const { status, statusReason } = item;

	if (status === "verified") {
		return (
			<span className="mdlp-status-badge verified">
				<ShieldCheck className="w-3 h-3" />
				<span>Готово к выбытию</span>
			</span>
		);
	}

	if (status === "warning") {
		return (
			<span className="mdlp-status-badge warning" title={statusReason}>
				<AlertTriangle className="w-3 h-3" />
				<span>Требует внимания</span>
			</span>
		);
	}

	if (status === "expired") {
		return (
			<span className="mdlp-status-badge expired" title={statusReason}>
				<AlertCircle className="w-3 h-3" />
				<span>Просрочен</span>
			</span>
		);
	}

	if (status === "invalid_checksum") {
		return (
			<span className="mdlp-status-badge expired" title={statusReason}>
				<XCircle className="w-3 h-3" />
				<span>Ошибка кода</span>
			</span>
		);
	}

	return (
		<span className="mdlp-status-badge invalid" title={statusReason}>
			<AlertCircle className="w-3 h-3" />
			<span>Невалидный</span>
		</span>
	);
};
