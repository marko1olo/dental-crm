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

export function Step1ClinicProfile() {
	const { profile, updateProfile, setOperationalMode } = useOnboardingStore();

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
								onClick={() => setOperationalMode(modeMeta.id)}
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
								placeholder="Например: ДЕНТЕ Стоматология"
								value={profile.clinicName}
								onChange={(e) => updateProfile({ clinicName: e.target.value })}
								autoFocus
							/>
						</div>
						<small className="field-hint">Используется в шапке приёма, договорах и счетах 54-ФЗ</small>
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
