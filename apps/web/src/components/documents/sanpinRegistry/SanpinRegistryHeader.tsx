import React from "react";
import { Building, X } from "lucide-react";
import type { Patient } from "@dental/shared";

export interface SanpinRegistryHeaderProps {
	patient: Patient | null;
	onClose: () => void;
}

export const SanpinRegistryHeader: React.FC<SanpinRegistryHeaderProps> = ({ patient, onClose }) => {
	return (
		<div className="document-package-modal-header">
			<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
				<Building size={24} color="var(--brand-700, #0d9488)" aria-hidden="true" />
				<div>
					<h3 id="sanpin-package-title" style={{ margin: 0 }}>
						Пакет «Безопасность, стандарты и справки»
					</h3>
					<span style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
						{patient ? `Пациент: ${patient.fullName}` : "Стандарты безопасности, больничные листы и учёт"}
					</span>
				</div>
			</div>
			<button
				type="button"
				className="document-package-close-btn"
				onClick={onClose}
				aria-label="Закрыть модальное окно"
			>
				<X size={20} aria-hidden="true" />
			</button>
		</div>
	);
};
