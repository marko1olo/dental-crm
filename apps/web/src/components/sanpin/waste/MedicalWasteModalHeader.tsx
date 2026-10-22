import { ShieldAlert, Sparkles, X } from "lucide-react";
import React from "react";

export interface MedicalWasteModalHeaderProps {
	onClose: () => void;
}

export function MedicalWasteModalHeader({ onClose }: MedicalWasteModalHeaderProps) {
	return (
		<header className="waste-modal-header">
			<div className="waste-header-title" id="waste-modal-title">
				<ShieldAlert size={24} className="text-[var(--teal,#0d9488)]" />
				<div>
					<div className="font-bold text-lg leading-tight flex items-center gap-1.5">
						<Sparkles size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span>Учет и передача отходов</span>
					</div>
					<div className="text-xs font-normal text-muted">
						Утилизация отходов • Весовой контроль • Акты передачи
					</div>
				</div>
			</div>

			<button
				type="button"
				className="waste-btn waste-btn-ghost p-2"
				onClick={onClose}
				aria-label="Закрыть окно учета медицинских отходов"
			>
				<X size={20} />
			</button>
		</header>
	);
}
