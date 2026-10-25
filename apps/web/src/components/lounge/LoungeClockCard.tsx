import React from "react";
import { Calendar, Clock, Coffee, ShieldCheck, Sparkles, Wifi } from "lucide-react";
import "./loungeClock.css";

export interface LoungeClockCardProps {
	readonly currentTime: Date;
}

export const LoungeClockCard: React.FC<LoungeClockCardProps> = ({ currentTime }) => {
	const hours = String(currentTime.getHours()).padStart(2, "0");
	const minutes = String(currentTime.getMinutes()).padStart(2, "0");
	const seconds = String(currentTime.getSeconds()).padStart(2, "0");

	const formattedDate = React.useMemo(() => {
		const raw = new Intl.DateTimeFormat("ru-RU", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
		}).format(currentTime);
		return raw.charAt(0).toUpperCase() + raw.slice(1);
	}, [currentTime]);

	return (
		<section className="lounge-left-col">
			<div className="lounge-clock-card lounge-glass-card">
				<div className="lounge-clock-header">
					<Clock size={16} aria-hidden="true" />
					<span>Точное время клиники</span>
				</div>

				<div className="lounge-clock-time-wrap">
					<span className="lounge-clock-time">{hours}:{minutes}</span>
					<span className="lounge-clock-seconds">:{seconds}</span>
				</div>

				<div className="lounge-clock-date">{formattedDate}</div>

				<div className="lounge-clock-footer">
					<Calendar size={14} aria-hidden="true" />
					<span>Приём ведётся строго по расписанию</span>
				</div>
			</div>

			<div className="lounge-comfort-card lounge-glass-card">
				<div className="lounge-comfort-title">
					<Sparkles size={18} className="lounge-comfort-icon" aria-hidden="true" />
					<span>Комфорт в зоне ожидания</span>
				</div>

				<div className="lounge-comfort-list">
					<div className="lounge-comfort-item">
						<Coffee size={18} className="lounge-comfort-icon" aria-hidden="true" />
						<span>Свежий зерновой кофе, чай и вода</span>
					</div>
					<div className="lounge-comfort-item">
						<Wifi size={18} className="lounge-comfort-icon" aria-hidden="true" />
						<span>Скоростной Wi-Fi: Dente_Guest</span>
					</div>
					<div className="lounge-comfort-item">
						<ShieldCheck size={18} className="lounge-comfort-icon" aria-hidden="true" />
						<span>Дезинфекция воздуха и санитарный контроль</span>
					</div>
				</div>
			</div>
		</section>
	);
};
