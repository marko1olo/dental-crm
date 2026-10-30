import { Copy, UserCheck, XCircle } from "lucide-react";
import React from "react";
import type { ScheduleChair } from "../ScheduleFilterStrip";
import type { ChairDoctorShiftAssignment } from "../ScheduleGrid";

export interface ChairShiftSubstituteDrawerProps {
	chair: ScheduleChair;
	chairDoctorAssignments?:
		| Record<string, ChairDoctorShiftAssignment>
		| undefined;
	handleUnassignShift: (chair: ScheduleChair) => void;
	handleDuplicateChair: (chair: ScheduleChair) => void;
	isSubstituteOpen: Record<string, boolean>;
	setIsSubstituteOpen: React.Dispatch<
		React.SetStateAction<Record<string, boolean>>
	>;
	doctors: Array<{ id: string; fullName: string; specialty?: any }>;
	handleQuickSubstituteDoctor: (
		chair: ScheduleChair,
		substituteDocId: string,
	) => void;
}

export function ChairShiftSubstituteDrawer({
	chair,
	chairDoctorAssignments,
	handleUnassignShift,
	handleDuplicateChair,
	isSubstituteOpen,
	setIsSubstituteOpen,
	doctors,
	handleQuickSubstituteDoctor,
}: ChairShiftSubstituteDrawerProps) {
	return (
		<>
			{chairDoctorAssignments?.[chair.id] && (
				<button
					type="button"
					onClick={() => handleUnassignShift(chair)}
					className="mt-1 px-2 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[36px] active:scale-95"
					data-testid={`chair-view-unassign-${chair.id}`}
				>
					<XCircle size={14} />
					<span>Снять врача</span>
				</button>
			)}

			<button
				type="button"
				onClick={() => handleDuplicateChair(chair)}
				className="mt-1 px-2 py-2 rounded-xl text-xs font-semibold text-[var(--ink)] hover:bg-[var(--teal-soft)] border border-[var(--line)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px] active:scale-95"
				data-testid={`chair-view-duplicate-${chair.id}`}
				title={`Клонировать параметры кресла «${chair.name}»`}
			>
				<Copy size={14} className="text-[var(--teal)] shrink-0" />
				<span>Клонировать кресло</span>
			</button>

			<button
				type="button"
				onClick={() =>
					setIsSubstituteOpen((prev) => ({
						...prev,
						[chair.id]: !prev[chair.id],
					}))
				}
				className="mt-1 px-2 py-2 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px] active:scale-95"
				data-testid={`chair-view-substitute-btn-${chair.id}`}
				title="Быстрая подмена дежурного врача на кресле"
			>
				<UserCheck size={14} className="text-amber-500 shrink-0" />
				<span>Подменить врача...</span>
			</button>

			{isSubstituteOpen[chair.id] && (
				<div
					className="flex flex-col gap-1 p-2 rounded-xl bg-[var(--paper-soft)] border border-amber-500/30 max-h-40 overflow-y-auto"
					data-testid={`chair-view-substitute-picker-${chair.id}`}
				>
					<span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
						Выберите врача для подмены:
					</span>
					{doctors.map((doc) => (
						<button
							key={doc.id}
							type="button"
							onClick={() => handleQuickSubstituteDoctor(chair, doc.id)}
							className="px-2 py-2 rounded-xl text-xs font-semibold text-left flex items-center justify-between hover:bg-[var(--teal-soft)] transition-colors cursor-pointer min-h-[44px] active:scale-95"
							data-testid={`chair-view-substitute-option-${chair.id}-${doc.id}`}
						>
							<span className="truncate" title={doc.fullName}>
								{doc.fullName}
							</span>
							<span className="text-[10px] text-[var(--muted)] shrink-0 ml-1">
								Подменить
							</span>
						</button>
					))}
				</div>
			)}
		</>
	);
}
