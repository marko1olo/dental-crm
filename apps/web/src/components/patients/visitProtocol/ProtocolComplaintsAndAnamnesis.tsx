import React from "react";
import { Activity, Clock } from "lucide-react";

export interface ProtocolComplaintsAndAnamnesisProps {
	readonly complaints: string;
	readonly anamnesis: string;
	readonly onChangeComplaints: (val: string) => void;
	readonly onChangeAnamnesis: (val: string) => void;
}

export const ProtocolComplaintsAndAnamnesis: React.FC<ProtocolComplaintsAndAnamnesisProps> = ({
	complaints,
	anamnesis,
	onChangeComplaints,
	onChangeAnamnesis,
}) => {
	return (
		<>
			<div className="flex flex-col gap-1.5">
				<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Activity className="w-3.5 h-3.5 text-rose-500" />
					<span>Жалобы пациента:</span>
				</label>
				<textarea
					rows={3}
					value={complaints}
					onChange={(e) => onChangeComplaints(e.target.value)}
					className="w-full p-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y"
					placeholder="Характер болей, температурные раздражители, давность возникновения..."
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Clock className="w-3.5 h-3.5 text-blue-500" />
					<span>Анамнез заболевания и соматический статус:</span>
				</label>
				<textarea
					rows={3}
					value={anamnesis}
					onChange={(e) => onChangeAnamnesis(e.target.value)}
					className="w-full p-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all resize-y"
					placeholder="Развитие заболевания, перенесенные вмешательства, аллергии, соматика..."
				/>
			</div>
		</>
	);
};
