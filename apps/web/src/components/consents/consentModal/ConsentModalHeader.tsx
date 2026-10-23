import { ShieldCheck, X } from "lucide-react";
import React from "react";

export interface ConsentModalHeaderProps {
	activeMode: "packages" | "single";
	packageDocsCount: number;
	isMobile: boolean;
	onClose: () => void;
}

export const ConsentModalHeader: React.FC<ConsentModalHeaderProps> = ({
	activeMode,
	packageDocsCount,
	isMobile,
	onClose,
}) => {
	return (
		<>
			{/* Тактильный Drag Handle для Apple iOS Bottom Sheet (<= 768px) */}
			<div className="consent-mobile-drag-handle" aria-hidden="true">
				<div className="consent-mobile-drag-handle-bar" />
			</div>

			<header className="consent-header">
				<div className="consent-header-titles min-w-0 flex-1">
					<div className="consent-header-badge-row">
						<span className="consent-statutory-badge shrink-0">
							<ShieldCheck size={14} />
							Официальная медицинская форма
						</span>
						<span className="consent-code-badge shrink-0">
							{activeMode === "packages" ? `Пакет (${packageDocsCount} док.)` : "Бланк согласия"}
						</span>
					</div>
					<h2 id="consent-modal-title" className="consent-title truncate">
						{isMobile
							? activeMode === "packages"
								? "Пакет согласий на лечение"
								: "Информированное согласие"
							: activeMode === "packages"
							? "Пакет информированных добровольных согласий"
							: "Информированное согласие на лечение"}
					</h2>
				</div>
				<button
					type="button"
					className="consent-close-btn"
					onClick={onClose}
					aria-label="Закрыть окно согласия"
				>
					<X size={22} />
				</button>
			</header>
		</>
	);
};
