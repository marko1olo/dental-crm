import React from "react";
import { Radio, Stethoscope } from "lucide-react";
import { formatNetworkStatusInfo } from "./kickoffFormatters";

export interface DoctorKickoffHeaderProps {
	readonly greeting: string;
	readonly summary: string;
	readonly offlineMode: boolean;
}

export function DoctorKickoffHeader({
	greeting,
	summary,
	offlineMode,
}: DoctorKickoffHeaderProps) {
	const networkInfo = formatNetworkStatusInfo(offlineMode);

	return (
		<div className="doctor-kickoff-header">
			<div className="doctor-kickoff-title-group">
				<div className="doctor-kickoff-icon-box" aria-hidden="true">
					<Stethoscope size={20} className="doctor-kickoff-icon" />
				</div>
				<div className="doctor-kickoff-text min-w-0">
					<h2 className="doctor-kickoff-greeting truncate">{greeting}</h2>
					<p className="doctor-kickoff-summary">{summary}</p>
				</div>
			</div>

			<div
				className={`doctor-kickoff-telemetry ${networkInfo.badgeType === "offline" ? "telemetry-offline" : "telemetry-online"}`}
				role="status"
				aria-label={networkInfo.ariaLabel}
			>
				{offlineMode ? (
					<>
						<Radio size={13} aria-hidden="true" className="telemetry-icon" />
						<span>📡 Автономный режим (Локальная сеть)</span>
					</>
				) : (
					<>
						<span className="telemetry-dot" aria-hidden="true">
							🟢
						</span>
						<span>Сервер подключен</span>
					</>
				)}
			</div>
		</div>
	);
}
