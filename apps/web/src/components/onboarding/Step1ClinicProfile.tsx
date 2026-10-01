import React from "react";
import {
	CLINIC_OPERATIONAL_MODES,
	RUSSIAN_TIMEZONES,
	type ClinicOperationalMode,
} from "@dental/shared";
import {
	Building2,
	Check,
	Clock,
	Phone,
	Sparkles,
	Stethoscope,
	Users,
} from "lucide-react";
import { useOnboardingStore } from "../../store/onboardingStore";

import { getCachedActiveStaffUser } from "../../lib/offlineStorage";

/**
 * Нормализует телефонный номер (устраняет пробелы, тире, скобки) в читаемый формат
 */
export function formatAndNormalizePhone(rawPhone: string): string {
	const digits = rawPhone.replace(/\D/g, "");
	if (!digits) return rawPhone.trim();
	let cleanDigits = digits;
	if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
		cleanDigits = `7${digits.slice(1)}`;
	} else if (digits.length === 10) {
		cleanDigits = `7${digits}`;
	}
	if (cleanDigits.length === 11 && cleanDigits.startsWith("7")) {
		const part1 = cleanDigits.slice(1, 4);
		const part2 = cleanDigits.slice(4, 7);
		const part3 = cleanDigits.slice(7, 9);
		const part4 = cleanDigits.slice(9, 11);
		return `+7 (${part1}) ${part2}-${part3}-${part4}`;
	}
	return rawPhone.trim();
}

/**
 * Рассчитывает дружелюбный пресет названия клиники для соло-врача по Mandate 8n
 */
export function getDoctorDefaultClinicName(currentName: string, mode: ClinicOperationalMode): string {
	if (mode !== "solo_doctor") {
		return currentName.trim() || "Стоматологический кабинет";
	}
	if (currentName.trim() && currentName !== "Стоматология ДЕНТЕ" && currentName !== "Стоматологический кабинет") {
		return currentName.trim();
	}
	const user = getCachedActiveStaffUser() as { fullName?: string } | null;
	if (user?.fullName) {
		const parts = user.fullName.trim().split(/\s+/);
		const surname = parts[0] || "";
		if (surname && !["доктор", "главврач", "владелец", "owner"].includes(surname.toLowerCase())) {
			return `Кабинет доктора ${surname}`;
		}
	}
	return "Кабинет доктора";
}

export function Step1ClinicProfile() {
	const { profile, updateProfile, setOperationalMode } = useOnboardingStore();

	const handleModeChange = (modeId: ClinicOperationalMode) => {
		setOperationalMode(modeId);
		if (modeId === "solo_doctor") {
			const presetName = getDoctorDefaultClinicName(profile.clinicName, "solo_doctor");
			updateProfile({ clinicName: presetName });
		}
	};

	const modeIcons: Record<ClinicOperationalMode, React.ReactNode> = {
		solo_doctor: <Stethoscope size={20} className="mode-icon" aria-hidden="true" />,
		one_chair: <Building2 size={20} className="mode-icon" aria-hidden="true" />,
		small_clinic: <Users size={20} className="mode-icon" aria-hidden="true" />,
		network_clinic: <Building2 size={20} className="mode-icon" aria-hidden="true" />,
	};

	return (
		<div className="onboarding-step-body animate-fade-in">
			<div className="step-intro-header">
				<div className="step-intro-badge">
					<Sparkles size={14} aria-hidden="true" />
					<span>Шаг 1 из 3: Быстрый запуск</span>
				</div>
				<h3>Профиль клиники и операционный режим</h3>
				<p>
					Выберите масштаб практики для моментальной адаптации интерфейса.
					Для соло-врача автоматически отключается сетевой шум и лишние согласования.
				</p>
			</div>

			<div className="step-section">
				<label className="section-label" id="operational-mode-label">
					Операционный режим работы клиники
				</label>
				<div
					className="mode-selection-grid"
					role="radiogroup"
					aria-labelledby="operational-mode-label"
				>
					{CLINIC_OPERATIONAL_MODES.map((modeMeta) => {
						const isSelected = profile.mode === modeMeta.id;
						return (
							<button
								key={modeMeta.id}
								type="button"
								role="radio"
								aria-checked={isSelected}
								className={`mode-select-card ${isSelected ? "selected" : ""}`}
								onClick={() => handleModeChange(modeMeta.id)}
							>
								<div className="mode-card-header">
									<div className="mode-icon-wrap">
										{modeIcons[modeMeta.id]}
									</div>
									<span className={`mode-badge ${modeMeta.id === "solo_doctor" ? "badge-primary" : ""}`}>
										{modeMeta.badge}
									</span>
									{isSelected && (
										<div className="mode-check-mark" aria-hidden="true">
											<Check size={14} />
										</div>
									)}
								</div>
								<div className="mode-card-content">
									<strong>{modeMeta.title}</strong>
									<p>{modeMeta.detail}</p>
								</div>
								<div className="mode-card-footer">
									<span className="mode-chairs-hint">
										Рекомендация: {modeMeta.recommendedChairs} {modeMeta.recommendedChairs === 1 ? "кресло" : "кресла"}
									</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			<div className="step-section">
				<label className="section-label">Основные параметры рабочего пространства</label>
				<div className="profile-inputs-grid">
					<div className="form-field">
						<label htmlFor="clinic-name-input">
							Название клиники или кабинета <span className="req-star">*</span>
						</label>
						<div className="input-with-icon">
							<Building2 size={16} className="field-icon" aria-hidden="true" />
							<input
								id="clinic-name-input"
								type="text"
								placeholder={
									profile.mode === "solo_doctor"
										? "Например: Кабинет доктора Иванова"
										: "Например: ДЕНТЕ Стоматология"
								}
								value={profile.clinicName}
								onChange={(e) => updateProfile({ clinicName: e.target.value })}
								onBlur={() => {
									if (!profile.clinicName.trim()) {
										const fallback =
											profile.mode === "solo_doctor"
												? "Кабинет доктора"
												: "Стоматологический кабинет";
										updateProfile({ clinicName: fallback });
									}
								}}
								autoFocus
							/>
						</div>
						<small className="field-hint">
							Используется в шапке приёма, договорах и счетах 54-ФЗ. Пустое поле автоматически заменяется на «Стоматологический кабинет»
						</small>
					</div>

					<div className="form-field">
						<label htmlFor="clinic-phone-input">Контактный телефон клиники</label>
						<div className="input-with-icon">
							<Phone size={16} className="field-icon" aria-hidden="true" />
							<input
								id="clinic-phone-input"
								type="tel"
								placeholder="+7 (999) 000-00-00"
								value={profile.phone}
								onChange={(e) => updateProfile({ phone: e.target.value })}
								onBlur={() => {
									if (profile.phone.trim()) {
										const normalized = formatAndNormalizePhone(profile.phone);
										updateProfile({ phone: normalized });
									}
								}}
							/>
						</div>
						<small className="field-hint">Для связи с пациентами и SMS/Telegram уведомлений</small>
					</div>

					<div className="form-field form-span-2">
						<label htmlFor="clinic-timezone-select">
							Часовой пояс клиники <span className="req-star">*</span>
						</label>
						<div className="input-with-icon">
							<Clock size={16} className="field-icon" aria-hidden="true" />
							<select
								id="clinic-timezone-select"
								value={profile.timezone}
								onChange={(e) => updateProfile({ timezone: e.target.value })}
							>
								{RUSSIAN_TIMEZONES.map((tz) => (
									<option key={tz.value} value={tz.value}>
										{tz.label} ({tz.offsetLabel})
									</option>
								))}
							</select>
						</div>
						<small className="field-hint">Расписание и слоты визитов автоматически синхронизируются с локальным временем</small>
					</div>
				</div>
			</div>
		</div>
	);
}
