import React from "react";
import {
	CalendarDays,
	ClipboardList,
	Star,
	UserPlus,
	Zap,
} from "lucide-react";
import type {
	PreferredTimeOfDay,
	WaitlistPriority,
} from "./WaitlistQuickFillModal";
import { TREATMENT_CATEGORIES } from "./WaitlistQuickFillModal";

export interface WaitlistAddPatientFormProps {
	// biome-ignore lint/suspicious/noExplicitAny: patient array from dashboard
	patientsList: any[];
	// biome-ignore lint/suspicious/noExplicitAny: doctor array from staff
	doctors: any[];
	selectedPatientId: string;
	setSelectedPatientId: (id: string) => void;
	priorityLevel: WaitlistPriority;
	setPriorityLevel: (level: WaitlistPriority) => void;
	preferredDoctorId: string;
	setPreferredDoctorId: (id: string) => void;
	treatmentCategory: string;
	setTreatmentCategory: (cat: string) => void;
	preferredDays: string[];
	setPreferredDays: (days: string[]) => void;
	preferredTimeOfDay: PreferredTimeOfDay[];
	setPreferredTimeOfDay: (times: PreferredTimeOfDay[]) => void;
	expiryDays: number | null;
	setExpiryDays: (days: number | null) => void;
	customExpiryDate: string;
	setCustomExpiryDate: (date: string) => void;
	notes: string;
	setNotes: (notes: string) => void;
	isSubmitting: boolean;
	onSubmit: (e: React.FormEvent) => void;
}

export const WaitlistAddPatientForm: React.FC<WaitlistAddPatientFormProps> = ({
	patientsList,
	doctors,
	selectedPatientId,
	setSelectedPatientId,
	priorityLevel,
	setPriorityLevel,
	preferredDoctorId,
	setPreferredDoctorId,
	treatmentCategory,
	setTreatmentCategory,
	preferredDays,
	setPreferredDays,
	preferredTimeOfDay,
	setPreferredTimeOfDay,
	expiryDays,
	setExpiryDays,
	customExpiryDate,
	setCustomExpiryDate,
	notes,
	setNotes,
	isSubmitting,
	onSubmit,
}) => {
	return (
		<form
			onSubmit={onSubmit}
			className="space-y-4 max-w-2xl mx-auto"
			data-testid="add-waitlist-form"
		>
			<div className="bg-[var(--paper-soft)] rounded-xl p-4 border border-[var(--line)] space-y-4">
				<h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
					<UserPlus className="w-4 h-4 text-[var(--teal)]" />
					Регистрация пациента в листе ожидания
				</h3>

				{/* Patient Selection */}
				<div className="space-y-1.5">
					<label
						htmlFor="waitlist-select-patient"
						className="text-xs font-semibold text-[var(--muted)]"
					>
						Пациент из картотеки *
					</label>
					<select
						id="waitlist-select-patient"
						value={selectedPatientId}
						onChange={(e) => setSelectedPatientId(e.target.value)}
						className="w-full p-2 h-9 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)] pointer-coarse:min-h-[44px]"
					>
						<option value="">-- Выберите пациента из базы --</option>
						{patientsList.map((p) => (
							<option key={p.id} value={p.id}>
								{p.fullName} {p.phone ? `(${p.phone})` : ""}
							</option>
						))}
					</select>
				</div>

				{/* Priority Selection */}
				<div className="space-y-1.5">
					<span className="text-xs font-semibold text-[var(--muted)] block">
						Категория срочности и приоритет *
					</span>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
						{[
							{
								id: "urgent",
								label: "Острая боль",
								icon: <Zap size={15} className="shrink-0" />,
								color:
									"bg-[var(--bad-bg)] text-[var(--bad-fg)] border-[var(--bad-fg)]",
							},
							{
								id: "treatment_plan",
								label: "Незавершённый план",
								icon: <ClipboardList size={15} className="shrink-0" />,
								color:
									"bg-[var(--warn-bg)] text-[var(--warn-fg)] border-[var(--warn-fg)]",
							},
							{
								id: "vip",
								label: "VIP клиент",
								icon: (
									<Star size={15} className="shrink-0 text-purple-500" />
								),
								color:
									"bg-purple-500/20 text-purple-600 border-purple-500",
							},
							{
								id: "routine",
								label: "Плановый",
								icon: (
									<CalendarDays size={15} className="shrink-0 text-slate-500" />
								),
								color:
									"bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--line-strong)]",
							},
						].map((p) => (
							<button
								key={p.id}
								type="button"
								onClick={() => setPriorityLevel(p.id as WaitlistPriority)}
								className={`p-2 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer pointer-coarse:min-h-[44px] ${
									priorityLevel === p.id
										? `${p.color} ring-2 ring-offset-1`
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								<span className="flex items-center justify-center">
									{p.icon}
								</span>
								<span>{p.label}</span>
							</button>
						))}
					</div>
				</div>

				{/* Desired Doctor */}
				<div className="space-y-1.5">
					<label
						htmlFor="waitlist-select-doctor"
						className="text-xs font-semibold text-[var(--muted)]"
					>
						Желаемый специалист
					</label>
					<select
						id="waitlist-select-doctor"
						value={preferredDoctorId}
						onChange={(e) => setPreferredDoctorId(e.target.value)}
						className="w-full p-2 h-9 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)] pointer-coarse:min-h-[44px]"
					>
						<option value="">-- Любой специалист клиники --</option>
						{/* biome-ignore lint/suspicious/noExplicitAny: doctor type */}
						{doctors.map((d: any) => (
							<option key={d.id} value={d.id}>
								{d.fullName || d.name} ({d.specialty || "Врач"})
							</option>
						))}
					</select>
				</div>

				{/* Treatment Category */}
				<div className="space-y-1.5">
					<label
						htmlFor="waitlist-select-category"
						className="text-xs font-semibold text-[var(--muted)]"
					>
						Направление / Причина обращения
					</label>
					<select
						id="waitlist-select-category"
						value={treatmentCategory}
						onChange={(e) => setTreatmentCategory(e.target.value)}
						className="w-full p-2 h-9 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)] pointer-coarse:min-h-[44px]"
					>
						<option value="">-- Выберите направление --</option>
						{TREATMENT_CATEGORIES.map((cat) => (
							<option key={cat} value={cat}>
								{cat}
							</option>
						))}
					</select>
				</div>

				{/* Preferred Days of Week */}
				<div className="space-y-1.5">
					<span className="text-xs font-semibold text-[var(--muted)] block">
						Желаемые дни недели
					</span>
					<div className="flex flex-wrap gap-1.5">
						{[
							{ id: "weekdays", label: "Пн-Пт (Будни)" },
							{ id: "weekend", label: "Сб-Вс (Выходные)" },
							{ id: "any", label: "Любые дни" },
						].map((d) => (
							<button
								key={d.id}
								type="button"
								onClick={() => {
									if (preferredDays.includes(d.id)) {
										setPreferredDays(preferredDays.filter((x) => x !== d.id));
									} else {
										setPreferredDays([...preferredDays, d.id]);
									}
								}}
								className={`px-3 py-1.5 h-8 rounded-lg text-xs font-semibold border transition-all cursor-pointer pointer-coarse:min-h-[44px] ${
									preferredDays.includes(d.id)
										? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)]"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								{d.label}
							</button>
						))}
					</div>
				</div>

				{/* Preferred Time of Day */}
				<div className="space-y-1.5">
					<span className="text-xs font-semibold text-[var(--muted)] block">
						Желаемое время суток
					</span>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
						{[
							{ id: "morning", label: "Утро", sub: "08:00–12:00" },
							{ id: "day", label: "День", sub: "12:00–17:00" },
							{ id: "evening", label: "Вечер", sub: "17:00–21:00" },
							{ id: "any", label: "Любое", sub: "В течение дня" },
						].map((t) => (
							<button
								key={t.id}
								type="button"
								onClick={() => {
									const val = t.id as PreferredTimeOfDay;
									if (preferredTimeOfDay.includes(val)) {
										setPreferredTimeOfDay(
											preferredTimeOfDay.filter((x) => x !== val),
										);
									} else {
										setPreferredTimeOfDay([...preferredTimeOfDay, val]);
									}
								}}
								className={`p-1.5 rounded-lg text-xs border transition-all flex flex-col items-center justify-center cursor-pointer pointer-coarse:min-h-[44px] ${
									preferredTimeOfDay.includes(t.id as PreferredTimeOfDay)
										? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)]"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								<span className="font-bold">{t.label}</span>
								<span className="text-[11px] opacity-80">{t.sub}</span>
							</button>
						))}
					</div>
				</div>

				{/* Expiry Date */}
				<div className="space-y-1.5">
					<span className="text-xs font-semibold text-[var(--muted)] block">
						Срок ожидания (до даты)
					</span>
					<div className="flex flex-wrap gap-1.5 items-center">
						{[
							{ days: 3, label: "3 дня" },
							{ days: 7, label: "7 дней" },
							{ days: 14, label: "14 дней" },
							{ days: 30, label: "30 дней" },
						].map((opt) => (
							<button
								key={opt.days}
								type="button"
								onClick={() => {
									setExpiryDays(opt.days);
									setCustomExpiryDate("");
								}}
								className={`px-3 py-1.5 h-8 rounded-lg text-xs font-semibold border transition-all cursor-pointer pointer-coarse:min-h-[44px] ${
									expiryDays === opt.days && !customExpiryDate
										? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)]"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								{opt.label}
							</button>
						))}
						<input
							type="date"
							value={customExpiryDate}
							onChange={(e) => {
								setCustomExpiryDate(e.target.value);
								setExpiryDays(null);
							}}
							className="h-8 px-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] pointer-coarse:min-h-[44px]"
						/>
					</div>
				</div>

				{/* Notes */}
				<div className="space-y-1.5">
					<label
						htmlFor="waitlist-notes"
						className="text-xs font-semibold text-[var(--muted)]"
					>
						Примечание администратора
					</label>
					<textarea
						id="waitlist-notes"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Например: Пациент просил перезвонить после 15:00. Готов приехать за 30 минут."
						rows={3}
						className="w-full p-2 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
					/>
				</div>
			</div>

			<button
				type="submit"
				disabled={isSubmitting}
				className="w-full py-2.5 h-10 bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] font-bold rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 pointer-coarse:min-h-[44px]"
				data-testid="submit-waitlist-btn"
			>
				<UserPlus className="w-4 h-4" />
				<span>
					{isSubmitting
						? "Сохранение..."
						: "Зарегистрировать в листе ожидания"}
				</span>
			</button>
		</form>
	);
};
