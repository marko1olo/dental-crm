import React, { useState } from "react";
import { RotateCcw, Save, Settings } from "lucide-react";
import {
	DEFAULT_PATIENT_FIELD_REQUIREMENTS,
	loadPatientFieldRequirements,
	type PatientFieldRequirements,
	savePatientFieldRequirements,
} from "../../patients/patientFieldRequirementsConfig";
import { showToast } from "../../GlobalToast";

export function PatientFieldRequirementsSettings() {
	const [requirements, setRequirements] = useState<PatientFieldRequirements>(() => loadPatientFieldRequirements());
	const [isSaved, setIsSaved] = useState(false);

	const handleToggle = (key: keyof PatientFieldRequirements) => {
		setRequirements((prev) => ({ ...prev, [key]: !prev[key] }));
		setIsSaved(false);
	};

	const handleSave = () => {
		savePatientFieldRequirements(requirements);
		setIsSaved(true);
		showToast("Настройки обязательности полей сохранены", "success");
		setTimeout(() => setIsSaved(false), 2500);
	};

	const handleReset = () => {
		setRequirements({ ...DEFAULT_PATIENT_FIELD_REQUIREMENTS });
		savePatientFieldRequirements(DEFAULT_PATIENT_FIELD_REQUIREMENTS);
		setIsSaved(true);
		showToast("Настройки сброшены по умолчанию", "success");
		setTimeout(() => setIsSaved(false), 2500);
	};

	return (
		<div className="p-6 rounded-3xl bg-[var(--paper)] border border-[var(--line)] space-y-6" data-testid="patient-field-requirements-section">
			<div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--line)]">
				<div className="space-y-1">
					<h3 className="text-base font-bold text-[var(--ink)] m-0 flex items-center gap-2">
						<Settings size={18} className="text-[var(--teal)]" />
						Настройка обязательности полей при создании карточки пациента
					</h3>
					<p className="text-xs text-[var(--muted)] m-0">
						Укажите, какие поля регистратор или администратор ОБЯЗАН заполнить при регистрации
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button type="button" onClick={handleReset} className="secondary-button h-8 px-3 rounded-lg text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-xs" title="Сбросить к стандарту">
						<RotateCcw size={14} /><span>По умолчанию</span>
					</button>
					<button type="button" onClick={handleSave} className="primary-button h-8 px-4 rounded-lg text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs" data-testid="save-patient-field-requirements-btn">
						<Save size={14} /><span>{isSaved ? "Сохранено!" : "Сохранить"}</span>
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{[
					{ key: "requirePhone", label: "Номер телефона", badge: "ОБЯЗАТЕЛЬНО", desc: "Блокирует сохранение без ввода номера телефона для СМС и визитов." },
					{ key: "requireAdvertisingSource", label: "Рекламный источник", badge: "ОБЯЗАТЕЛЬНО", desc: "Обязывает выбрать источник (Сайт, Карты, Сарафан) для 100% точности ROMI." },
					{ key: "requireSnils", label: "СНИЛС (11 цифр)", badge: "ДЛЯ ЕГИСЗ", desc: "Обязателен для клиник, подписывающих ЭМК с УКЭП в ЕГИСЗ РЭМД." },
					{ key: "requireBirthDate", label: "Дата рождения", badge: "ОБЯЗАТЕЛЬНО", desc: "Требуется для разделения взрослой/детской одонтограммы и анестезии." },
				].map((f) => (
					<div key={f.key} className="p-4 rounded-2xl bg-[var(--paper-soft)]/50 border border-[var(--line)] flex items-start justify-between gap-3">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<span className="font-bold text-sm text-[var(--ink)]">{f.label}</span>
								{(requirements as any)[f.key] && (
									<span className="text-xs px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold">{f.badge}</span>
								)}
							</div>
							<p className="text-xs text-[var(--muted)] m-0">{f.desc}</p>
						</div>
						<label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
							<input
								type="checkbox"
								checked={(requirements as any)[f.key]}
								onChange={() => handleToggle(f.key as any)}
								className="sr-only peer"
								data-testid={`toggle-${f.key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`}
							/>
							<div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--teal)]" />
						</label>
					</div>
				))}
			</div>
		</div>
	);
}
