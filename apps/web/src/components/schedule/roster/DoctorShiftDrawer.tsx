/**
 * DoctorShiftDrawer.tsx
 *
 * DENTE Dental CRM — Quick Shift Edit & Creation Drawer HUD
 * Ergonomics: 44x44px touch targets, 1-click select, non-blocking shift saves (Mandate 8e)
 */

import React from "react";
import { Check, Trash2, X } from "lucide-react";
import {
	type CabinetDefinition,
	CLINIC_CABINETS_CATALOG,
	DEFAULT_CLINIC_STAFF,
	MEDICAL_STAFF_ROLES,
	SHIFT_ARCHETYPES,
	type ShiftArchetypeId,
	type StaffMember,
} from "./doctorShiftRosterPresets";
import {
	calculateShiftDurationHours,
	type DoctorShift,
} from "./doctorShiftRosterEngine";

export interface DoctorShiftDrawerProps {
	editingShift: Partial<DoctorShift> | null;
	isNewShift: boolean;
	staffList?: StaffMember[];
	cabinets?: CabinetDefinition[];
	weekStartDateIso: string;
	onClose: () => void;
	onChangeEditingShift: React.Dispatch<
		React.SetStateAction<Partial<DoctorShift> | null>
	>;
	onSaveShift: (shift: DoctorShift, isNew: boolean) => void;
	onDeleteShift: (shiftId: string) => void;
}

export function DoctorShiftDrawer({
	editingShift,
	isNewShift,
	staffList = DEFAULT_CLINIC_STAFF,
	cabinets = CLINIC_CABINETS_CATALOG,
	weekStartDateIso,
	onClose,
	onChangeEditingShift,
	onSaveShift,
	onDeleteShift,
}: DoctorShiftDrawerProps) {
	if (!editingShift) return null;

	const handleSave = () => {
		const effectiveDoc =
			staffList.find((s) => s.id === editingShift.doctorId) ||
			staffList.find((s) => s.isDoctor) ||
			staffList[0] ||
			DEFAULT_CLINIC_STAFF[0]!;

		const effectiveCab =
			cabinets.find((c) => c.id === editingShift.cabinetId) ||
			cabinets[0] ||
			CLINIC_CABINETS_CATALOG[0]!;

		const effectiveChair =
			effectiveCab.chairs.find((ch) => ch.id === editingShift.chairId) ||
			effectiveCab.chairs[0] || {
				id: "chair-1a",
				name: "Кресло 1А",
				equipment: "",
			};

		const effectiveDate = editingShift.dateIso || weekStartDateIso;

		const { durationHours, nightHours } = calculateShiftDurationHours(
			editingShift.startTime || "08:30",
			editingShift.endTime || "14:30",
			editingShift.breakMinutes || 0,
		);

		const asst = editingShift.assistantId
			? staffList.find((s) => s.id === editingShift.assistantId)
			: null;

		const finalizedShift: DoctorShift = {
			id: editingShift.id || `shift-${Date.now()}`,
			doctorId: effectiveDoc.id,
			doctorName:
				effectiveDoc.shortName ||
				editingShift.doctorName ||
				effectiveDoc.fullName,
			doctorRole: effectiveDoc.role || editingShift.doctorRole || "therapist",
			assistantId: asst ? asst.id : null,
			assistantName: asst ? asst.shortName || asst.fullName : null,
			cabinetId: effectiveCab.id,
			chairId: effectiveChair.id,
			dateIso: effectiveDate,
			archetypeId: editingShift.archetypeId || "morning_shift",
			startTime: editingShift.startTime || "08:30",
			endTime: editingShift.endTime || "14:30",
			durationHours,
			breakMinutes: editingShift.breakMinutes || 0,
			isNight: editingShift.isNight || false,
			nightHours,
			...(editingShift.customNotes
				? { customNotes: editingShift.customNotes }
				: {}),
			status: editingShift.status || "scheduled",
			...(editingShift.absenceReason
				? { absenceReason: editingShift.absenceReason }
				: {}),
		};

		onSaveShift(finalizedShift, isNewShift);
	};

	return (
		<div
			className="roster-drawer-overlay"
			onClick={onClose}
		>
			<div
				className="roster-drawer-panel"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] dark:border-slate-700 pb-3">
					<h3 className="m-0 text-lg font-bold text-[var(--ink,#0f172a)] dark:text-slate-100">
						{isNewShift ? "Назначение новой смены" : "Редактирование смены"}
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-slate-800 transition-colors"
						aria-label="Закрыть панель"
					>
						<X size={20} />
					</button>
				</div>

				{/* Doctor select */}
				<div>
					<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
						Врач
					</label>
					<select
						className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-colors"
						value={editingShift.doctorId || ""}
						onChange={(e) => {
							const doc = staffList.find((s) => s.id === e.target.value);
							onChangeEditingShift((prev) => {
								if (!prev) return null;
								return {
									...prev,
									doctorId: e.target.value,
									doctorName: doc?.shortName || "",
									doctorRole: doc?.role || "therapist",
									assistantId:
										doc?.defaultAssistantId ?? prev.assistantId ?? null,
								};
							});
						}}
					>
						{staffList
							.filter((s) => s.isDoctor)
							.map((doc) => (
								<option key={doc.id} value={doc.id}>
									{doc.fullName} ({MEDICAL_STAFF_ROLES[doc.role]?.nameRu})
								</option>
							))}
					</select>
				</div>

				{/* Assistant select */}
				<div>
					<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
						Ассистент / Медсестра
					</label>
					<select
						className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-colors"
						value={editingShift.assistantId || ""}
						onChange={(e) => {
							const asst = staffList.find((s) => s.id === e.target.value);
							onChangeEditingShift((prev) => ({
								...prev,
								assistantId: e.target.value || null,
								assistantName: asst ? asst.shortName : null,
							}));
						}}
					>
						<option value="">(Без ассистента)</option>
						{staffList
							.filter((s) => s.isAssistant)
							.map((asst) => (
								<option key={asst.id} value={asst.id}>
									{asst.fullName}
								</option>
							))}
					</select>
				</div>

				{/* Cabinet & Chair select */}
				<div className="grid grid-cols-2 gap-3">
					<div>
						<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
							Кабинет
						</label>
						<select
							className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-colors"
							value={editingShift.cabinetId || "cab-1"}
							onChange={(e) => {
								const cab = cabinets.find((c) => c.id === e.target.value);
								onChangeEditingShift((prev) => ({
									...prev,
									cabinetId: e.target.value,
									chairId: cab?.chairs[0]?.id || "chair-1a",
								}));
							}}
						>
							{cabinets.map((cab) => (
								<option key={cab.id} value={cab.id}>
									{cab.name}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
							Кресло
						</label>
						<select
							className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-colors"
							value={editingShift.chairId || "chair-1a"}
							onChange={(e) =>
								onChangeEditingShift((prev) => ({
									...prev,
									chairId: e.target.value,
								}))
							}
						>
							{cabinets
								.find((c) => c.id === (editingShift.cabinetId || "cab-1"))
								?.chairs.map((chair) => (
									<option key={chair.id} value={chair.id}>
										{chair.name}
									</option>
								))}
						</select>
					</div>
				</div>

				{/* Date & Shift Template */}
				<div className="grid grid-cols-2 gap-3">
					<div>
						<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
							Дата
						</label>
						<input
							type="date"
							className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-colors"
							value={editingShift.dateIso || ""}
							onChange={(e) =>
								onChangeEditingShift((prev) => ({
									...prev,
									dateIso: e.target.value,
								}))
							}
						/>
					</div>
					<div>
						<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
							Шаблон
						</label>
						<select
							className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-colors"
							value={editingShift.archetypeId || "morning_shift"}
							onChange={(e) => {
								const archId = e.target.value as ShiftArchetypeId;
								const arch = SHIFT_ARCHETYPES[archId];
								onChangeEditingShift((prev) => ({
									...prev,
									archetypeId: archId,
									startTime:
										arch.startTime || prev?.startTime || "08:30",
									endTime: arch.endTime || prev?.endTime || "14:30",
									durationHours: arch.durationHours,
									isNight: arch.isNight,
									breakMinutes: arch.breakMinutes,
								}));
							}}
						>
							{Object.values(SHIFT_ARCHETYPES).map((arch) => (
								<option key={arch.id} value={arch.id}>
									{arch.name}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Times */}
				<div className="grid grid-cols-2 gap-3">
					<div>
						<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
							Начало смены
						</label>
						<input
							type="time"
							className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-colors"
							value={editingShift.startTime || "08:30"}
							onChange={(e) =>
								onChangeEditingShift((prev) => ({
									...prev,
									startTime: e.target.value,
								}))
							}
						/>
					</div>
					<div>
						<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
							Окончание
						</label>
						<input
							type="time"
							className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-colors"
							value={editingShift.endTime || "14:30"}
							onChange={(e) =>
								onChangeEditingShift((prev) => ({
									...prev,
									endTime: e.target.value,
								}))
							}
						/>
					</div>
				</div>

				{/* Notes */}
				<div>
					<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
						Примечание
					</label>
					<input
						type="text"
						placeholder="например, только консультации или сложная хирургия"
						className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-100 placeholder-[var(--muted,#94a3b8)] dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] transition-colors"
						value={editingShift.customNotes || ""}
						onChange={(e) =>
							onChangeEditingShift((prev) => ({
								...prev,
								customNotes: e.target.value,
							}))
						}
					/>
				</div>

				{/* Drawer Footer Actions */}
				<div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--line,#e2e8f0)] dark:border-slate-700">
					{!isNewShift && editingShift.id && (
						<button
							type="button"
							className="roster-btn roster-btn-danger"
							onClick={() => onDeleteShift(editingShift.id!)}
							style={{ minHeight: "44px" }}
						>
							<Trash2 size={16} />
							<span>Удалить</span>
						</button>
					)}
					<div className="flex items-center gap-2 ml-auto">
						<button
							type="button"
							className="roster-btn roster-btn-secondary"
							onClick={onClose}
							style={{ minHeight: "44px" }}
						>
							Отмена
						</button>
						<button
							type="button"
							className="roster-btn roster-btn-primary"
							onClick={handleSave}
							style={{ minHeight: "44px" }}
						>
							<Check size={16} />
							<span>Сохранить смену</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
