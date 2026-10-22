import React from "react";
import { X, Printer } from "lucide-react";
import { BracesBracket } from "../../icons/DentalIcons";
import type { OrthodonticPhotoSession } from "@dental/shared";

interface OrthoModalHeaderProps {
	session: OrthodonticPhotoSession;
	patientName: string;
	doctorName: string;
	clinicName: string;
	onExportPresentation: () => void;
	onClose: () => void;
}

export const OrthoModalHeader: React.FC<OrthoModalHeaderProps> = ({
	session,
	patientName,
	doctorName,
	clinicName,
	onExportPresentation,
	onClose,
}) => {
	return (
		<header className="ortho-modal-header">
			<div className="ortho-header-left">
				<div className="ortho-header-icon">
					<BracesBracket size={20} />
				</div>
				<div>
					<h2 className="ortho-header-title">Ортодонтический фотопротокол (8 ракурсов)</h2>
					<div className="ortho-header-subtitle">
						<span>Пациент: <strong>{session.patientName || patientName}</strong></span>
						<span>•</span>
						<span>Врач: {session.doctorName || doctorName}</span>
						<span>•</span>
						<span>{session.clinicName || clinicName}</span>
					</div>
				</div>
			</div>

			<div className="ortho-header-actions">
				<button
					type="button"
					onClick={onExportPresentation}
					className="ortho-tool-btn ortho-export-btn min-h-[44px] px-3.5 py-2 inline-flex items-center gap-2"
					title="Сформировать презентацию и распечатать в PDF"
					data-testid="export-ortho-pdf-btn"
				>
					<Printer size={15} />
					<span>Печать / PDF</span>
				</button>
				<button
					type="button"
					onClick={onClose}
					className="ortho-slot-btn min-w-[44px] min-h-[44px] p-2 inline-flex items-center justify-center"
					aria-label="Закрыть модальное окно"
					data-testid="close-ortho-modal-btn"
				>
					<X size={18} />
				</button>
			</div>
		</header>
	);
};
