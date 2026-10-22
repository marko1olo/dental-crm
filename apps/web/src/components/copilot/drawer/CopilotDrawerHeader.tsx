import React from "react";
import { Layers, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import type { CopilotPhase } from "../copilotTypes";

interface CopilotDrawerHeaderProps {
	busy: boolean;
	phase: CopilotPhase;
	onClose: () => void;
	onReset: () => void;
}

export const CopilotDrawerHeader: React.FC<CopilotDrawerHeaderProps> = ({
	busy,
	phase,
	onClose,
	onReset,
}) => {
	const handleSwitchToHUD = () => {
		onClose();
		window.dispatchEvent(new CustomEvent("dente:open-chairside-hud"));
	};

	return (
		<>
			<div className="copilot-drawer-drag-handle" aria-hidden="true" />
			<header className="copilot-header">
				<div className="copilot-header-brand">
					<div className="copilot-header-icon">
						<Sparkles size={18} />
					</div>
					<div>
						<h3 className="copilot-header-title">
							<span>ДЕНТА — Клинический ассистент</span>
							<span className="copilot-header-badge">Копилот</span>
						</h3>
						<div
							style={{
								fontSize: "12px",
								color: "var(--muted)",
								display: "flex",
								alignItems: "center",
								gap: "5px",
								marginTop: "2px",
							}}
						>
							{busy ? (
								<span
									style={{
										display: "flex",
										alignItems: "center",
										gap: "4px",
										color: "var(--teal)",
									}}
								>
									<Loader2 size={12} className="animate-spin" />
									{phase === "working"
										? "Выполняет инструменты..."
										: "Печатает ответ..."}
								</span>
							) : (
								<span>Готов к работе • Split-View</span>
							)}
						</div>
					</div>
				</div>

				<div className="copilot-header-actions">
					<button
						type="button"
						onClick={handleSwitchToHUD}
						className="copilot-icon-btn"
						title="Переключить в кресельный HUD (Alt+C)"
						aria-label="Кресельный HUD"
						data-testid="btn-switch-to-hud"
					>
						<Layers size={16} />
					</button>
					<button
						type="button"
						onClick={onReset}
						className="copilot-icon-btn"
						title="Начать новый диалог"
					>
						<RotateCcw size={16} />
					</button>
					<button
						type="button"
						onClick={onClose}
						className="copilot-icon-btn"
						title="Свернуть панель"
					>
						<X size={18} />
					</button>
				</div>
			</header>
		</>
	);
};
