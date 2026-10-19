import { Pause, UserCheck } from "lucide-react";

export interface VisitDoctorPresenceButtonProps {
	readonly isDoctorHere: boolean;
	readonly doctorElapsed: string;
	readonly onTogglePresence: () => void;
}

export function VisitDoctorPresenceButton({
	isDoctorHere,
	doctorElapsed,
	onTogglePresence,
}: VisitDoctorPresenceButtonProps) {
	return (
		<button
			type="button"
			onClick={onTogglePresence}
			data-testid="btn-toggle-doctor-presence"
			className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all shrink-0 ${
				isDoctorHere
					? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
					: "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
			}`}
			title={
				isDoctorHere
					? "Врач у кресла (нажмите, чтобы поставить работу на паузу при переходе)"
					: "Врач отошёл (таймер работы врача на паузе; нажмите для возобновления)"
			}
		>
			{isDoctorHere ? (
				<>
					<UserCheck
						size={13}
						className="shrink-0 text-emerald-600 dark:text-emerald-400"
					/>
					<span>Врач: {doctorElapsed}</span>
					<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
				</>
			) : (
				<>
					<Pause
						size={13}
						className="shrink-0 text-amber-600 dark:text-amber-400"
					/>
					<span>Врач (пауза): {doctorElapsed}</span>
				</>
			)}
		</button>
	);
}
