import React from "react";
import {
	CLINICAL_BOT_PRESETS,
	type BotPreset,
	type BotTone,
} from "../telegramBotPresets";
import type { BotTemplatesStepProps } from "./types";

export function BotTemplatesStep({
	presetId,
	onSelectPreset,
	clinicName,
	onClinicNameChange,
	clinicPhone,
	onClinicPhoneChange,
	clinicAddress,
	onClinicAddressChange,
	selectedTone,
	onSelectTone,
	welcomeText,
	onWelcomeTextChange,
	onResetWelcomeText,
	primaryActionLabel,
	onPrimaryActionLabelChange,
	clinicNameId,
	clinicPhoneId,
	clinicAddressId,
	welcomeTextId,
	primaryActionId,
}: BotTemplatesStepProps) {
	return (
		<div className="bot-wizard-step-pane">
			<div className="bot-pane-header">
				<span className="bot-step-chip">Шаг 2 из 4</span>
				<h3 className="bot-pane-title">Профиль и брендинг клиники в боте</h3>
				<p className="bot-pane-subtitle">
					Укажите данные вашей стоматологии и выберите стиль общения с пациентами:
				</p>
			</div>

			{/* 1-Click Clinical Concept Selector */}
			<div className="bot-presets-selector-bar">
				<span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
					Готовые клинические концепции:
				</span>
				<div className="bot-preset-chips-row">
					{Object.values(CLINICAL_BOT_PRESETS).map((p) => {
						const isSelected = p.id === presetId;
						return (
							<button
								key={p.id}
								type="button"
								onClick={() => onSelectPreset(p.id)}
								className={`bot-preset-chip ${isSelected ? "active" : ""}`}
							>
								<span>{p.icon}</span>
								<span>{p.name}</span>
							</button>
						);
					})}
				</div>
			</div>

			<div className="bot-form-grid">
				<div className="bot-form-group">
					<label htmlFor={clinicNameId} className="bot-field-label">
						Название клиники / бота в шапке
					</label>
					<input
						id={clinicNameId}
						type="text"
						value={clinicName}
						onChange={(e) => onClinicNameChange(e.target.value)}
						className="bot-input"
						placeholder="Стоматология DENTE"
					/>
				</div>

				<div className="bot-form-group">
					<label htmlFor={clinicPhoneId} className="bot-field-label">
						Телефон дежурного врача / ресепшена
					</label>
					<input
						id={clinicPhoneId}
						type="tel"
						value={clinicPhone}
						onChange={(e) => onClinicPhoneChange(e.target.value)}
						className="bot-input"
						placeholder="+7 (999) 000-00-00"
					/>
				</div>
			</div>

			<div className="bot-form-group">
				<label htmlFor={clinicAddressId} className="bot-field-label">
					Адрес клиники для навигации пациентов
				</label>
				<input
					id={clinicAddressId}
					type="text"
					value={clinicAddress}
					onChange={(e) => onClinicAddressChange(e.target.value)}
					className="bot-input"
					placeholder="Кутузовский проспект, 24"
				/>
			</div>

			{/* Tone of voice quick radio */}
			<div className="bot-form-group">
				<span className="bot-field-label">Тон общения виртуального ассистента:</span>
				<div className="bot-tone-radio-row">
					{[
						{ id: "premium" as BotTone, label: "Премиум & Престиж", hint: "Забота, персональный координатор" },
						{ id: "caring" as BotTone, label: "Семейный и тёплый", hint: "Адаптационный прием, без боли" },
						{ id: "concise" as BotTone, label: "Лаконичный медицинский", hint: "Четкие факты, доказательный подход" },
					].map((toneItem) => (
						<label
							key={toneItem.id}
							className={`bot-tone-choice-card ${selectedTone === toneItem.id ? "selected" : ""}`}
						>
							<input
								type="radio"
								name="tone_wizard_choice"
								checked={selectedTone === toneItem.id}
								onChange={() => onSelectTone(toneItem.id)}
								className="sr-only"
							/>
							<div>
								<strong className="block text-xs font-semibold">{toneItem.label}</strong>
								<span className="text-[11px] text-slate-500 dark:text-slate-400">{toneItem.hint}</span>
							</div>
						</label>
					))}
				</div>
			</div>

			{/* Welcome Message Textarea */}
			<div className="bot-form-group">
				<div className="flex items-center justify-between mb-1">
					<label htmlFor={welcomeTextId} className="bot-field-label mb-0">
						Приветственное сообщение (/start)
					</label>
					<button
						type="button"
						onClick={onResetWelcomeText}
						className="text-xs text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
					>
						Сбросить на эталон
					</button>
				</div>
				<textarea
					id={welcomeTextId}
					rows={4}
					value={welcomeText}
					onChange={(e) => onWelcomeTextChange(e.target.value)}
					className="bot-textarea"
				/>
			</div>

			<div className="bot-form-group">
				<label htmlFor={primaryActionId} className="bot-field-label">
					Текст главной кнопки (CTA) на экране приветствия
				</label>
				<input
					id={primaryActionId}
					type="text"
					value={primaryActionLabel}
					onChange={(e) => onPrimaryActionLabelChange(e.target.value)}
					className="bot-input"
				/>
			</div>
		</div>
	);
}
