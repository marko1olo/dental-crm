import React, { useEffect, useState } from "react";
import { AlertTriangle, Clock, Mic, ShieldCheck, User } from "lucide-react";

interface DoctorDesktopHeaderProps {
	patientName: string;
	appointmentReason?: string;
	scheduledEndsAt?: string;
	hasClinicalWarnings?: boolean;
	hasUnsignedConsents?: boolean;
	onOpenDictation?: () => void;
	onOpenImaging?: () => void;
}

export const DoctorDesktopHeader: React.FC<DoctorDesktopHeaderProps> = ({
	patientName,
	appointmentReason = "Первичный прием",
	scheduledEndsAt,
	hasClinicalWarnings = false,
	hasUnsignedConsents = false,
	onOpenDictation,
	onOpenImaging,
}) => {
	const [timeLeftMinutes, setTimeLeftMinutes] = useState<number | null>(null);

	useEffect(() => {
		if (!scheduledEndsAt) return;
		const updateTimer = () => {
			const diffMs = Date.parse(scheduledEndsAt) - Date.now();
			const mins = Math.max(0, Math.floor(diffMs / 60000));
			setTimeLeftMinutes(mins);
		};
		updateTimer();
		const interval = setInterval(updateTimer, 30000);
		return () => clearInterval(interval);
	}, [scheduledEndsAt]);

	return (
		<div
			data-testid="doctor-desktop-header"
			className="p-3 mb-4 rounded-xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-slate-700 text-slate-100 shadow-md"
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center space-x-3">
					<div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
						<User className="w-5 h-5" />
					</div>
					<div>
						<div className="flex items-center space-x-2">
							<h3 className="font-semibold text-base">{patientName}</h3>
							{hasClinicalWarnings && (
								<span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
									<AlertTriangle className="w-3 h-3" />
									<span>Внимание / Аллергия</span>
								</span>
							)}
							{hasUnsignedConsents && (
								<span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-1">
									<ShieldCheck className="w-3 h-3" />
									<span>Согласия не подписаны</span>
								</span>
							)}
						</div>
						<p className="text-xs text-slate-400 mt-0.5">Причина: {appointmentReason}</p>
					</div>
				</div>

				<div className="flex items-center space-x-3">
					{timeLeftMinutes !== null && (
						<div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono">
							<Clock className="w-4 h-4 text-sky-400" />
							<span>Осталось: <strong className="text-sky-300">{timeLeftMinutes} мин</strong></span>
						</div>
					)}
					{onOpenDictation && (
						<button
							type="button"
							onClick={onOpenDictation}
							className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 transition-colors"
						>
							<Mic className="w-3.5 h-3.5" />
							<span>Диктовка ЭМК</span>
						</button>
					)}
					{onOpenImaging && (
						<button
							type="button"
							onClick={onOpenImaging}
							className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 transition-colors"
						>
							<span>КТ / Снимки</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);
};
