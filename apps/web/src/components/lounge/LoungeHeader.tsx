import React from "react";
import { LogOut, Maximize2, Minimize2, Sparkles, Stethoscope, Volume2, VolumeX } from "lucide-react";
import "./loungeHeader.css";

export interface LoungeHeaderProps {
	readonly clinicName: string;
	readonly isSoundEnabled: boolean;
	readonly isFullscreen: boolean;
	readonly onToggleSound: () => void;
	readonly onToggleFullscreen: () => void;
	readonly onExit: () => void;
}

export const LoungeHeader: React.FC<LoungeHeaderProps> = ({
	clinicName,
	isSoundEnabled,
	isFullscreen,
	onToggleSound,
	onToggleFullscreen,
	onExit,
}) => {
	return (
		<header className="lounge-header lounge-glass-card" data-testid="lounge-header">
			<div className="lounge-header-brand">
				<div className="lounge-brand-logo-wrap" aria-hidden="true">
					<Stethoscope className="lounge-brand-logo-icon" />
				</div>
				<div className="lounge-brand-titles">
					<span className="lounge-brand-name">{clinicName}</span>
					<span className="lounge-brand-subtitle">Зона ожидания • Электронное табло</span>
				</div>
			</div>

			<div className="lounge-header-welcome">
				<span className="lounge-welcome-beacon" aria-hidden="true" />
				<span>Добро пожаловать! Ожидайте вызова вашего врача на табло.</span>
			</div>

			<div className="lounge-header-actions">
				<div className="lounge-badge-slot">
					<Sparkles size={14} className="lounge-comfort-icon" aria-hidden="true" />
					<span>Приём пациентов</span>
				</div>

				<button
					type="button"
					onClick={onToggleSound}
					className="lounge-icon-btn"
					title={isSoundEnabled ? "Звуковой сигнал включен" : "Включить звук оповещений"}
					aria-label={isSoundEnabled ? "Выключить звук" : "Включить звук"}
				>
					{isSoundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
				</button>

				<button
					type="button"
					onClick={onToggleFullscreen}
					className="lounge-icon-btn"
					title={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим ТВ"}
					aria-label="Полноэкранный режим"
				>
					{isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
				</button>

				<button
					type="button"
					onClick={onExit}
					className="lounge-icon-btn"
					title="Вернуться в расписание клиники"
					aria-label="Выход в CRM"
				>
					<LogOut size={18} />
				</button>
			</div>
		</header>
	);
};
