import React from "react";
import { Monitor, X } from "lucide-react";

export interface QueueBillboardHeaderProps {
	readonly clinicName: string;
	readonly clinicSubtitle: string;
	readonly currentTime: string;
	readonly currentDate: string;
	readonly onClose?: (() => void) | undefined;
}

export const QueueBillboardHeader: React.FC<QueueBillboardHeaderProps> = ({
	clinicName,
	clinicSubtitle,
	currentTime,
	currentDate,
	onClose,
}) => {
	return (
		<header className="queue-billboard-header" data-testid="queue-billboard-header">
			<div className="queue-billboard-brand">
				<div className="queue-billboard-logo-badge" aria-hidden="true">
					<Monitor size={26} />
				</div>
				<div>
					<h1 className="queue-billboard-title">{clinicName}</h1>
					<p className="queue-billboard-subtitle">{clinicSubtitle}</p>
				</div>
			</div>

			<div className="queue-billboard-clock-hud">
				<div>
					<div className="queue-billboard-clock-time" data-testid="billboard-clock-time">
						{currentTime}
					</div>
					<div className="queue-billboard-clock-date">{currentDate}</div>
				</div>

				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="inline-flex h-10 min-h-[44px] sm:h-9 sm:min-h-[36px] items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 text-xs font-bold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shadow-xs select-none"
						aria-label="Закрыть режим ТВ-табло"
						data-testid="queue-billboard-close-btn"
					>
						<X size={15} />
						<span>Закрыть табло</span>
					</button>
				)}
			</div>
		</header>
	);
};
