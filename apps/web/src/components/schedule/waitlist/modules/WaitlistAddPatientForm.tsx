import React from "react";
import type { WaitlistUrgency } from "../waitlistTypes";
import { TREATMENT_CATEGORIES } from "../waitlistTypes";

export interface WaitlistAddPatientFormProps {
	onSubmit: (e: React.FormEvent) => void;
	isSubmitting: boolean;
	clinicPatients: Array<{ id: string; fullName: string; phone?: string | null }>;
	staffDoctors: Array<{ id: string; fullName: string }>;
	newPatientId: string;
	onSelectPatientId: (id: string) => void;
	newPatientName: string;
	onPatientNameChange: (name: string) => void;
	newPatientPhone?: string;
	onPatientPhoneChange?: (phone: string) => void;
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
	newPatientPhone = "",
	onPatientPhoneChange,
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
	const handleFormSubmit = (e: React.FormEvent) => {
		if (isSubmitting) {
			e.preventDefault();
			return;
		}
		onSubmit(e);
	};

	return (
		<form onSubmit={handleFormSubmit} className="space-y-4 pt-1">
			<div>
				<label className="block text-xs font-semibold text-[var(--ink)] mb-1">
					Пациент клиники *
				</label>
				<div className="space-y-1.5">
					<select
						value={newPatientId}
						onChange={(e) => onSelectPatientId(e.target.value)}
						className="w-full h-9 px-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
					>
						<option value="">-- Выберите существующего пациента --</option>
						{clinicPatients.map((p) => (
							<option key={p.id} value={p.id}>
								{p.fullName} ({p.phone || "нет тел."})
							</option>
						))}
					</select>

					{!newPatientId && (
						<div className="space-y-1.5 pt-1">
							<input
								type="text"
								placeholder="Или введите ФИО нового пациента..."
								value={newPatientName}
								onChange={(e) => onPatientNameChange(e.target.value)}
								className="w-full h-9 px-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:ring-1 focus:ring-[var(--primary)]"
							/>
							{onPatientPhoneChange && (
								<input
									type="tel"
									placeholder="Телефон: +7 (___) ___-__-__"
									value={newPatientPhone}
									onChange={(e) => onPatientPhoneChange(e.target.value)}
									className="w-full h-9 px-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:ring-1 focus:ring-[var(--primary)]"
								/>
							)}
						</div>
					)}
				</div>
			</div>

			<div>
				<label className="block text-xs font-semibold text-[var(--ink)] mb-1">
					Желаемый врач
				</label>
				<select
					value={newDoctorId}
					onChange={(e) => onDoctorIdChange(e.target.value)}
					className="w-full h-9 px-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:ring-1 focus:ring-[var(--primary)]"
				>
					<option value="">Любой врач клиники</option>
					{staffDoctors.map((doc) => (
						<option key={doc.id} value={doc.id}>
							{doc.fullName}
						</option>
					))}
				</select>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div>
					<label className="block text-xs font-semibold text-[var(--ink)] mb-1">
						Срочность приёма
					</label>
					<select
						value={newUrgency}
						onChange={(e) => onUrgencyChange(e.target.value as WaitlistUrgency)}
						className="w-full h-9 px-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:ring-1 focus:ring-[var(--primary)]"
					>
						<option value="routine">Плановый осмотр</option>
						<option value="urgent">Острая боль / Cito</option>
						<option value="treatment_plan">По плану лечения</option>
						<option value="hygiene">Профгигиена</option>
					</select>
				</div>

				<div>
					<label className="block text-xs font-semibold text-[var(--ink)] mb-1">
						Направление
					</label>
					<select
						value={newCategory}
						onChange={(e) => onCategoryChange(e.target.value)}
						className="w-full h-9 px-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:ring-1 focus:ring-[var(--primary)]"
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
				<label className="block text-xs font-semibold text-[var(--ink)] mb-1">
					Предпочтительное время
				</label>
				<select
					value={newTimeOfDay}
					onChange={(e) => onTimeOfDayChange(e.target.value)}
					className="w-full h-9 px-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:ring-1 focus:ring-[var(--primary)]"
				>
					<option value="any">Любое время</option>
					<option value="morning">Утро (08:00 - 12:00)</option>
					<option value="day">День (12:00 - 17:00)</option>
					<option value="evening">Вечер (17:00 - 21:00)</option>
				</select>
			</div>

			<div>
				<label className="block text-xs font-semibold text-[var(--ink)] mb-1">
					Клинический комментарий
				</label>
				<textarea
					rows={2}
					value={newNotes}
					onChange={(e) => onNotesChange(e.target.value)}
					placeholder="Например: жалуется на реакцию от холодного в зубе 3.6..."
					className="w-full text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] p-2.5 focus:ring-1 focus:ring-[var(--primary)] resize-none"
				/>
			</div>

			<div className="pt-2 flex items-center justify-end gap-2.5">
				<button
					type="button"
					onClick={onCancel}
					className="h-9 px-3.5 text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
				>
					Отмена
				</button>
				<button
					type="submit"
					disabled={false}
					aria-busy={isSubmitting || undefined}
					className="h-9 px-4 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer aria-busy:opacity-60 inline-flex items-center justify-center"
				>
					{isSubmitting ? "Сохранение..." : "Добавить в лист ожидания"}
				</button>
			</div>
		</form>
	);
}
