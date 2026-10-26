import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export interface SbpExpiredBannerProps {
	readonly onRefresh: () => void;
}

export const SbpExpiredBanner: React.FC<SbpExpiredBannerProps> = ({ onRefresh }) => {
	return (
		<div className="sbp-expired-banner" data-testid="sbp-expired-banner">
			<AlertCircle size={48} className="sbp-expired-icon" />
			<h3>Время действия QR-кода истекло</h3>
			<p>Динамический QR-код действует ровно 15 минут в целях безопасности.</p>
			<button
				type="button"
				className="sbp-btn sbp-btn-primary min-h-[44px] cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white font-medium"
				onClick={onRefresh}
			>
				<RefreshCw size={16} /> Сгенерировать новый QR-код
			</button>
		</div>
	);
};
