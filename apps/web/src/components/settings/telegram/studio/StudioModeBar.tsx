import React from "react";
import { Compass, Maximize2, Sliders } from "lucide-react";

interface StudioModeBarProps {
	studioMode: "wizard" | "advanced";
	onSelectMode: (mode: "wizard" | "advanced") => void;
	onOpenModal: () => void;
}

export const StudioModeBar: React.FC<StudioModeBarProps> = ({
	studioMode,
	onSelectMode,
	onOpenModal,
}) => {
	return (
		<div className="tg-mode-switch-bar">
			<div className="tg-mode-switch-group" role="tablist">
				<button
					type="button"
					role="tab"
					aria-selected={studioMode === "wizard"}
					onClick={() => onSelectMode("wizard")}
					className={`tg-mode-btn ${studioMode === "wizard" ? "active" : ""}`}
				>
					<Compass size={15} />
					<span>Пошаговый мастер запуска (4 шага)</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={studioMode === "advanced"}
					onClick={() => onSelectMode("advanced")}
					className={`tg-mode-btn ${studioMode === "advanced" ? "active" : ""}`}
				>
					<Sliders size={15} />
					<span>Тонкие настройки и пресеты</span>
				</button>
			</div>

			<div className="tg-mode-meta-actions">
				<button
					type="button"
					onClick={onOpenModal}
					className="tg-fullscreen-btn secondary-button compact-button"
					title="Развернуть студию на весь экран"
				>
					<Maximize2 size={13} />
					<span>На весь экран</span>
				</button>
			</div>
		</div>
	);
};
