import React from "react";
import { Check, UserPlus } from "lucide-react";
import {
	type WaitlistUrgency,
	URGENCY_CONFIG,
} from "./waitlistCancellationEngine";

export interface WaitlistQuickAddFormProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly isSubmitting: boolean;
	readonly selectedPatientId: string;
	readonly onSelectPatientId: (id: string) => void;
	readonly quickNewPatientMode: boolean;
	readonly onToggleQuickNewPatientMode: (mode: boolean) => void;
	readonly quickFullName: string;
	readonly onChangeQuickFullName: (name: string) => void;
	readonly quickPhone: string;
	readonly onChangeQuickPhone: (phone: string) => void;
	readonly preferredDoctorId: string;
	readonly onChangePreferredDoctorId: (id: string) => void;
	readonly addUrgency: WaitlistUrgency;
	readonly onChangeAddUrgency: (urgency: WaitlistUrgency) => void;
	readonly addPreferredTime: string;
	readonly onChangeAddPreferredTime: (time: string) => void;
	readonly onSubmit: (e: React.FormEvent) => void;
	// biome-ignore lint/suspicious/noExplicitAny: patient list type
	readonly patientsList: readonly any[];
	// biome-ignore lint/suspicious/noExplicitAny: doctors list type
	readonly doctors: readonly any[];
}

export const WaitlistQuickAddForm: React.FC<WaitlistQuickAddFormProps> = ({
	isOpen,
	onClose,
	isSubmitting,
	selectedPatientId,
	onSelectPatientId,
	quickNewPatientMode,
	onToggleQuickNewPatientMode,
	quickFullName,
	onChangeQuickFullName,
	quickPhone,
	onChangeQuickPhone,
	preferredDoctorId,
	onChangePreferredDoctorId,
	addUrgency,
	onChangeAddUrgency,
	addPreferredTime,
	onChangeAddPreferredTime,
	onSubmit,
	patientsList,
	doctors,
}) => {
	if (!isOpen) return null;

	return (
		<form
			onSubmit={onSubmit}
			className="p-3.5 mx-3.5 sm:mx-4 mt-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--teal)]/40 space-y-3 shrink-0 animate-in fade-in zoom-in-95 duration-100"
			data-testid="waitlist-quick-add-form"
		>
			<div className="flex items-center justify-between">
				<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--teal-dark,var(--teal))] flex items-center gap-1.5 m-0">
					<UserPlus className="w-3.5 h-3.5 shrink-0" />
					Добавить пациента в очередь за 5 секунд
				</h4>
				<button
					type="button"
					onClick={onClose}
					className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
				>
					Свернуть
				</button>
			</div>

			{/* Patient Mode Toggle */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<span className="text-xs text-[var(--muted)] font-semibold">
						Пациент *
					</span>
					<div className="inline-flex rounded-md p-0.5 bg-[var(--paper)] border border-[var(--line)] text-[11px]">
						<button
							type="button"
							onClick={() => onToggleQuickNewPatientMode(false)}
							className={`px-2 py-0.5 rounded cursor-pointer ${
								!quickNewPatientMode
									? "bg-[var(--teal)] text-white font-bold"
									: "text-[var(--muted)]"
							}`}
						>
							Из базы
						</button>
						<button
							type="button"
							onClick={() => onToggleQuickNewPatientMode(true)}
							className={`px-2 py-0.5 rounded cursor-pointer ${
								quickNewPatientMode
									? "bg-[var(--teal)] text-white font-bold"
									: "text-[var(--muted)]"
							}`}
						>
							Новый
						</button>
					</div>
				</div>

				{!quickNewPatientMode ? (
					<select
						value={selectedPatientId}
						onChange={(e) => onSelectPatientId(e.target.value)}
						className="w-full h-8 px-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
						required={!quickNewPatientMode}
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
					<div className="grid grid-cols-2 gap-2">
						<input
							type="text"
							value={quickFullName}
							onChange={(e) => onChangeQuickFullName(e.target.value)}
							placeholder="ФИО пациента *"
							className="h-8 px-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:ring-1 focus:ring-[var(--teal)]"
							autoFocus
							data-testid="waitlist-quick-name-input"
						/>
						<input
							type="tel"
							value={quickPhone}
							onChange={(e) => onChangeQuickPhone(e.target.value)}
							placeholder="+7 (___) ___-__-__"
							className="h-8 px-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:ring-1 focus:ring-[var(--teal)]"
							data-testid="waitlist-quick-phone-input"
						/>
					</div>
				)}
			</div>

			{/* Urgency 4-Pill Selector */}
			<div className="space-y-1">
				<span className="text-xs text-[var(--muted)] font-semibold block">
					Срочность обращения *
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
								onClick={() => onChangeAddUrgency(u)}
								className={`h-7 px-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center text-center ${
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
					<span className="text-[11px] text-[var(--muted)] font-semibold block mb-0.5">
						Желаемый врач
					</span>
					<select
						value={preferredDoctorId}
						onChange={(e) => onChangePreferredDoctorId(e.target.value)}
						className="w-full h-8 px-2 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:ring-1 focus:ring-[var(--teal)]"
					>
						<option value="">-- Любой врач клиники --</option>
						{doctors.map((d: any) => (
							<option key={d.id} value={d.id}>
								{d.fullName || d.name}
							</option>
						))}
					</select>
				</div>
				<div>
					<span className="text-[11px] text-[var(--muted)] font-semibold block mb-0.5">
						Удобное время
					</span>
					<select
						value={addPreferredTime}
						onChange={(e) => onChangeAddPreferredTime(e.target.value)}
						className="w-full h-8 px-2 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] outline-none focus:ring-1 focus:ring-[var(--teal)]"
					>
						<option value="any">Любое время дня</option>
						<option value="morning">Утро (08:00–12:00)</option>
						<option value="day">День (12:00–17:00)</option>
						<option value="evening">Вечер (17:00–21:00)</option>
					</select>
				</div>
			</div>

			<button
				type="submit"
				disabled={isSubmitting}
				className="w-full h-8 bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] font-bold rounded-lg text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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
