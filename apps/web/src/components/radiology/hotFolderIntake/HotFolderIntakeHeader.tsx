import React from "react";
import { FolderSync, Wifi, X } from "lucide-react";
import type { HotFolderIntakeHeaderProps } from "./types";

export const HotFolderIntakeHeader: React.FC<HotFolderIntakeHeaderProps> = ({
	modalId,
	patientName,
	patientCardNumber,
	doctorName,
	onClose,
}) => {
	return (
		<header className="hfi-modal-header">
			<div className="hfi-header-left">
				<div className="hfi-header-icon-box">
					<FolderSync className="w-5 h-5" />
				</div>
				<div className="hfi-header-info">
					<div className="hfi-header-title-row">
						<h2 id={`${modalId}-title`} className="hfi-header-title">
							Папка автозахвата снимков (радиовизиография и ОПТГ)
						</h2>
						<span
							className="hfi-header-badge"
							title="Работает параллельно с Vatech EzDent-i, Carestream, Romexis без конфликта за USB"
							data-testid="hfi-non-conflicting-badge"
						>
							<Wifi className="w-3 h-3 text-emerald-400" />
							<span>Бесконфликтный автозахват (EzDent-i / Romexis)</span>
						</span>
					</div>
					<p className="hfi-header-subtitle">
						<span>
							Пациент: <strong className="text-[var(--ink)]">{patientName}</strong>
						</span>{" "}
						·{" "}
						<span>
							Медкарта: <strong className="text-[var(--ink)]">{patientCardNumber}</strong>
						</span>{" "}
						· <span>Врач: {doctorName}</span>
					</p>
				</div>
			</div>

			<div className="hfi-header-actions">
				<button
					type="button"
					onClick={onClose}
					className="hfi-close-btn"
					data-testid="hfi-close-modal-btn"
					aria-label="Закрыть модальное окно"
				>
					<X className="w-5 h-5" />
				</button>
			</div>
		</header>
	);
};
