/**
 * DENTE Dental CRM — Doctor Chair Shift Selector (Layer 4)
 *
 * Shift preset buttons (Morning, Evening, Full, Two Shifts),
 * doctor assignments for single or two shifts, and inline doctor creation.
 */

import React from "react";
import { Check, User, UserPlus } from "lucide-react";
import type { DentalSpecialty } from "@dental/shared";
import {
	CHAIR_SHIFT_PRESETS,
	type ChairShiftPresetId,
	formatDoctorShortName,
} from "../chairRosterMath";
import { QUICK_DOCTOR_SPECIALTIES } from "../QuickAddDoctorModal";
import type { ChairModalDoctorItem } from "./types";

export interface DoctorChairShiftSelectorProps {
	selectedShiftPreset: ChairShiftPresetId;
	onSelectShiftPreset: (preset: ChairShiftPresetId) => void;
	doctors: readonly ChairModalDoctorItem[];
	selectedDoctorId: string;
	onSelectDoctorId: (id: string) => void;
	selectedEveningDoctorId: string;
	onSelectEveningDoctorId: (id: string) => void;
	isInlineDoctorFormOpen: boolean;
	onToggleInlineDoctorForm: () => void;
	newDocName: string;
	onChangeNewDocName: (name: string) => void;
	newDocSpecialty: DentalSpecialty;
	onChangeNewDocSpecialty: (specialty: DentalSpecialty) => void;
	onSubmitInlineDoctor: () => Promise<void>;
}

export const DoctorChairShiftSelector: React.FC<DoctorChairShiftSelectorProps> = ({
	selectedShiftPreset,
	onSelectShiftPreset,
	doctors,
	selectedDoctorId,
	onSelectDoctorId,
	selectedEveningDoctorId,
	onSelectEveningDoctorId,
	isInlineDoctorFormOpen,
	onToggleInlineDoctorForm,
	newDocName,
	onChangeNewDocName,
	newDocSpecialty,
	onChangeNewDocSpecialty,
	onSubmitInlineDoctor,
}) => {
	return (
		<div className="space-y-4">
			{/* Shift Presets Grid */}
			<div>
				<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] mb-1.5">
					Режим смены (1 тап):
				</label>
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
					{CHAIR_SHIFT_PRESETS.map((preset) => {
						const isSelected = selectedShiftPreset === preset.id;
						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => onSelectShiftPreset(preset.id)}
								className={`min-h-[44px] p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
									isSelected
										? "border-[var(--teal,#0d9488)] bg-[var(--teal-dark,#0f766e)] text-white shadow-xs font-bold"
										: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]"
								}`}
								data-testid={`shift-preset-${preset.id}`}
								style={{ minHeight: "44px" }}
							>
								<span className="text-xs font-bold">{preset.label}</span>
								<span
									className={`text-[10px] ${
										isSelected ? "text-white/85" : "text-[var(--muted,#64748b)]"
									}`}
								>
									{preset.hours}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Doctor Select: Single vs Two Shifts */}
			{selectedShiftPreset === "two_shifts" ? (
				<div className="space-y-3">
					{/* Morning Doctor */}
					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2">
						<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
							Врач на утренней смене (08:00–14:00)
						</label>
						<select
							value={selectedDoctorId}
							onChange={(e) => onSelectDoctorId(e.target.value)}
							className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs font-bold outline-hidden focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
							data-testid="select-chair-doctor"
							style={{ minHeight: "44px" }}
						>
							<option value="">-- Выберите врача на утро --</option>
							{doctors.map((d) => (
								<option key={d.id} value={d.id}>
									{d.fullName} {d.role ? `(${d.role})` : ""}
								</option>
							))}
						</select>
						{/* Quick pills */}
						{doctors.length > 1 && (
							<div className="flex flex-wrap gap-1.5" data-testid="doctor-quick-switch-pills">
								{doctors.map((d) => {
									const isSel = selectedDoctorId === d.id;
									const sName = formatDoctorShortName(d.fullName || d.name || "Врач");
									return (
										<button
											key={d.id}
											type="button"
											onClick={() => onSelectDoctorId(d.id)}
											className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
												isSel
													? "bg-[var(--teal-dark,#0f766e)] text-white border-[var(--teal,#0d9488)] shadow-xs"
													: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:border-[var(--teal,#0d9488)]"
											}`}
											data-testid={`btn-quick-select-doctor-${d.id}`}
											title={d.fullName}
											style={{ minHeight: "44px" }}
										>
											<User size={13} className={isSel ? "text-white" : "text-[var(--teal,#0d9488)]"} />
											<span>{sName}</span>
										</button>
									);
								})}
							</div>
						)}
					</div>

					{/* Evening Doctor */}
					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2">
						<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
							Врач на вечерней смене (14:00–20:00)
						</label>
						<select
							value={selectedEveningDoctorId}
							onChange={(e) => onSelectEveningDoctorId(e.target.value)}
							className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs font-bold outline-hidden focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
							data-testid="select-chair-evening-doctor"
							style={{ minHeight: "44px" }}
						>
							<option value="">-- Выберите врача на вечер --</option>
							{doctors.map((d) => (
								<option key={d.id} value={d.id}>
									{d.fullName} {d.role ? `(${d.role})` : ""}
								</option>
							))}
						</select>
						{/* Quick pills */}
						{doctors.length > 1 && (
							<div className="flex flex-wrap gap-1.5" data-testid="evening-doctor-quick-switch-pills">
								{doctors.map((d) => {
									const isSel = selectedEveningDoctorId === d.id;
									const sName = formatDoctorShortName(d.fullName || d.name || "Врач");
									return (
										<button
											key={d.id}
											type="button"
											onClick={() => onSelectEveningDoctorId(d.id)}
											className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
												isSel
													? "bg-[var(--teal-dark,#0f766e)] text-white border-[var(--teal,#0d9488)] shadow-xs"
													: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:border-[var(--teal,#0d9488)]"
											}`}
											data-testid={`btn-quick-select-evening-doctor-${d.id}`}
											title={d.fullName}
											style={{ minHeight: "44px" }}
										>
											<User size={13} className={isSel ? "text-white" : "text-[var(--teal,#0d9488)]"} />
											<span>{sName}</span>
										</button>
									);
								})}
							</div>
						)}
					</div>
				</div>
			) : (
				<div>
					<div className="flex items-center justify-between mb-1.5">
						<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
							Врач на смене:
						</label>
						<button
							type="button"
							onClick={onToggleInlineDoctorForm}
							className="min-h-[44px] text-xs font-bold text-[var(--teal,#0d9488)] hover:underline flex items-center gap-1 cursor-pointer"
							style={{ minHeight: "44px" }}
						>
							<UserPlus size={14} />
							<span>{isInlineDoctorFormOpen ? "Скрыть форму" : "+ Новый врач"}</span>
						</button>
					</div>

					{/* Inline Doctor Add Panel (Anti-Matryoshka Sin 6) */}
					{isInlineDoctorFormOpen && (
						<div
							className="p-3 mb-3 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--teal,#0d9488)]/40 space-y-2.5 animate-in fade-in"
							data-testid="inline-quick-add-doctor-form"
						>
							<span className="text-xs font-bold text-[var(--ink,#0f172a)] block">
								Быстрое добавление врача без модалок:
							</span>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<input
									type="text"
									placeholder="ФИО врача (например: Смирнов В.А.)"
									value={newDocName}
									onChange={(e) => onChangeNewDocName(e.target.value)}
									className="min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] font-medium outline-hidden focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
									data-testid="inline-doctor-fullname-input"
									style={{ minHeight: "44px" }}
								/>
								<select
									value={newDocSpecialty}
									onChange={(e) => onChangeNewDocSpecialty(e.target.value as DentalSpecialty)}
									className="min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] font-medium outline-hidden focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
									style={{ minHeight: "44px" }}
								>
									{QUICK_DOCTOR_SPECIALTIES.map((sp) => (
										<option key={sp.id} value={sp.id}>
											{sp.label}
										</option>
									))}
								</select>
							</div>
							<button
								type="button"
								onClick={onSubmitInlineDoctor}
								className="min-h-[44px] px-4 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
								data-testid="inline-doctor-submit-btn"
								style={{ minHeight: "44px" }}
							>
								<Check size={14} />
								<span>Сохранить и выбрать</span>
							</button>
						</div>
					)}

					<select
						value={selectedDoctorId}
						onChange={(e) => onSelectDoctorId(e.target.value)}
						className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] text-xs font-bold outline-hidden focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
						data-testid="select-chair-doctor"
						style={{ minHeight: "44px" }}
					>
						<option value="">-- Выберите врача --</option>
						{doctors.map((d) => (
							<option key={d.id} value={d.id}>
								{d.fullName} {d.role ? `(${d.role})` : ""}
							</option>
						))}
					</select>

					{/* Quick switch pills */}
					{doctors.length > 1 && (
						<div className="mt-2 space-y-1">
							<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">
								Быстрый выбор врача (1 тап):
							</span>
							<div className="flex flex-wrap gap-1.5" data-testid="doctor-quick-switch-pills">
								{doctors.map((d) => {
									const isSel = selectedDoctorId === d.id;
									const sName = formatDoctorShortName(d.fullName || d.name || "Врач");
									return (
										<button
											key={d.id}
											type="button"
											onClick={() => onSelectDoctorId(d.id)}
											className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 select-none ${
												isSel
													? "bg-[var(--teal-dark,#0f766e)] text-white border-[var(--teal,#0d9488)] shadow-xs"
													: "bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:border-[var(--teal,#0d9488)] hover:bg-[var(--paper,#ffffff)]"
											}`}
											data-testid={`btn-quick-select-doctor-${d.id}`}
											title={d.fullName}
											style={{ minHeight: "44px" }}
										>
											<User size={13} className={isSel ? "text-white" : "text-[var(--teal,#0d9488)]"} />
											<span>{sName}</span>
										</button>
									);
								})}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
