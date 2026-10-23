import type React from "react";
import { QrCode, X } from "lucide-react";

export interface MdlpHeaderTitleProps {
	readonly clinicName: string;
	readonly onClose: () => void;
}

export const MdlpHeaderTitle: React.FC<MdlpHeaderTitleProps> = ({
	clinicName,
	onClose,
}) => {
	return (
		<header className="mdlp-header">
			<div className="mdlp-header-title-group">
				<div className="mdlp-header-icon" aria-hidden="true">
					<QrCode className="w-5 h-5" />
				</div>
				<div>
					<h2 id="mdlp-modal-title" className="mdlp-header-title">
						<span>Маркировка препаратов · Честный Знак</span>
						<span className="sr-only">Честный ЗНАК · ИС МДЛП</span>
						<span className="mdlp-badge-version">Приёмка и списание</span>
						<span className="sr-only">СХЕМА 701 / 531</span>
					</h2>
					<p className="mdlp-header-subtitle">
						Сканирование упаковок, приёмка накладных и списание при лечении · {clinicName}
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="mdlp-close-btn"
				data-testid="close-mdlp-modal-btn"
				aria-label="Закрыть окно маркировки препаратов"
			>
				<X className="w-5 h-5" />
			</button>
		</header>
	);
};
