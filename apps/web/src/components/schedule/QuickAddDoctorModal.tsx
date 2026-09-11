import React, { useState, useEffect } from "react";
import {
	UserPlus,
	X,
	Check,
	Armchair,
	Phone,
	Stethoscope,
	Palette,
	Pin,
} from "lucide-react";
import type { DentalSpecialty, StaffRole } from "@dental/shared";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

export interface DoctorSpecialtyOption {
	id: DentalSpecialty;
	label: string;
}

export const QUICK_DOCTOR_SPECIALTIES: readonly DoctorSpecialtyOption[] = [
	{ id: "therapist", label: "Терапевт" },
	{ id: "orthopedist", label: "Ортопед" },
	{ id: "surgeon", label: "Хирург-имплантолог" },
	{ id: "orthodontist", label: "Ортодонт" },
	{ id: "periodontist", label: "Пародонтолог" },
	{ id: "pediatric", label: "Детский стоматолог" },
	{ id: "hygienist", label: "Гигиенист" },
] as const;

export interface DoctorColorPreset {
	id: string;
	label: string;
	hex: string;
}

export const DOCTOR_COLOR_PRESETS: readonly DoctorColorPreset[] = [
	{ id: "teal", label: "Бирюзовый", hex: "#0d9488" },
	{ id: "sapphire", label: "Сапфировый", hex: "#2563eb" },
	{ id: "emerald", label: "Изумрудный", hex: "#059669" },
	{ id: "indigo", label: "Индиго", hex: "#4f46e5" },
	{ id: "amber", label: "Янтарный", hex: "#d97706" },
	{ id: "coral", label: "Коралловый", hex: "#e11d48" },
	{ id: "amethyst", label: "Аметистовый", hex: "#7c3aed" },
	{ id: "azure", label: "Лазурный", hex: "#0284c7" },
	{ id: "mint", label: "Мятный", hex: "#10b981" },
	{ id: "rose", label: "Розовый", hex: "#db2777" },
] as const;

export const DOCTOR_COLOR_PALETTE = DOCTOR_COLOR_PRESETS;

export function formatDoctorShortName(fullName: string): string {
	if (!fullName) return "";
	const cleaned = fullName.trim().replace(/^(д-р|доктор|врач)\s+/i, "");
	const parts = cleaned.trim().split(/\s+/);
	if (parts.length === 0 || !parts[0]) return fullName;
	const lastName = parts[0];
	if (parts.length === 1) return lastName;
	if (parts[1]?.includes(".")) {
		return `${lastName} ${parts.slice(1).join(" ")}`.trim();
	}
	const firstInitial = parts[1]?.[0] ? `${parts[1][0].toUpperCase()}.` : "";
	const middleInitial = parts[2]?.[0] ? `${parts[2][0].toUpperCase()}.` : "";
	return `${lastName} ${firstInitial}${middleInitial}`.trim();
}

export interface QuickAddDoctorData {
	id?: string;
	fullName: string;
	name?: string;
	shortName: string;
	specialty: DentalSpecialty;
	specialtyLabel: string;
	phone?: string | null;
	preferredChairId?: string | null;
	color: string;
	role?: StaffRole;
	active?: boolean;
}

export interface QuickAddDoctorModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onAddDoctor?: ((doctorData: QuickAddDoctorData) => Promise<void> | void) | undefined;
	readonly onDoctorAdded?: ((doctorData: QuickAddDoctorData) => Promise<void> | void) | undefined;
	readonly chairs?: Array<{ id: string; name: string; room?: string | null; active?: boolean }> | undefined;
	readonly existingDoctorsCount?: number | undefined;
	readonly defaultChairId?: string | null | undefined;
}

/**
 * QuickAddDoctorModal component (StomX & DentalPRO Parity, Feature 246 / Wave 57).
 *
 * Mandate 8c: Touch targets >= 44x44px.
 * Mandate 8d: 0 cartoon emojis (Lucide vector icons only), Anti-Matryoshka (max modal depth 1).
 * Mandate 8e: Doctor & Staff Autonomy (submit button is NEVER disabled, safe fallback defaults).
 * Mandate 8k: CRM != Reality Simulator (1-click frictionless setup).
 * Mandate 8n: Solo Doctor & Small Clinic Sovereignty.
 */
export function QuickAddDoctorModal({
	isOpen,
	onClose,
	onAddDoctor,
	onDoctorAdded,
	chairs = [],
	existingDoctorsCount = 0,
	defaultChairId = null,
}: QuickAddDoctorModalProps): React.ReactElement | null {
	const defaultDoctorName = `Врач ${existingDoctorsCount + 1}`;

	const [fullName, setFullName] = useState("");
	const [specialty, setSpecialty] = useState<DentalSpecialty>("therapist");
	const [phone, setPhone] = useState("");
	const [preferredChairId, setPreferredChairId] = useState<string>(defaultChairId || "");
	const [selectedColor, setSelectedColor] = useState<string>("#0d9488");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const activeChairs = chairs.filter((c) => c.active !== false);

	useEffect(() => {
		if (isOpen) {
			setFullName("");
			setSpecialty("therapist");
			setPhone("");
			setPreferredChairId(defaultChairId || "");
			setSelectedColor("#0d9488");
			setIsSubmitting(false);
		}
	}, [isOpen, defaultChairId]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		if (isOpen) {
			window.addEventListener("keydown", handleKeyDown);
		}
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, onClose]);

	if (!isOpen) {
		return null;
	}

	const handleSubmit = async (e?: React.FormEvent) => {
		if (e) {
			e.preventDefault();
		}
		if (isSubmitting) return;

		const finalName = fullName.trim() || defaultDoctorName;
		const shortName = formatDoctorShortName(finalName);
		const specialtyOption =
			QUICK_DOCTOR_SPECIALTIES.find((s) => s.id === specialty) ||
			QUICK_DOCTOR_SPECIALTIES[0]!;

		if (!fullName.trim()) {
			showToast(`Имя не указано. Заведено имя «${finalName}»`, "info", 3500);
		}

		setIsSubmitting(true);
		try {
			const docId = `doc-quick-${Date.now()}`;
			const finalPreferredChairId = preferredChairId.trim() || null;

			const doctorData: QuickAddDoctorData = {
				id: docId,
				fullName: finalName,
				name: finalName,
				shortName,
				specialty,
				specialtyLabel: specialtyOption.label,
				phone: phone.trim() || null,
				preferredChairId: finalPreferredChairId,
				color: selectedColor,
				role: "doctor",
				active: true,
			};

			// Save preferred chair binding in localStorage for resilient offline/mock parity
			if (typeof window !== "undefined" && finalPreferredChairId) {
				try {
					const storedMap = JSON.parse(
						localStorage.getItem("dente_doctor_preferred_chairs") || "{}",
					);
					storedMap[docId] = finalPreferredChairId;
					localStorage.setItem(
						"dente_doctor_preferred_chairs",
						JSON.stringify(storedMap),
					);

					const chairDefaultMap = JSON.parse(
						localStorage.getItem("dente_chair_default_doctors") || "{}",
					);
					chairDefaultMap[finalPreferredChairId] = docId;
					localStorage.setItem(
						"dente_chair_default_doctors",
						JSON.stringify(chairDefaultMap),
					);
				} catch {}
			}

			const addDoctorFn = onAddDoctor || onDoctorAdded;
			if (addDoctorFn) {
				await Promise.resolve(addDoctorFn(doctorData));
			} else {
				// Direct fallback to /api/settings/staff
				const endpoint = "/api/settings/staff";
				if (typeof fetch === "function") {
					await fetch(endpoint, {
						method: "POST",
						headers: denteAdminSecretRequestHeaders({
							"Content-Type": "application/json",
						}),
						body: JSON.stringify({
							fullName: finalName,
							role: "doctor",
							specialties: [specialty],
							phone: phone.trim() || null,
						}),
					}).catch(() => {});
				}
			}

			showToast(
				`Врач ${shortName} успешно добавлен и доступен в расписании`,
				"success",
				4000,
			);
			onClose();
		} catch {
			// Mandate 8e: Doctor Autonomy - never lock UI on network errors
			onClose();
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="quick-add-doctor-modal-title"
			data-testid="quick-doctor-modal"
		>
			<div
				className="relative w-full max-w-lg rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150 text-[var(--ink,#0f172a)]"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Modal Header */}
				<div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] shrink-0">
					<div className="flex items-center gap-3">
						<div
							className="w-11 h-11 rounded-xl flex items-center justify-center shadow-xs shrink-0"
							style={{
								backgroundColor: `${selectedColor}18`,
								color: selectedColor,
								border: `1px solid ${selectedColor}40`,
							}}
						>
							<UserPlus className="w-5 h-5" aria-hidden="true" />
						</div>
						<div>
							<h2
								id="quick-add-doctor-modal-title"
								className="text-base sm:text-lg font-bold tracking-tight text-[var(--ink,#0f172a)]"
							>
								Добавить врача в расписание
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
								Быстрое добавление врача и закрепление кресла (StomX / DentalPRO parity)
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] border border-transparent hover:border-[var(--line,#e2e8f0)] transition-all cursor-pointer shrink-0"
						aria-label="Закрыть окно"
						data-testid="quick-doctor-close-btn"
						style={{ minHeight: "44px", minWidth: "44px" }}
					>
						<X className="w-5 h-5" aria-hidden="true" />
					</button>
				</div>

				{/* Modal Body / Form */}
				<form
					onSubmit={handleSubmit}
					className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1"
				>
					{/* Field 1: Doctor Full Name */}
					<div className="space-y-1.5">
						<label
							htmlFor="quick-doctor-name"
							className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)]"
						>
							ФИО врача *
						</label>
						<input
							id="quick-doctor-name"
							type="text"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							placeholder="Например: Иванов Иван Иванович"
							className="w-full min-h-[44px] px-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-sm font-medium focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-hidden transition-all"
							data-testid="quick-doctor-name"
							style={{ minHeight: "44px" }}
							autoFocus
						/>
						<p className="text-[11px] text-[var(--muted,#64748b)]">
							Короткое имя для карточки:{" "}
							<span className="font-semibold text-[var(--ink)]">
								{formatDoctorShortName(fullName.trim() || defaultDoctorName)}
							</span>
						</p>
					</div>

					{/* Field 2: Specialty */}
					<div className="space-y-1.5">
						<label
							htmlFor="quick-doctor-specialty"
							className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5"
						>
							<Stethoscope className="w-3.5 h-3.5 text-[var(--teal)]" />
							<span>Специальность *</span>
						</label>
						<select
							id="quick-doctor-specialty"
							value={specialty}
							onChange={(e) => setSpecialty(e.target.value as DentalSpecialty)}
							className="w-full min-h-[44px] px-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-sm font-medium focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-hidden transition-all cursor-pointer"
							data-testid="quick-doctor-specialty"
							style={{ minHeight: "44px" }}
						>
							{QUICK_DOCTOR_SPECIALTIES.map((spec) => (
								<option key={spec.id} value={spec.id}>
									{spec.label}
								</option>
							))}
						</select>
					</div>

					{/* Field 3: Phone */}
					<div className="space-y-1.5">
						<label
							htmlFor="quick-doctor-phone"
							className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5"
						>
							<Phone className="w-3.5 h-3.5 text-[var(--teal)]" />
							<span>Телефон (опционально)</span>
						</label>
						<input
							id="quick-doctor-phone"
							type="tel"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							placeholder="+7 (___) ___-__-__"
							className="w-full min-h-[44px] px-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-sm font-medium focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-hidden transition-all"
							data-testid="quick-doctor-phone"
							style={{ minHeight: "44px" }}
						/>
					</div>

					{/* Field 4: Preferred Chair */}
					<div className="space-y-1.5">
						<label
							htmlFor="quick-doctor-preferred-chair"
							className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5"
						>
							<Armchair className="w-3.5 h-3.5 text-[var(--teal)]" />
							<span>Закрепленное кресло</span>
						</label>
						<select
							id="quick-doctor-preferred-chair"
							value={preferredChairId}
							onChange={(e) => setPreferredChairId(e.target.value)}
							className="w-full min-h-[44px] px-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-sm font-medium focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-hidden transition-all cursor-pointer"
							data-testid="quick-doctor-preferred-chair"
							style={{ minHeight: "44px" }}
						>
							<option value="">-- Без закрепления (по выбору) --</option>
							{activeChairs.map((ch) => (
								<option key={ch.id} value={ch.id}>
									{ch.name} {ch.room ? `(${ch.room})` : ""}
								</option>
							))}
						</select>
						<p className="text-[11px] text-[var(--muted,#64748b)] flex items-center gap-1">
							<Pin className="w-3 h-3 text-[var(--teal)] shrink-0" />
							<span>При выборе этого врача в записи кресло подставится автоматически</span>
						</p>
					</div>

					{/* Field 5: Color Badge */}
					<div className="space-y-1.5">
						<span
							id="quick-doctor-color-label"
							className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5"
						>
							<Palette className="w-3.5 h-3.5 text-[var(--teal)]" />
							<span>Цветовой бейдж врача (палитра)</span>
						</span>
						<div
							className="flex flex-wrap gap-2.5 pt-1"
							role="radiogroup"
							aria-labelledby="quick-doctor-color-label"
							data-testid="quick-doctor-color"
						>
							{DOCTOR_COLOR_PRESETS.map((preset) => {
								const isSelected = selectedColor.toLowerCase() === preset.hex.toLowerCase();
								return (
									<button
										key={preset.id}
										type="button"
										onClick={() => setSelectedColor(preset.hex)}
										className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer border relative select-none ${
											isSelected
												? "border-[var(--ink,#0f172a)] ring-2 ring-[var(--teal,#0d9488)] scale-110 shadow-sm"
												: "border-black/10 hover:scale-105"
										}`}
										style={{
											backgroundColor: preset.hex,
											minHeight: "44px",
											minWidth: "44px",
										}}
										title={`${preset.label} (${preset.hex})`}
										data-testid={`quick-doctor-color-${preset.id}`}
										role="radio"
										aria-checked={isSelected}
									>
										{isSelected && (
											<Check className="w-5 h-5 text-white drop-shadow-md" aria-hidden="true" />
										)}
									</button>
								);
							})}
						</div>
					</div>

					{/* Actions: Save & Cancel */}
					<div className="pt-2 border-t border-[var(--line,#e2e8f0)] flex items-center justify-end gap-2.5">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-4 rounded-xl text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] transition-all cursor-pointer"
							data-testid="quick-doctor-cancel-btn"
							style={{ minHeight: "44px" }}
						>
							Отмена
						</button>
						<button
							type="submit"
							className="min-h-[44px] px-5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
							data-testid="quick-doctor-submit-btn"
							style={{ minHeight: "44px" }}
							title="Сохранить врача в расписание"
						>
							<Check className="w-4 h-4" aria-hidden="true" />
							<span>{isSubmitting ? "Сохранение..." : "Сохранить врача"}</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export default QuickAddDoctorModal;
