import React from "react";
import type { WaitlistUrgency } from "../waitlistTypes";
import { TREATMENT_CATEGORIES } from "../waitlistTypes";

export interface WaitlistAddPatientFormProps {
	onSubmit: (e: React.FormEvent) => void;
	isSubmitting: boolean;
	clinicPatients: any[];
	staffDoctors: any[];
	newPatientId: string;
	onSelectPatientId: (id: string) => void;
	newPatientName: string;
	onPatientNameChange: (name: string) => void;
	newDoctorId: string;
	onDoctorIdChange: (id: string) => void;
	newUrgency: WaitlistUrgency;
	onUrgencyChange: (urgency: WaitlistUrgency) => void;
	newCategory: string;
	onCategoryChange: (category: string) => void;
	newTimeOfDay: string;
	onTimeOfDayChange: (time: string) => void;
	newNotes: string;
	onNotesChange: (notes: string) => void;
	onCancel: () => void;
}

export function WaitlistAddPatientForm({
	onSubmit,
	isSubmitting,
	clinicPatients,
	staffDoctors,
	newPatientId,
	onSelectPatientId,
	newPatientName,
	onPatientNameChange,
	newDoctorId,
	onDoctorIdChange,
	newUrgency,
	onUrgencyChange,
	newCategory,
	onCategoryChange,
	newTimeOfDay,
	onTimeOfDayChange,
	newNotes,
	onNotesChange,
	onCancel,
}: WaitlistAddPatientFormProps) {
	return (
		<form onSubmit={onSubmit} className="space-y-4 pt-1">
			<div>
				<label className="block text-xs font-semibold text-[var(--text,#0f172a)] mb-1">
					Пациент клиники *
				</label>
				<div className="space-y-1.5">
					<select
						value={newPatientId}
						onChange={(e) => onSelectPatientId(e.target.value)}
						className="w-full h-10 text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] px-3 focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					>
						<option value="">-- Выберите существующего пациента --</option>
						{clinicPatients.map((p: any) => (
							<option key={p.id} value={p.id}>
								{p.fullName} ({p.phone || "нет тел."})
							</option>
						))}
					</select>

					{!newPatientId && (
						<input
							type="text"
							placeholder="Или введите ФИО нового пациента..."
							value={newPatientName}
							onChange={(e) => onPatientNameChange(e.target.value)}
							className="w-full h-9 text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] px-3 focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
						/>
					)}
				</div>
			</div>

			<div>
				<label className="block text-xs font-semibold text-[var(--text,#0f172a)] mb-1">
					Желаемый врач
				</label>
				<select
					value={newDoctorId}
					onChange={(e) => onDoctorIdChange(e.target.value)}
					className="w-full h-10 text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] px-3 focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
				>
					<option value="">Любой врач клиники</option>
					{staffDoctors.map((doc: any) => (
						<option key={doc.id} value={doc.id}>
							{doc.fullName}
						</option>
					))}
				</select>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div>
					<label className="block text-xs font-semibold text-[var(--text,#0f172a)] mb-1">
						Срочность приёма
					</label>
					<select
						value={newUrgency}
						onChange={(e) => onUrgencyChange(e.target.value as WaitlistUrgency)}
						className="w-full h-10 text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] px-3 focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					>
						<option value="routine">Плановый осмотр</option>
						<option value="urgent">Острая боль / Cito</option>
						<option value="treatment_plan">По плану лечения</option>
						<option value="hygiene">Профгигиена</option>
					</select>
				</div>

				<div>
					<label className="block text-xs font-semibold text-[var(--text,#0f172a)] mb-1">
						Направление
					</label>
					<select
						value={newCategory}
						onChange={(e) => onCategoryChange(e.target.value)}
						className="w-full h-10 text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] px-3 focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					>
						{TREATMENT_CATEGORIES.map((cat) => (
							<option key={cat} value={cat}>
								{cat}
							</option>
						))}
					</select>
				</div>
			</div>

			<div>
				<label className="block text-xs font-semibold text-[var(--text,#0f172a)] mb-1">
					Предпочтительное время
				</label>
				<select
					value={newTimeOfDay}
					onChange={(e) => onTimeOfDayChange(e.target.value)}
					className="w-full h-10 text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] px-3 focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
				>
					<option value="any">Любое время</option>
					<option value="morning">Утро (08:00 - 12:00)</option>
					<option value="day">День (12:00 - 17:00)</option>
					<option value="evening">Вечер (17:00 - 21:00)</option>
				</select>
			</div>

			<div>
				<label className="block text-xs font-semibold text-[var(--text,#0f172a)] mb-1">
					Клинический комментарий
				</label>
				<textarea
					rows={2}
					value={newNotes}
					onChange={(e) => onNotesChange(e.target.value)}
					placeholder="Например: жалуется на реакцию от холодного в зубе 3.6..."
					className="w-full text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] p-2.5 focus:ring-1 focus:ring-[var(--teal,#0d9488)] resize-none"
				/>
			</div>

			<div className="pt-2 flex items-center justify-end gap-2.5">
				<button
					type="button"
					onClick={onCancel}
					className="px-4 py-2 text-xs font-semibold text-[var(--text-muted,#64748b)] hover:text-[var(--text,#0f172a)] cursor-pointer"
				>
					Отмена
				</button>
				<button
					type="submit"
					disabled={isSubmitting}
					className="px-5 py-2.5 rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
				>
					{isSubmitting ? "Сохранение..." : "Добавить в лист ожидания"}
				</button>
			</div>
		</form>
	);
}
