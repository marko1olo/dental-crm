import React from "react";
import { getWorkplaceChairPalette, type Appointment } from "@dental/shared";
import { formatDoctorShortName } from "../appointmentCardHelpers";
import { showRollbackToast } from "../../GlobalToast";

interface Props {
	appointment: Appointment;
	effectiveChairs: Array<{ id: string; name: string; color?: string; colorId?: string | number }>;
	doctors: Array<{ id: string; fullName: string; specialties?: string[]; role?: string }>;
	onReassignChair: (appt: Appointment, chairId: string) => void;
	onReassignDoctor: (appt: Appointment, doctorId: string) => void;
}

export const GridAppointmentReassignSection: React.FC<Props> = ({
	appointment: a,
	effectiveChairs,
	doctors,
	onReassignChair,
	onReassignDoctor,
}) => {
	const handleChair = (chId: string, chName: string) => {
		const prevChairId = a.chairId;
		onReassignChair(a, chId);
		showRollbackToast(`Кресло переназначено: ${chName}`, () => {
			if (prevChairId) onReassignChair(a, prevChairId);
		}, 5000, "Вернуть");
	};

	const handleDoctor = (docId: string, docName: string) => {
		const prevDocId = a.doctorUserId;
		onReassignDoctor(a, docId);
		showRollbackToast(`Врач переназначен: ${formatDoctorShortName(docName)}`, () => {
			if (prevDocId) onReassignDoctor(a, prevDocId);
		}, 5000, "Вернуть");
	};

	return (
		<>
			{effectiveChairs.length > 1 && (
				<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
					<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Сменить кресло</div>
					<div className="flex items-center gap-1 px-1 flex-wrap">
						{effectiveChairs.map((ch, chIdx) => {
							const chPalette = getWorkplaceChairPalette((ch as any).colorId ?? ch.id ?? chIdx);
							const chAccent = ch.color || chPalette.bright_code;
							const isCurrent = a.chairId === ch.id;
							return (
								<button
									key={ch.id}
									type="button"
									data-testid={`menu-reassign-chair-${a.id}-${ch.id}`}
									onClick={() => handleChair(ch.id, ch.name)}
									className={`min-h-[36px] px-2 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer truncate max-w-[140px] flex items-center gap-1 ${
										isCurrent ? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-2xs" : "bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
									}`}
									title={`Переместить прием на кресло «${ch.name}» (${chPalette.nameRu})`}
								>
									<span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: chAccent }} />
									<span className="truncate">{ch.name}</span>
								</button>
							);
						})}
					</div>
				</div>
			)}
			{doctors.length > 1 && (
				<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
					<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Сменить врача</div>
					<div className="flex items-center gap-1 px-1 flex-wrap">
						{doctors.slice(0, 4).map((doc) => {
							const isCurrent = a.doctorUserId === doc.id;
							return (
								<button
									key={doc.id}
									type="button"
									data-testid={`menu-reassign-doctor-${a.id}-${doc.id}`}
									onClick={() => handleDoctor(doc.id, doc.fullName)}
									className={`min-h-[36px] px-2 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer truncate max-w-[140px] flex items-center gap-1 ${
										isCurrent ? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-2xs" : "bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
									}`}
									title={`Передать прием врачу ${doc.fullName}`}
								>
									<span className="truncate">{formatDoctorShortName(doc.fullName)}</span>
								</button>
							);
						})}
						{doctors.length > 4 && (
							<select
								value={a.doctorUserId || ""}
								onChange={(e) => {
									if (e.target.value) {
										const found = doctors.find((d) => d.id === e.target.value);
										handleDoctor(e.target.value, found?.fullName || e.target.value);
									}
								}}
								className="min-h-[36px] text-xs font-semibold border border-[var(--line)] rounded-lg px-2 bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer max-w-[130px] truncate"
								title="Выбрать другого врача"
								data-testid={`menu-reassign-doctor-select-${a.id}`}
							>
								<option value="" disabled>Все врачи...</option>
								{doctors.map((d) => (
									<option key={d.id} value={d.id}>{formatDoctorShortName(d.fullName)}</option>
								))}
							</select>
						)}
					</div>
				</div>
			)}
		</>
	);
};
