import { UserPlus, X } from "lucide-react";
import React from "react";

export interface PatientCreationModalHeaderProps {
	readonly onClose: () => void;
}

export function PatientCreationModalHeader({ onClose }: PatientCreationModalHeaderProps) {
	return (
		<>
			{/* Tactile Drag Handle for Mobile Bottom Sheet (Apple HIG) */}
			<div className="create-patient-modal-drag-handle-wrap" aria-hidden="true">
				<div className="create-patient-modal-drag-handle" />
			</div>

			<header className="create-patient-modal-header">
				<div className="create-patient-modal-title-wrap">
					<div className="create-patient-modal-icon-badge" aria-hidden="true">
						<UserPlus size={20} />
					</div>
					<div>
						<h2 id="create-patient-modal-title" className="create-patient-modal-title">
							Новый пациент
						</h2>
						<p className="create-patient-modal-subtitle">Регистрация медицинской карты пациента</p>
					</div>
				</div>
				<button
					type="button"
					className="create-patient-modal-close-btn"
					onClick={onClose}
					aria-label="Закрыть модальное окно"
					title="Закрыть (Esc)"
				>
					<X size={20} aria-hidden="true" />
				</button>
			</header>
		</>
	);
}
