import React from "react";
import { UserCheck } from "lucide-react";
import type { TreatmentPlanDoctorOption, TreatmentPlanItem } from "../types";

export interface StageItemMetaAndDoctorProps {
	readonly item: TreatmentPlanItem;
	readonly doctors?: readonly TreatmentPlanDoctorOption[] | undefined;
	readonly onAssignDoctor?: ((itemId: string, doctorId: string | null, doctorName: string | null, doctorSpecialty: string | null) => void) | undefined;
}

export const StageItemMetaAndDoctor: React.FC<StageItemMetaAndDoctorProps> = ({
	item,
	doctors,
	onAssignDoctor,
}) => {
	return (
		<div className="flex flex-col gap-0.5 min-w-0 flex-1">
			<div className="flex items-center gap-1.5 flex-wrap">
				{item.toothNumber && (
					<span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 whitespace-nowrap">
						#{item.toothNumber}
					</span>
				)}
				<span className="text-[10px] font-mono text-[var(--muted,#64748b)] px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-soft)] border border-[var(--line,#e2e8f0)] whitespace-nowrap">
					{item.code804n}
				</span>
				<span className="text-[10px] text-[var(--muted,#64748b)] font-medium">
					{item.category}
				</span>

				{item.doctorName ? (
					<span
						className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 whitespace-nowrap shadow-2xs"
						data-testid={`item-doctor-badge-${item.id}`}
						title={`Назначенный специалист: ${item.doctorName}${item.doctorSpecialty ? ` (${item.doctorSpecialty})` : ""}`}
					>
						<UserCheck size={11} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
						<span className="font-semibold">{item.doctorName}</span>
						{item.doctorSpecialty && (
							<span className="text-[9.5px] opacity-75 hidden sm:inline">
								· {item.doctorSpecialty}
							</span>
						)}
						{onAssignDoctor && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onAssignDoctor(item.id, null, null, null);
								}}
								className="ml-0.5 text-[10px] text-indigo-400 hover:text-rose-600 cursor-pointer p-0.5"
								title="Снять назначение врача"
								data-testid={`clear-doctor-btn-${item.id}`}
							>
								×
							</button>
						)}
					</span>
				) : onAssignDoctor && doctors && doctors.length > 0 ? (
					<div className="inline-flex items-center" onClick={(e) => e.stopPropagation()}>
						<select
							value={item.doctorId || ""}
							onChange={(e) => {
								const docId = e.target.value;
								if (!docId) {
									onAssignDoctor(item.id, null, null, null);
								} else {
									const found = doctors.find((d) => d.id === docId);
									onAssignDoctor(
										item.id,
										docId,
										found?.fullName || "Врач-стоматолог",
										found?.specialty || (found?.role === "doctor" ? "Стоматолог" : found?.role) || null,
									);
								}
							}}
							className="h-5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/15 border border-indigo-500/20 rounded-md px-1 py-0 cursor-pointer focus:outline-hidden transition-colors"
							title="Назначить лечащего врача на позицию"
							data-testid={`assign-doctor-select-${item.id}`}
						>
							<option value="">+ Врач</option>
							{doctors.map((doc) => (
								<option key={doc.id} value={doc.id}>
									{doc.fullName} {doc.specialty ? `(${doc.specialty})` : ""}
								</option>
							))}
						</select>
					</div>
				) : null}
			</div>

			<span
				className="text-xs font-semibold text-[var(--ink,#0f172a)] leading-snug truncate min-w-0 block"
				title={item.name}
			>
				{item.name}
			</span>

			{item.materials && (
				<p
					className="text-[11px] text-[var(--muted,#64748b)] italic m-0 truncate min-w-0"
					title={item.materials}
				>
					Материал: {item.materials}
				</p>
			)}
		</div>
	);
};
