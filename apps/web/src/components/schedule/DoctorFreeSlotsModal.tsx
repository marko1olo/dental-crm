import React, { useState, useMemo } from "react";
import {
	Search,
	Calendar,
	Clock,
	X,
	Sparkles,
	Sun,
	Armchair,
	User,
} from "lucide-react";
import type { Dashboard, DentalSpecialty } from "@dental/shared";
import {
	findDoctorFreeSlots,
	type DoctorFreeSlot,
	type TimeOfDayFilter,
} from "./doctorFreeSlotsEngine";
import { specialtyLabels } from "../../workspaceUiLabels";

export interface DoctorFreeSlotsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly dashboard: Dashboard;
	readonly initialDoctorId?: string | null | undefined;
	readonly onSelectSlot: (slot: DoctorFreeSlot) => void;
}

export const DoctorFreeSlotsModal: React.FC<DoctorFreeSlotsModalProps> = ({
	isOpen,
	onClose,
	dashboard,
	initialDoctorId,
	onSelectSlot,
}) => {
	const staffDoctors = useMemo(() => {
		return (dashboard?.clinicSettings?.staff ?? []).filter(
			(s) => s.active && (s.role === "doctor" || s.role === "owner"),
		);
	}, [dashboard?.clinicSettings?.staff]);

	const clinicChairs = useMemo(() => {
		return (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active !== false);
	}, [dashboard?.clinicSettings?.chairs]);

	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
		initialDoctorId || "",
	);
	const [selectedChairId, setSelectedChairId] = useState<string>("");
	const [horizonDays, setHorizonDays] = useState<number>(7);
	const [durationMinutes, setDurationMinutes] = useState<number>(60);
	const [timeOfDayFilter, setTimeOfDayFilter] = useState<TimeOfDayFilter>("all");
	const [startDateOffsetDays, setStartDateOffsetDays] = useState<number>(0);
	const [activeRangeLabel, setActiveRangeLabel] = useState<string>("На этой неделе");

	const activeStartDateIso = useMemo(() => {
		const now = new Date();
		if (startDateOffsetDays > 0) {
			now.setDate(now.getDate() + startDateOffsetDays);
		}
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
	}, [startDateOffsetDays]);

	const freeSlotsByDay = useMemo(() => {
		return findDoctorFreeSlots({
			doctorId: selectedDoctorId || undefined,
			chairId: selectedChairId || undefined,
			startDate: activeStartDateIso,
			horizonDays,
			durationMinutes,
			timeOfDayFilter,
			appointments: dashboard?.appointments ?? [],
			chairs: dashboard?.clinicSettings?.chairs ?? [],
			clinicStartHour: 9,
			clinicEndHour: 20,
			stepMinutes: durationMinutes <= 30 ? 15 : 30,
		});
	}, [
		selectedDoctorId,
		selectedChairId,
		activeStartDateIso,
		horizonDays,
		durationMinutes,
		timeOfDayFilter,
		dashboard?.appointments,
		dashboard?.clinicSettings?.chairs,
	]);

	const totalSlotsCount = useMemo(() => {
		return freeSlotsByDay.reduce((acc, day) => acc + day.slots.length, 0);
	}, [freeSlotsByDay]);

	if (!isOpen) return null;

	const selectedDoctor = staffDoctors.find((d) => d.id === selectedDoctorId);
	const selectedChair = clinicChairs.find((c) => c.id === selectedChairId);

	return (
		<div
			className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
			data-testid="doctor-free-slots-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Подбор свободных окон расписания"
		>
			<div className="w-full max-w-4xl max-h-[92vh] rounded-3xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl flex flex-col overflow-hidden text-[var(--ink,#0f172a)]">
				{/* Header */}
				<div className="px-4 sm:px-6 py-4 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] flex items-center justify-center border border-[var(--teal,var(--brand-primary))]/30 shrink-0">
							<Search className="w-4 h-4" />
						</div>
						<div>
							<h2 className="text-base font-bold m-0 flex items-center gap-2">
								Умный подбор времени и свободных окон
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
								{activeRangeLabel} ({horizonDays} дн.) • Найдено вариантов: <strong>{totalSlotsCount}</strong>
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="h-8 w-8 rounded-lg border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
						aria-label="Закрыть окно подбора окон"
						data-testid="btn-close-free-slots-modal"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Filters Section */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-3.5">
					{/* 1. Quick Range Bar: [ Сегодня ] [ Завтра ] [ Ближайшие 3 дня ] [ На этой неделе ] [ +14 дней ] [ +1 месяц ] */}
					<div className="space-y-1.5">
						<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
							<Calendar size={13} className="text-[var(--teal,var(--brand-primary))]" />
							Диапазон поиска:
						</span>
						<div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
							{[
								{ label: "Сегодня", offset: 0, horizon: 1 },
								{ label: "Завтра", offset: 1, horizon: 1 },
								{ label: "Ближайшие 3 дня", offset: 0, horizon: 3 },
								{ label: "На этой неделе", offset: 0, horizon: 7 },
								{ label: "+ Через 14 дней", offset: 14, horizon: 7 },
								{ label: "+ Через 1 месяц (30 дн.)", offset: 30, horizon: 7 },
							].map((r) => {
								const isSelected = activeRangeLabel === r.label;
								return (
									<button
										key={r.label}
										type="button"
										onClick={() => {
											setActiveRangeLabel(r.label);
											setStartDateOffsetDays(r.offset);
											setHorizonDays(r.horizon);
										}}
										className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1 whitespace-nowrap shadow-2xs ${
											isSelected
												? "border border-transparent font-bold"
												: "border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,var(--brand-primary))]"
										}`}
										style={isSelected ? { color: "var(--on-teal, #ffffff)", backgroundColor: "var(--teal-fill, var(--teal, #0d9488))" } : undefined}
										data-testid={`quick-range-btn-${r.offset}-${r.horizon}`}
									>
										<span>{r.label}</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* 2. Doctor selection: [ Любой врач ] [ Д-р ... ] */}
					<div className="space-y-1.5">
						<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
							<User size={13} className="text-[var(--teal,var(--brand-primary))]" />
							Врач:
						</span>
						<div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
							<button
								type="button"
								onClick={() => setSelectedDoctorId("")}
								className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer whitespace-nowrap shadow-2xs ${
									selectedDoctorId === ""
										? "border border-transparent font-bold"
										: "border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,var(--brand-primary))]"
								}`}
								style={selectedDoctorId === "" ? { color: "var(--on-teal, #ffffff)", backgroundColor: "var(--teal-fill, var(--teal, #0d9488))" } : undefined}
								data-testid="filter-doc-any"
							>
								Любой врач клиники
							</button>
							{staffDoctors.map((doc) => (
								<button
									key={doc.id}
									type="button"
									onClick={() => setSelectedDoctorId(doc.id)}
									className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer whitespace-nowrap shadow-2xs ${
										selectedDoctorId === doc.id
											? "border border-transparent font-bold"
											: "border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,var(--brand-primary))]"
									}`}
									style={selectedDoctorId === doc.id ? { color: "var(--on-teal, #ffffff)", backgroundColor: "var(--teal-fill, var(--teal, #0d9488))" } : undefined}
									data-testid={`filter-doc-${doc.id}`}
								>
									{doc.fullName}
									{doc.specialties?.[0] && (
										<span className={`ml-1 font-normal ${selectedDoctorId === doc.id ? "opacity-85" : "opacity-75"}`}>
											({specialtyLabels[doc.specialties[0] as DentalSpecialty] || doc.specialties[0]})
										</span>
									)}
								</button>
							))}
						</div>
					</div>

					{/* 3. Chair selection: [ Любое кресло ] [ Кресло 1 ] ... */}
					{clinicChairs.length > 1 && (
						<div className="space-y-1.5">
							<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
								<Armchair size={13} className="text-[var(--teal,var(--brand-primary))]" />
								Установка / Кресло:
							</span>
							<div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
								<button
									type="button"
									onClick={() => setSelectedChairId("")}
									className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer whitespace-nowrap shadow-2xs ${
										selectedChairId === ""
											? "border border-transparent font-bold"
											: "border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,var(--brand-primary))]"
									}`}
									style={selectedChairId === "" ? { color: "var(--on-teal, #ffffff)", backgroundColor: "var(--teal-fill, var(--teal, #0d9488))" } : undefined}
									data-testid="filter-chair-any"
								>
									Любое свободное кресло
								</button>
								{clinicChairs.map((chair) => (
									<button
										key={chair.id}
										type="button"
										onClick={() => setSelectedChairId(chair.id)}
										className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer whitespace-nowrap shadow-2xs ${
											selectedChairId === chair.id
												? "border border-transparent font-bold"
												: "border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,var(--brand-primary))]"
										}`}
										style={selectedChairId === chair.id ? { color: "var(--on-teal, #ffffff)", backgroundColor: "var(--teal-fill, var(--teal, #0d9488))" } : undefined}
										data-testid={`filter-chair-${chair.id}`}
									>
										{chair.name}
									</button>
								))}
							</div>
						</div>
					)}

					{/* 4. Duration chips & Time of Day */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
						{/* Duration Chips: [ 15 мин ] [ 30 мин ] [ 45 мин ] [ 60 мин ] [ 90 мин ] [ 120 мин ] */}
						<div className="space-y-1">
							<span className="text-[11px] font-bold text-[var(--muted,#64748b)] flex items-center gap-1">
								<Clock size={13} className="text-[var(--teal,var(--brand-primary))]" /> Длительность приёма:
							</span>
							<div className="flex gap-1">
								{[15, 30, 45, 60, 90, 120].map((dur) => (
									<button
										key={dur}
										type="button"
										onClick={() => setDurationMinutes(dur)}
										className={`h-7 flex-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
											durationMinutes === dur
												? "border border-transparent font-bold"
												: "border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)]"
										}`}
										style={durationMinutes === dur ? { color: "var(--on-teal, #ffffff)", backgroundColor: "var(--teal-fill, var(--teal, #0d9488))" } : undefined}
										data-testid={`duration-chip-${dur}`}
									>
										{dur}м
									</button>
								))}
							</div>
						</div>

						{/* Time of Day */}
						<div className="space-y-1">
							<span className="text-[11px] font-bold text-[var(--muted,#64748b)] flex items-center gap-1">
								<Sun size={13} className="text-[var(--teal,var(--brand-primary))]" /> Время суток:
							</span>
							<div className="flex gap-1">
								{(
									[
										{ id: "all", label: "Все" },
										{ id: "morning", label: "Утро" },
										{ id: "day", label: "День" },
										{ id: "evening", label: "Вечер" },
									] as const
								).map((t) => (
									<button
										key={t.id}
										type="button"
										onClick={() => setTimeOfDayFilter(t.id)}
										className={`h-7 flex-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
											timeOfDayFilter === t.id
												? "border border-transparent font-bold"
												: "border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)]"
										}`}
										style={timeOfDayFilter === t.id ? { color: "var(--on-teal, #ffffff)", backgroundColor: "var(--teal-fill, var(--teal, #0d9488))" } : undefined}
										data-testid={`tod-filter-${t.id}`}
									>
										{t.label}
									</button>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* Results Body */}
				<div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5 [scrollbar-width:thin]">
					{totalSlotsCount === 0 ? (
						<div className="py-12 text-center text-[var(--muted,#64748b)] space-y-2">
							<Sparkles className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
							<p className="text-sm font-medium">Нет свободных окон по заданным критериям.</p>
							<p className="text-xs">Попробуйте уменьшить длительность приёма или выбрать другой диапазон дат.</p>
						</div>
					) : (
						freeSlotsByDay.map((day) => (
							<div
								key={day.date}
								className={`p-3.5 rounded-2xl border space-y-2.5 ${
									day.isDayOff
										? "bg-[var(--paper-soft,#f8fafc)]/60 border-[var(--line,#e2e8f0)] opacity-75"
										: "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)]"
								}`}
							>
								<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-1.5">
									<div className="flex items-center gap-2">
										<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
											{day.dateFormatted}
										</span>
										{day.isDayOff && (
											<span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
												{day.dayOffReason || "Выходной"}
											</span>
										)}
									</div>
									<span className="text-[11px] font-semibold text-[var(--teal-dark,var(--teal))]">
										{day.isDayOff ? "—" : `Свободно окон: ${day.slots.length}`}
									</span>
								</div>

								{day.isDayOff ? (
									<div className="py-1.5 text-xs text-[var(--muted,#64748b)] italic">
										Приём не ведётся в этот день
									</div>
								) : day.slots.length === 0 ? (
									<div className="py-1.5 text-xs text-[var(--muted,#64748b)] italic">
										Все окна на этот день заняты
									</div>
								) : (
									<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
										{day.slots.map((slot, sIdx) => {
											const slotDoc = staffDoctors.find((d) => d.id === slot.doctorId);
											return (
												<button
													key={`${slot.date}-${slot.startTime}-${slot.chairId}-${sIdx}`}
													type="button"
													onClick={() => {
														onSelectSlot(slot);
														onClose();
													}}
													className="p-2 rounded-xl border border-[var(--teal,var(--brand-primary))]/30 bg-[var(--paper,#ffffff)] hover:bg-[var(--teal-soft,var(--paper-soft))] hover:border-[var(--teal,var(--brand-primary))] text-[var(--teal-dark,var(--teal))] text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs group"
													title={`Записать на ${slot.timeDisplay} • ${slotDoc?.fullName || "Врач клиники"} (${slot.chairName})`}
													data-testid={`free-slot-card-${slot.date}-${slot.startTime}`}
												>
													<span className="font-mono text-xs group-hover:scale-105 transition-transform text-[var(--ink)]">
														{slot.timeDisplay}
													</span>
													<span className="text-[10px] text-[var(--muted,#64748b)] font-normal truncate max-w-full mt-0.5">
														{slot.chairName}
													</span>
													{(!selectedDoctorId || !selectedDoctor) && slotDoc && (
														<span className="text-[9px] text-[var(--teal)] font-medium truncate max-w-full">
															{slotDoc.fullName.split(" ")[0]}
														</span>
													)}
												</button>
											);
										})}
									</div>
								)}
							</div>
						))
					)}
				</div>

				{/* Footer */}
				<div className="px-5 py-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between text-xs">
					<div className="text-[var(--muted,#64748b)]">
						Врач: <strong>{selectedDoctor?.fullName || "Любой врач"}</strong> • Кресло: <strong>{selectedChair?.name || "Любое кресло"}</strong> • Длительность: <strong>{durationMinutes} мин</strong>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="h-8 px-4 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)] text-xs font-semibold cursor-pointer"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
};
