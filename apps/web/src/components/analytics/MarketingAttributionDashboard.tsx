/**
 * MarketingAttributionDashboard.tsx — Сквозная аналитика маркетинга, самозаписи и настроек обязательности полей (Фичи #28 и #35).
 *
 * СТРУКТУРА:
 * 1. Разделение аналитики онлайн-записей и работы администраторов (Фича #28).
 * 2. Таблица ROMI и CAC по всем рекламным каналам клиники.
 * 3. Настройка обязательности полей при создании карточки пациента (Фича #35).
 */

import React, { useState } from "react";
import {
	BarChart3,
	Bot,
	CheckCircle2,
	DollarSign,
	FileSpreadsheet,
	HelpCircle,
	Megaphone,
	RotateCcw,
	Save,
	Settings,
	ShieldCheck,
	Sparkles,
	TrendingUp,
	Users,
} from "lucide-react";
import { OnlineBookingConversionPanel } from "./OnlineBookingConversionPanel";
import { MarketingRomiTable } from "../marketing/MarketingRomiTable";
import {
	DEFAULT_PATIENT_FIELD_REQUIREMENTS,
	loadPatientFieldRequirements,
	type PatientFieldRequirements,
	savePatientFieldRequirements,
} from "../patients/patientFieldRequirementsConfig";
import { showToast } from "../GlobalToast";

export function MarketingAttributionDashboard() {
	const [activeSection, setActiveSection] = useState<"attribution" | "romi" | "field_settings">("attribution");

	// Patient field requirements state (Feature #35)
	const [requirements, setRequirements] = useState<PatientFieldRequirements>(() => {
		return loadPatientFieldRequirements();
	});
	const [isSaved, setIsSaved] = useState(false);

	const handleToggleRequirement = (key: keyof PatientFieldRequirements) => {
		setRequirements((prev) => {
			const updated = { ...prev, [key]: !prev[key] };
			return updated;
		});
		setIsSaved(false);
	};

	const handleSaveRequirements = () => {
		savePatientFieldRequirements(requirements);
		setIsSaved(true);
		showToast("Настройки обязательности полей сохранены", "success");
		setTimeout(() => setIsSaved(false), 2500);
	};

	const handleResetRequirements = () => {
		setRequirements({ ...DEFAULT_PATIENT_FIELD_REQUIREMENTS });
		savePatientFieldRequirements(DEFAULT_PATIENT_FIELD_REQUIREMENTS);
		setIsSaved(true);
		showToast("Настройки сброшены по умолчанию", "success");
		setTimeout(() => setIsSaved(false), 2500);
	};

	return (
		<div
			className="space-y-6"
			data-testid="marketing-attribution-dashboard"
		>
			{/* Dashboard Top Header */}
			<header className="flex flex-wrap items-center justify-between gap-3 p-5 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
				<div className="space-y-1">
					<div className="flex items-center gap-2.5">
						<div className="p-2.5 rounded-2xl bg-teal-500/10 text-[var(--teal)]">
							<Megaphone size={22} />
						</div>
						<div>
							<h2 className="text-lg font-black text-[var(--ink)] m-0 flex items-center gap-2">
								Сквозная аналитика маркетинга и каналов записи
								<span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/15 text-[var(--teal)] font-bold">
									Wave 16
								</span>
							</h2>
							<p className="text-xs text-[var(--muted)] m-0">
								Раздельный учет самозаписи (Фича №28), окупаемость рекламы ROMI и обязательность полей карты (Фича №35)
							</p>
						</div>
					</div>
				</div>

				{/* Primary Section Switcher */}
				<div className="inline-flex rounded-2xl bg-[var(--paper-soft)] p-1.5 border border-[var(--line)]">
					<button
						type="button"
						onClick={() => setActiveSection("attribution")}
						className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border-0 cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
							activeSection === "attribution"
								? "bg-[var(--paper)] text-[var(--ink)] shadow-sm"
								: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-online-vs-admin"
					>
						<Bot size={15} className="text-[var(--teal)]" />
						<span>Онлайн vs Администраторы (#28)</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveSection("romi")}
						className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border-0 cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
							activeSection === "romi"
								? "bg-[var(--paper)] text-[var(--ink)] shadow-sm"
								: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-romi-table"
					>
						<DollarSign size={15} className="text-emerald-500" />
						<span>ROMI и Затраты</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveSection("field_settings")}
						className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border-0 cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
							activeSection === "field_settings"
								? "bg-[var(--paper)] text-[var(--ink)] shadow-sm"
								: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-field-requirements"
					>
						<Settings size={15} className="text-indigo-500" />
						<span>Обязательность полей карты (#35)</span>
					</button>
				</div>
			</header>

			{/* Section 1: Online Booking vs Admin Telephony (Feature #28) */}
			{activeSection === "attribution" && (
				<OnlineBookingConversionPanel />
			)}

			{/* Section 2: ROMI & CAC Channel Table */}
			{activeSection === "romi" && (
				<MarketingRomiTable />
			)}

			{/* Section 3: Patient Card Field Requirements Settings (Feature #35) */}
			{activeSection === "field_settings" && (
				<div
					className="p-6 rounded-3xl bg-[var(--paper)] border border-[var(--line)] space-y-6"
					data-testid="patient-field-requirements-section"
				>
					<div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--line)]">
						<div className="space-y-1">
							<h3 className="text-base font-bold text-[var(--ink)] m-0 flex items-center gap-2">
								<Settings size={18} className="text-[var(--teal)]" />
								Настройка обязательности полей при создании карточки пациента
								<span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold">
									Фича №35
								</span>
							</h3>
							<p className="text-xs text-[var(--muted)] m-0">
								Укажите, какие поля регистратор или администратор ОБЯЗАН заполнить при первичной регистрации пациента
							</p>
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleResetRequirements}
								className="secondary-button text-xs min-h-[36px] inline-flex items-center gap-1.5 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] cursor-pointer"
								title="Сбросить к стандартным настройкам"
							>
								<RotateCcw size={14} />
								<span>По умолчанию</span>
							</button>
							<button
								type="button"
								onClick={handleSaveRequirements}
								className="primary-button text-xs min-h-[36px] inline-flex items-center gap-1.5 px-4 rounded-xl bg-[var(--teal)] text-white font-bold cursor-pointer"
								data-testid="save-patient-field-requirements-btn"
							>
								<Save size={14} />
								<span>{isSaved ? "Сохранено!" : "Сохранить настройки"}</span>
							</button>
						</div>
					</div>

					{/* Toggles Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Toggle 1: Phone */}
						<div className="p-4 rounded-2xl bg-[var(--paper-soft)]/50 border border-[var(--line)] flex items-start justify-between gap-3">
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<span className="font-bold text-sm text-[var(--ink)]">
										Номер телефона
									</span>
									{requirements.requirePhone && (
										<span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold">
											ОБЯЗАТЕЛЬНО
										</span>
									)}
								</div>
								<p className="text-xs text-[var(--muted)] m-0">
									Блокирует сохранение без ввода номера телефона. Необходим для СМС-оповещений, напоминаний о визитах и авторизации в ЛК.
								</p>
							</div>
							<label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
								<input
									type="checkbox"
									checked={requirements.requirePhone}
									onChange={() => handleToggleRequirement("requirePhone")}
									className="sr-only peer"
									data-testid="toggle-require-phone"
								/>
								<div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--teal)]" />
							</label>
						</div>

						{/* Toggle 2: Advertising Source */}
						<div className="p-4 rounded-2xl bg-[var(--paper-soft)]/50 border border-[var(--line)] flex items-start justify-between gap-3">
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<span className="font-bold text-sm text-[var(--ink)]">
										Рекламный источник (Маркетинг)
									</span>
									{requirements.requireAdvertisingSource && (
										<span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
											ОБЯЗАТЕЛЬНО
										</span>
									)}
								</div>
								<p className="text-xs text-[var(--muted)] m-0">
									Обязывает администратора выбрать источник (Сайт, Карты, 2ГИС, ПроДокторов, Сарафан). Гарантирует 100% точность ROMI и CAC.
								</p>
							</div>
							<label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
								<input
									type="checkbox"
									checked={requirements.requireAdvertisingSource}
									onChange={() => handleToggleRequirement("requireAdvertisingSource")}
									className="sr-only peer"
									data-testid="toggle-require-advertising-source"
								/>
								<div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--teal)]" />
							</label>
						</div>

						{/* Toggle 3: SNILS */}
						<div className="p-4 rounded-2xl bg-[var(--paper-soft)]/50 border border-[var(--line)] flex items-start justify-between gap-3">
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<span className="font-bold text-sm text-[var(--ink)]">
										СНИЛС (11 цифр)
									</span>
									{requirements.requireSnils && (
										<span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold">
											ОБЯЗАТЕЛЬНО ДЛЯ ЕГИСЗ
										</span>
									)}
								</div>
								<p className="text-xs text-[var(--muted)] m-0">
									Обязателен для клиник, подписывающих электронные медкарты УКЭП и отправляющих СЭМД в ЕГИСЗ Минздрава РФ.
								</p>
							</div>
							<label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
								<input
									type="checkbox"
									checked={requirements.requireSnils}
									onChange={() => handleToggleRequirement("requireSnils")}
									className="sr-only peer"
									data-testid="toggle-require-snils"
								/>
								<div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--teal)]" />
							</label>
						</div>

						{/* Toggle 4: Birth Date */}
						<div className="p-4 rounded-2xl bg-[var(--paper-soft)]/50 border border-[var(--line)] flex items-start justify-between gap-3">
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<span className="font-bold text-sm text-[var(--ink)]">
										Дата рождения
									</span>
									{requirements.requireBirthDate && (
										<span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold">
											ОБЯЗАТЕЛЬНО
										</span>
									)}
								</div>
								<p className="text-xs text-[var(--muted)] m-0">
									Требуется для точного разделения карт на взрослую и детскую одонтограмму и расчета дозировок анестетиков.
								</p>
							</div>
							<label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
								<input
									type="checkbox"
									checked={requirements.requireBirthDate}
									onChange={() => handleToggleRequirement("requireBirthDate")}
									className="sr-only peer"
									data-testid="toggle-require-birth-date"
								/>
								<div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--teal)]" />
							</label>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
