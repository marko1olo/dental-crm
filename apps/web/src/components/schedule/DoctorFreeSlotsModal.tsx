import React, { useState, useMemo } from "react";
import {
	Search,
	Calendar,
	Clock,
	User,
	X,
	Sparkles,
	CheckCircle2,
	ChevronRight,
	Sun,
	Sunset,
	Moon,
} from "lucide-react";
import type { Appointment, Dashboard, DentalSpecialty } from "@dental/shared";
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

	const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
		initialDoctorId || staffDoctors[0]?.id || "",
	);
	const [horizonDays, setHorizonDays] = useState<7 | 14>(7);
	const [durationMinutes, setDurationMinutes] = useState<number>(60);
	const [timeOfDayFilter, setTimeOfDayFilter] = useState<TimeOfDayFilter>("all");
	const [startDateOffsetDays, setStartDateOffsetDays] = useState<number>(0);

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
			startDate: activeStartDateIso,
			horizonDays,
			durationMinutes,
			timeOfDayFilter,
			appointments: dashboard?.appointments ?? [],
			chairs: dashboard?.clinicSettings?.chairs ?? [],
			clinicStartHour: 9,
			clinicEndHour: 20,
			stepMinutes: 30,
		});
	}, [
		selectedDoctorId,
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

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
			<div className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl flex flex-col overflow-hidden text-[var(--ink,#0f172a)]">
				{/* Header */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] flex items-center justify-center border border-[var(--teal,var(--brand-primary))]/30">
							<Search className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base sm:text-lg font-bold m-0 flex items-center gap-2">
								Поиск свободных окон у врача
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
								Сканирование расписания на {horizonDays} дней вперед • Найдено окон: {totalSlotsCount}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
						aria-label="Закрыть окно поиска свободных окон"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Filters Section */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-3">
					{/* Doctor chips */}
					<div className="space-y-1.5">
						<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider block">
							Выберите врача:
						</span>
						<div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
							{staffDoctors.map((doc) => (
								<button
									key={doc.id}
									type="button"
									onClick={() => setSelectedDoctorId(doc.id)}
									className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
										selectedDoctorId === doc.id
											? "bg-[var(--teal,var(--brand-primary))] text-white shadow-sm"
											: "border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,var(--brand-primary))]"
									}`}
								>
									{doc.fullName}
									{doc.specialties?.[0] && (
										<span className="ml-1 opacity-75 font-normal">
											({specialtyLabels[doc.specialties[0] as DentalSpecialty] || doc.specialties[0]})
										</span>
									)}
								</button>
							))}
						</div>
					</div>

					{/* Quick Repeat Jump Presets: [+ Через 7 дней], [+ Через 14 дней], [+ Через 1 месяц] */}
					<div className="space-y-1.5">
						<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider block">
							Быстрый переход на повторный прием:
						</span>
						<div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
							{[
								{ offset: 0, label: "📅 С сегодня" },
								{ offset: 7, label: "+ Через 7 дней" },
								{ offset: 14, label: "+ Через 14 дней" },
								{ offset: 30, label: "+ Через 1 месяц (30 дн.)" },
							].map((p) => (
								<button
									key={p.offset}
									type="button"
									onClick={() => setStartDateOffsetDays(p.offset)}
									className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
										startDateOffsetDays === p.offset
											? "bg-[var(--teal-dark,var(--teal))] text-white shadow-sm border border-[var(--teal,var(--brand-primary))]"
											: "border border-[var(--teal,var(--brand-primary))]/30 bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] hover:bg-[var(--teal-soft,var(--paper-soft))]"
									}`}
								>
									<Calendar size={13} />
									<span>{p.label}</span>
								</button>
							))}
						</div>
					</div>

					{/* Horizon & Duration & Time of Day */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
						{/* Horizon */}
						<div className="space-y-1">
							<span className="text-xs font-bold text-[var(--muted,#64748b)] flex items-center gap-1">
								<Calendar size={13} className="text-[var(--teal,var(--brand-primary))]" /> Горизонт поиска:
							</span>
							<div className="flex gap-1.5">
								{[7, 14].map((h) => (
									<button
										key={h}
										type="button"
										onClick={() => setHorizonDays(h as 7 | 14)}
										className={`min-h-[44px] flex-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
											horizonDays === h
												? "bg-[var(--teal,var(--brand-primary))] text-white shadow-sm"
												: "border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
										}`}
									>
										{h} дней
									</button>
								))}
							</div>
						</div>

						{/* Duration */}
						<div className="space-y-1">
							<span className="text-xs font-bold text-[var(--muted,#64748b)] flex items-center gap-1">
								<Clock size={13} className="text-[var(--teal,var(--brand-primary))]" /> Длительность приема:
							</span>
							<div className="flex gap-1">
								{[30, 45, 60, 90, 120].map((dur) => (
									<button
										key={dur}
										type="button"
										onClick={() => setDurationMinutes(dur)}
										className={`min-h-[44px] flex-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
											durationMinutes === dur
												? "bg-[var(--teal,var(--brand-primary))] text-white shadow-sm"
												: "border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
										}`}
									>
										{dur}&apos;
									</button>
								))}
							</div>
						</div>

						{/* Time of Day */}
						<div className="space-y-1">
							<span className="text-xs font-bold text-[var(--muted,#64748b)] flex items-center gap-1">
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
										className={`min-h-[44px] flex-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
											timeOfDayFilter === t.id
												? "bg-[var(--teal,var(--brand-primary))] text-white shadow-sm"
												: "border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
										}`}
									>
										{t.label}
									</button>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* Results Body */}
				<div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
					{totalSlotsCount === 0 ? (
						<div className="py-12 text-center text-[var(--muted,#64748b)] space-y-2">
							<Sparkles className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
							<p className="text-sm font-medium">Нет свободных окон по заданным критериям.</p>
							<p className="text-xs">Попробуйте уменьшить длительность приема или сменить фильтр времени.</p>
						</div>
					) : (
						freeSlotsByDay.map((day) => (
							<div
								key={day.date}
								className={`p-4 rounded-2xl border space-y-2.5 ${
									day.isDayOff
										? "bg-[var(--paper-soft,#f8fafc)]/60 border-[var(--line,#e2e8f0)] opacity-80"
										: "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)]"
								}`}
							>
								<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-2">
									<div className="flex items-center gap-2">
										<span className="text-sm font-bold text-[var(--ink,#0f172a)]">
											{day.dateFormatted}
										</span>
										{day.isDayOff && (
											<span className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
												{day.dayOffReason || "Выходной"}
											</span>
										)}
									</div>
									<span className="text-xs font-semibold text-[var(--teal-dark,var(--teal))]">
										{day.isDayOff ? "—" : `Свободно слотов: ${day.slots.length}`}
									</span>
								</div>

								{day.isDayOff ? (
									<div className="py-2 text-xs text-[var(--muted,#64748b)] italic">
										Прием не ведется в этот день (выходной)
									</div>
								) : day.slots.length === 0 ? (
									<div className="py-2 text-xs text-[var(--muted,#64748b)] italic">
										Все окна на этот день заняты
									</div>
								) : (
									<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
										{day.slots.map((slot, sIdx) => (
											<button
												key={`${slot.date}-${slot.startTime}-${sIdx}`}
												type="button"
												onClick={() => {
													onSelectSlot(slot);
													onClose();
												}}
												className="min-h-[44px] p-2 rounded-xl border border-[var(--teal,var(--brand-primary))]/30 bg-[var(--paper,#ffffff)] hover:bg-[var(--teal-soft,var(--paper-soft))] hover:border-[var(--teal,var(--brand-primary))] text-[var(--teal-dark,var(--teal))] text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer shadow-xs group"
												title={`Записать на ${slot.timeDisplay} (${slot.chairName})`}
											>
												<span className="font-mono text-xs group-hover:scale-105 transition-transform">
													{slot.timeDisplay}
												</span>
												<span className="text-[10px] text-[var(--muted,#64748b)] font-normal truncate max-w-full">
													{slot.chairName}
												</span>
											</button>
										))}
									</div>
								)}
							</div>
						))
					)}
				</div>

				{/* Footer */}
				<div className="p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between">
					<div className="text-xs text-[var(--muted,#64748b)]">
						Врач: <strong>{selectedDoctor?.fullName || "Все врачи"}</strong> • Длительность: <strong>{durationMinutes} мин</strong>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-5 rounded-xl border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] text-xs font-bold cursor-pointer"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
};

