import React from "react";
import { Sparkles, X } from "lucide-react";

export interface LoyaltyModalHeaderProps {
	readonly clinicName: string;
	readonly patientName: string;
	readonly medicalCardNumber?: string | undefined;
	readonly onClose: () => void;
}

export const LoyaltyModalHeader: React.FC<LoyaltyModalHeaderProps> = ({
	clinicName,
	patientName,
	medicalCardNumber = "",
	onClose,
}) => {
	const formattedCardNumber = medicalCardNumber?.startsWith("№")
		? medicalCardNumber
		: `№ ${medicalCardNumber || "—"}`;

	return (
		<>
			{/* Apple iOS HIG Drag Handle for Mobile Bottom Sheet */}
			<div className="loyalty-modal-drag-handle" aria-hidden="true" />

			<header className="loyalty-modal-header">
				<div className="loyalty-modal-title-wrap">
					<div className="loyalty-modal-icon-badge">
						<Sparkles size={22} />
					</div>
					<div>
						<h2 id="loyalty-modal-title" className="loyalty-modal-title">
							Студия лояльности и бонусов • {clinicName}
						</h2>
						<p className="loyalty-modal-subtitle">
							Пациент: <strong>{patientName}</strong> (карта {formattedCardNumber}) •
							Программа лояльности без пирамид и криптотокенов
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="loyalty-close-btn"
					aria-label="Закрыть окно программы лояльности"
				>
					<X size={20} />
				</button>
			</header>
		</>
	);
};
