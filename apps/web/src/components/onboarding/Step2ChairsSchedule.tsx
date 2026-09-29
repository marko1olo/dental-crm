import React, { useState } from "react";
import { WEEKDAY_LABELS } from "@dental/shared";
import {
	Armchair,
	Clock,
	Info,
	Plus,
	ShieldCheck,
	Trash2,
} from "lucide-react";
import { useOnboardingStore } from "../../store/onboardingStore";

export function Step2ChairsSchedule() {
	const {
		chairs,
		addChair,
		removeChair,
		updateChair,
		schedule,
		updateSchedule,
		toggleWorkingDay,
	} = useOnboardingStore();

	const [newChairInput, setNewChairInput] = useState("");

	const handleAddChairSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (newChairInput.trim()) {
			addChair(newChairInput.trim());
			setNewChairInput("");
		} else {
			addChair();
		}
	};

	return (
		<div className="onboarding-step-body animate-fade-in">
			<div className="step-intro-header">
				<div className="step-intro-badge">
					<Armchair size={14} aria-hidden="true" />
					<span>Шаг 2 из 3: Оснащение</span>
				</div>
				<h3>Стоматологические кресла и часы работы</h3>
				<p>
					Укажите рабочие установки клиники и график смены.
					По умолчанию предзаполнены проверенные параметры: 09:00–20:00, 30 минут на визит.
				</p>
			</div>

			{/* Chairs section */}
			<div className="step-section">
				<div className="section-head-with-action">
					<label className="section-label">Стоматологические установки (кресла)</label>
					<span className="section-subtext">Всего установок: {chairs.length}</span>
				</div>

				<div className="chairs-list-container">
					{chairs.map((chair, index) => (
						<div key={chair.id} className="chair-card-row">
							<div className="chair-index-badge">{index + 1}</div>
							<div className="chair-name-field">
								<input
									type="text"
									value={chair.name}
									onChange={(e) => updateChair(chair.id, { name: e.target.value })}
									placeholder="Название кресла / кабинета"
									aria-label={`Название кресла ${index + 1}`}
								/>
							</div>
							<div className="chair-specialty-field">
								<select
									value={chair.specialty ?? "therapist"}
									onChange={(e) => updateChair(chair.id, { specialty: e.target.value })}
									aria-label={`Специализация кресла ${index + 1}`}
								>
									<option value="therapist">Терапия</option>
									<option value="surgeon">Хирургия</option>
									<option value="orthopedist">Ортопедия</option>
									<option value="orthodontist">Ортодонтия</option>
									<option value="hygienist">Гигиена</option>
									<option value="universal">Универсальный</option>
								</select>
							</div>
							{chair.isDefault ? (
								<span className="chair-default-pill">
									<ShieldCheck size={12} aria-hidden="true" />
									Основное
								</span>
							) : (
								<button
									type="button"
									className="chair-set-default-btn"
									onClick={() => {
										chairs.forEach((c) => {
											updateChair(c.id, { isDefault: c.id === chair.id });
										});
									}}
									title="Сделать основным креслом"
								>
									Сделать основным
								</button>
							)}
							<button
								type="button"
								className="chair-delete-btn"
								onClick={() => removeChair(chair.id)}
								disabled={chairs.length <= 1}
								title={chairs.length <= 1 ? "Минимум 1 кресло обязательно" : "Удалить кресло"}
								aria-label={`Удалить ${chair.name}`}
							>
								<Trash2 size={15} aria-hidden="true" />
							</button>
						</div>
					))}

					{/* Add chair form */}
					<form onSubmit={handleAddChairSubmit} className="add-chair-form">
						<input
							type="text"
							placeholder="Новое кресло (например: Кабинет 3 — Ортопедия)"
							value={newChairInput}
							onChange={(e) => setNewChairInput(e.target.value)}
							className="add-chair-input"
						/>
						<button type="submit" className="add-chair-btn">
							<Plus size={16} aria-hidden="true" />
							Добавить установку
						</button>
					</form>
				</div>
			</div>

			{/* Schedule section */}
			<div className="step-section">
				<label className="section-label">График работы клиники и длительность визита</label>
				
				<div className="schedule-config-grid">
					<div className="form-field">
						<label htmlFor="workday-start-input">
							<Clock size={14} className="inline-icon" aria-hidden="true" />
							Начало смены
						</label>
						<input
							id="workday-start-input"
							type="time"
							value={schedule.workdayStart}
							onChange={(e) => updateSchedule({ workdayStart: e.target.value })}
						/>
					</div>

					<div className="form-field">
						<label htmlFor="workday-end-input">
							<Clock size={14} className="inline-icon" aria-hidden="true" />
							Окончание смены
						</label>
						<input
							id="workday-end-input"
							type="time"
							value={schedule.workdayEnd}
							onChange={(e) => updateSchedule({ workdayEnd: e.target.value })}
						/>
					</div>

					<div className="form-field">
						<label htmlFor="visit-duration-input">Минут на стандартный визит</label>
						<select
							id="visit-duration-input"
							value={schedule.defaultVisitMinutes}
							onChange={(e) => updateSchedule({ defaultVisitMinutes: Number(e.target.value) })}
						>
							<option value={15}>15 минут (быстрый осмотр)</option>
							<option value={20}>20 минут</option>
							<option value={30}>30 минут (стандарт терапии)</option>
							<option value={45}>45 минут</option>
							<option value={60}>60 минут (1 час, сложный приём)</option>
							<option value={90}>90 минут (1.5 часа)</option>
						</select>
					</div>

					<div className="form-field">
						<label htmlFor="buffer-duration-input">Буфер между пациентами</label>
						<select
							id="buffer-duration-input"
							value={schedule.appointmentBufferMinutes ?? 5}
							onChange={(e) => updateSchedule({ appointmentBufferMinutes: Number(e.target.value) })}
						>
							<option value={0}>0 минут (без буфера)</option>
							<option value={5}>5 минут (на обработку кресла)</option>
							<option value={10}>10 минут</option>
							<option value={15}>15 минут</option>
						</select>
					</div>
				</div>

				{/* Working days toggle */}
				<div className="working-days-container">
					<span className="working-days-label">Рабочие дни недели:</span>
					<div className="weekdays-strip" role="group" aria-label="Рабочие дни недели">
						{WEEKDAY_LABELS.map((day) => {
							const isActive = schedule.workingDays.includes(day.value);
							return (
								<button
									key={day.value}
									type="button"
									className={`weekday-pill ${isActive ? "active" : ""}`}
									aria-pressed={isActive}
									onClick={() => toggleWorkingDay(day.value)}
									title={day.label}
								>
									<span className="day-name-short">{day.shortLabel}</span>
									<span className="day-status-dot" aria-hidden="true" />
								</button>
							);
						})}
					</div>
				</div>
			</div>

			<div className="step-tip-box">
				<Info size={16} className="tip-icon" aria-hidden="true" />
				<span>
					График и установки можно изменить в любой момент в «Настройках».
					Для соло-врача расписание строится строго по основному креслу без лишних переключений.
				</span>
			</div>
		</div>
	);
}
