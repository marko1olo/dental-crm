import React, { useState } from "react";
import {
	CalendarDays,
	Check,
	ChevronDown,
	ChevronUp,
	ClipboardList,
	Clock,
	SlidersHorizontal,
	Star,
	UserPlus,
	Zap,
} from "lucide-react";
import {
	type WaitlistUrgency,
	URGENCY_CONFIG,
} from "./waitlistCancellationEngine";
import { TREATMENT_CATEGORIES } from "./waitlistMatchScoring";
import type { PreferredTimeOfDay, WaitlistPriority } from "./waitlistMatchScoring";

export type { WaitlistUrgency, PreferredTimeOfDay, WaitlistPriority };
export { URGENCY_CONFIG, TREATMENT_CATEGORIES };

export interface WaitlistQuickAddFormProps {
	readonly isOpen?: boolean;
	readonly onClose?: () => void;
	readonly isSubmitting: boolean;
	readonly selectedPatientId: string;
	readonly onSelectPatientId?: (id: string) => void;
	readonly setSelectedPatientId?: (id: string) => void;
	readonly quickNewPatientMode?: boolean;
	readonly onToggleQuickNewPatientMode?: (mode: boolean) => void;
	readonly quickFullName?: string;
	readonly onChangeQuickFullName?: (name: string) => void;
	readonly quickPhone?: string;
	readonly onChangeQuickPhone?: (phone: string) => void;
	readonly preferredDoctorId?: string;
	readonly onChangePreferredDoctorId?: (id: string) => void;
	readonly setPreferredDoctorId?: (id: string) => void;
	readonly addUrgency?: WaitlistUrgency;
	readonly onChangeAddUrgency?: (urgency: WaitlistUrgency) => void;
	readonly priorityLevel?: WaitlistPriority;
	readonly setPriorityLevel?: (level: WaitlistPriority) => void;
	readonly addPreferredTime?: string;
	readonly onChangeAddPreferredTime?: (time: string) => void;
	readonly treatmentCategory?: string;
	readonly setTreatmentCategory?: (cat: string) => void;
	readonly preferredDays?: string[];
	readonly setPreferredDays?: (days: string[]) => void;
	readonly preferredTimeOfDay?: PreferredTimeOfDay[];
	readonly setPreferredTimeOfDay?: (times: PreferredTimeOfDay[]) => void;
	readonly expiryDays?: number | null;
	readonly setExpiryDays?: (days: number | null) => void;
	readonly customExpiryDate?: string;
	readonly setCustomExpiryDate?: (date: string) => void;
	readonly notes?: string;
	readonly setNotes?: (notes: string) => void;
	readonly onSubmit: (e: React.FormEvent) => void;
	// biome-ignore lint/suspicious/noExplicitAny: patient list type
	readonly patientsList: readonly any[];
	// biome-ignore lint/suspicious/noExplicitAny: doctors list type
	readonly doctors: readonly any[];
}

export const WaitlistQuickAddForm: React.FC<WaitlistQuickAddFormProps> = ({
	isOpen = true,
	onClose,
	isSubmitting,
	selectedPatientId,
	onSelectPatientId,
	setSelectedPatientId,
	quickNewPatientMode = false,
	onToggleQuickNewPatientMode,
	quickFullName = "",
	onChangeQuickFullName,
	quickPhone = "",
	onChangeQuickPhone,
	preferredDoctorId = "",
	onChangePreferredDoctorId,
	setPreferredDoctorId,
	addUrgency = "routine",
	onChangeAddUrgency,
	priorityLevel,
	setPriorityLevel,
	addPreferredTime = "any",
	onChangeAddPreferredTime,
	treatmentCategory = "",
	setTreatmentCategory,
	preferredDays = ["weekdays"],
	setPreferredDays,
	preferredTimeOfDay = ["morning", "day"],
	setPreferredTimeOfDay,
	expiryDays = 7,
	setExpiryDays,
	customExpiryDate = "",
	setCustomExpiryDate,
	notes = "",
	setNotes,
	onSubmit,
	patientsList,
	doctors,
}) => {
	const [localNewPatientMode, setLocalNewPatientMode] = useState(quickNewPatientMode);
	const [localFullName, setLocalFullName] = useState(quickFullName);
	const [localPhone, setLocalPhone] = useState(quickPhone);
	const [showAdvancedParams, setShowAdvancedParams] = useState(
		Boolean(treatmentCategory || notes || (preferredDays && preferredDays.length > 0 && !preferredDays.includes("weekdays"))),
	);

	if (!isOpen) return null;

	const isNewPatient = onToggleQuickNewPatientMode !== undefined ? quickNewPatientMode : localNewPatientMode;
	const toggleNewPatient = (mode: boolean) => {
		if (onToggleQuickNewPatientMode) {
			onToggleQuickNewPatientMode(mode);
		} else {
			setLocalNewPatientMode(mode);
		}
	};

	const currentFullName = onChangeQuickFullName !== undefined ? quickFullName : localFullName;
	const handleFullNameChange = (val: string) => {
		if (onChangeQuickFullName) {
			onChangeQuickFullName(val);
		} else {
			setLocalFullName(val);
		}
	};

	const currentPhone = onChangeQuickPhone !== undefined ? quickPhone : localPhone;
	const handlePhoneChange = (val: string) => {
		if (onChangeQuickPhone) {
			onChangeQuickPhone(val);
		} else {
			setLocalPhone(val);
		}
	};

	const handlePatientSelect = (id: string) => {
		if (onSelectPatientId) onSelectPatientId(id);
		if (setSelectedPatientId) setSelectedPatientId(id);
	};

	const handleDoctorSelect = (id: string) => {
		if (onChangePreferredDoctorId) onChangePreferredDoctorId(id);
		if (setPreferredDoctorId) setPreferredDoctorId(id);
	};

	const handleUrgencySelect = (u: WaitlistUrgency) => {
		if (onChangeAddUrgency) onChangeAddUrgency(u);
		if (setPriorityLevel) {
			const map: Record<WaitlistUrgency, WaitlistPriority> = {
				acute_pain: "urgent",
				ortho_endo: "treatment_plan",
				hygiene: "medium",
				routine: "routine",
			};
			setPriorityLevel(map[u] || "medium");
		}
	};

	return (
		<form
			onSubmit={onSubmit}
			className="p-3.5 mx-auto w-full max-w-2xl rounded-xl bg-[var(--paper-soft)] border border-[var(--teal)]/40 space-y-3 shrink-0 animate-in fade-in zoom-in-95 duration-100"
			data-testid="waitlist-quick-add-form"
			data-sub-testid="add-waitlist-form"
		>
			<div className="flex items-center justify-between">
				<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--teal-dark,var(--teal))] flex items-center gap-1.5 m-0">
					<UserPlus className="w-3.5 h-3.5 shrink-0" />
					<span>Добавить пациента в лист ожидания за 5 секунд</span>
				</h4>
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
					>
						Свернуть
					</button>
				)}
			</div>

			{/* Patient Mode Toggle & Inputs */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<label
						htmlFor="waitlist-select-patient"
						className="text-xs text-[var(--muted)] font-semibold"
					>
						Пациент из картотеки *
					</label>
					<div className="inline-flex rounded-md p-0.5 bg-[var(--paper)] border border-[var(--line)] text-[11px]">
						<button
							type="button"
							onClick={() => toggleNewPatient(false)}
							className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
								!isNewPatient
									? "bg-[var(--teal)] text-white font-bold"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							Из базы
						</button>
						<button
							type="button"
							onClick={() => toggleNewPatient(true)}
							className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
								isNewPatient
									? "bg-[var(--teal)] text-white font-bold"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							Новый (+5 сек)
						</button>
					</div>
				</div>

				{!isNewPatient ? (
					<select
						id="waitlist-select-patient"
						value={selectedPatientId}
						onChange={(e) => handlePatientSelect(e.target.value)}
						className="w-full h-8 px-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)] pointer-coarse:min-h-[44px]"
						required={!isNewPatient}
						data-testid="waitlist-add-patient-select"
					>
						<option value="">-- Выберите пациента из базы --</option>
						{patientsList.map((p: any) => (
							<option key={p.id} value={p.id}>
								{p.fullName} {p.phone ? `(${p.phone})` : ""}
							</option>
						))}
					</select>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<input
							type="text"
							value={currentFullName}
							onChange={(e) => handleFullNameChange(e.target.value)}
							placeholder="ФИО пациента *"
							className="h-8 px-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:ring-1 focus:ring-[var(--teal)] pointer-coarse:min-h-[44px]"
							autoFocus
							required
							data-testid="waitlist-quick-name-input"
						/>
						<input
							type="tel"
							value={currentPhone}
							onChange={(e) => handlePhoneChange(e.target.value)}
							placeholder="+7 (___) ___-__-__"
							className="h-8 px-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:ring-1 focus:ring-[var(--teal)] pointer-coarse:min-h-[44px]"
							data-testid="waitlist-quick-phone-input"
						/>
					</div>
				)}
			</div>

			{/* Urgency 4-Pill Selector */}
			<div className="space-y-1">
				<span className="text-xs text-[var(--muted)] font-semibold block">
					Срочность обращения и категория *
				</span>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
					{(
						["acute_pain", "ortho_endo", "hygiene", "routine"] as const
					).map((u) => {
						const cfg = URGENCY_CONFIG[u];
						const isSel = addUrgency === u;
						return (
							<button
								key={u}
								type="button"
								onClick={() => handleUrgencySelect(u)}
								className={`h-7 px-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center text-center pointer-coarse:min-h-[44px] ${
									isSel
										? `${cfg.badgeClass} ring-1 ring-offset-0`
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								{cfg.shortLabel}
							</button>
						);
					})}
				</div>
			</div>

			{/* Doctor & Preferred Time */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				<div>
					<label
						htmlFor="waitlist-select-doctor"
						className="text-[11px] text-[var(--muted)] font-semibold block mb-0.5"
					>
						Желаемый врач
					</label>
					<select
						id="waitlist-select-doctor"
						value={preferredDoctorId}
						onChange={(e) => handleDoctorSelect(e.target.value)}
						className="w-full h-8 px-2 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:ring-1 focus:ring-[var(--teal)] pointer-coarse:min-h-[44px]"
					>
						<option value="">-- Любой врач клиники --</option>
						{doctors.map((d: any) => (
							<option key={d.id} value={d.id}>
								{d.fullName || d.name} {d.specialty ? `(${d.specialty})` : ""}
							</option>
						))}
					</select>
				</div>
				<div>
					<label
						htmlFor="waitlist-preferred-time"
						className="text-[11px] text-[var(--muted)] font-semibold block mb-0.5"
					>
						Удобное время суток
					</label>
					<select
						id="waitlist-preferred-time"
						value={addPreferredTime}
						onChange={(e) => {
							if (onChangeAddPreferredTime) onChangeAddPreferredTime(e.target.value);
							if (setPreferredTimeOfDay) {
								const tMap: Record<string, PreferredTimeOfDay[]> = {
									morning: ["morning"],
									day: ["day"],
									evening: ["evening"],
									any: ["morning", "day", "evening"],
								};
								setPreferredTimeOfDay(tMap[e.target.value] || ["morning", "day"]);
							}
						}}
						className="w-full h-8 px-2 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:ring-1 focus:ring-[var(--teal)] pointer-coarse:min-h-[44px]"
					>
						<option value="any">Любое время дня</option>
						<option value="morning">Утро (08:00–12:00)</option>
						<option value="day">День (12:00–17:00)</option>
						<option value="evening">Вечер (17:00–21:00)</option>
					</select>
				</div>
			</div>

			{/* Collapsible Advanced Clinical Settings (Mandate 8e, 8k: 1-click progressive disclosure) */}
			<div className="pt-1">
				<button
					type="button"
					onClick={() => setShowAdvancedParams((prev) => !prev)}
					className="text-[11px] font-semibold text-[var(--teal)] hover:text-[var(--teal-dark)] inline-flex items-center gap-1 cursor-pointer select-none"
				>
					<SlidersHorizontal size={12} />
					<span>
						{showAdvancedParams
							? "Скрыть клинические параметры"
							: "Дополнительные параметры (направление, дни, примечание)..."}
					</span>
					{showAdvancedParams ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
				</button>

				{showAdvancedParams && (
					<div className="mt-2.5 p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-3 animate-in fade-in duration-100">
						{/* Treatment Category */}
						<div className="space-y-1">
							<label
								htmlFor="waitlist-select-category"
								className="text-[11px] font-semibold text-[var(--muted)] block"
							>
								Направление / Причина обращения
							</label>
							<select
								id="waitlist-select-category"
								value={treatmentCategory}
								onChange={(e) => setTreatmentCategory?.(e.target.value)}
								className="w-full h-8 px-2 bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:ring-1 focus:ring-[var(--teal)] pointer-coarse:min-h-[44px]"
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
						{setPreferredDays && (
							<div className="space-y-1">
								<span className="text-[11px] font-semibold text-[var(--muted)] block">
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
											className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer pointer-coarse:min-h-[44px] ${
												preferredDays.includes(d.id)
													? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)]"
													: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
										>
											{d.label}
										</button>
									))}
								</div>
							</div>
						)}

						{/* Expiry Date */}
						{setExpiryDays && (
							<div className="space-y-1">
								<span className="text-[11px] font-semibold text-[var(--muted)] block">
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
												if (setCustomExpiryDate) setCustomExpiryDate("");
											}}
											className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer pointer-coarse:min-h-[44px] ${
												expiryDays === opt.days && !customExpiryDate
													? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)]"
													: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
										>
											{opt.label}
										</button>
									))}
									{setCustomExpiryDate && (
										<input
											type="date"
											value={customExpiryDate}
											onChange={(e) => {
												setCustomExpiryDate(e.target.value);
												setExpiryDays(null);
											}}
											className="h-7 px-2 bg-[var(--paper-soft)] border border-[var(--line)] rounded-md text-xs text-[var(--ink)]"
										/>
									)}
								</div>
							</div>
						)}

						{/* Notes */}
						<div className="space-y-1">
							<label
								htmlFor="waitlist-notes"
								className="text-[11px] font-semibold text-[var(--muted)] block"
							>
								Примечание администратора
							</label>
							<textarea
								id="waitlist-notes"
								value={notes}
								onChange={(e) => setNotes?.(e.target.value)}
								placeholder="Например: Пациент просил перезвонить после 15:00. Готов приехать за 30 минут."
								rows={2}
								className="w-full p-2 bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)] resize-none"
							/>
						</div>
					</div>
				)}
			</div>

			<button
				type="submit"
				aria-busy={isSubmitting || undefined}
				className="w-full h-8 bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] font-bold rounded-lg text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer pointer-coarse:min-h-[44px]"
				data-testid="waitlist-quick-submit-btn"
			>
				<Check className="w-3.5 h-3.5" />
				<span>
					{isSubmitting
						? "Сохраняю..."
						: "Записать в лист ожидания (+5 сек)"}
				</span>
			</button>
		</form>
	);
};

export default WaitlistQuickAddForm;
