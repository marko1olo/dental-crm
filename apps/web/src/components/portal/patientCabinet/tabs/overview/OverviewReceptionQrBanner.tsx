import React from "react";
import { QrCode, Sparkles } from "lucide-react";

export interface OverviewReceptionQrBannerProps {
	readonly onOpenReceptionQr: () => void;
}

export const OverviewReceptionQrBanner: React.FC<OverviewReceptionQrBannerProps> = ({
	onOpenReceptionQr,
}) => {
	return (
		<div className="pc-card pc-reception-qr-card" data-testid="reception-qr-banner">
			<div className="pc-reception-banner-content">
				<div className="pc-reception-icon-wrapper">
					<QrCode size={26} />
				</div>
				<div className="pc-reception-text">
					<h3 className="pc-reception-title">QR-код для стойки регистрации</h3>
					<p className="pc-reception-desc">
						Покажите экран администратору или поднесите к 2D-сканеру для моментальной отметки о прибытии
					</p>
				</div>
				<button
					type="button"
					className="pc-btn-primary pc-reception-open-btn"
					onClick={onOpenReceptionQr}
					data-testid="btn-show-reception-qr"
				>
					<Sparkles size={16} />
					<span>Показать администратору</span>
				</button>
			</div>
		</div>
	);
};
