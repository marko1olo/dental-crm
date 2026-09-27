import {
	Check,
	Clock,
	FileText,
	Palette,
	Pill,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	Syringe,
	Volume2,
	VolumeX,
} from "lucide-react";
import React, { useState } from "react";
import { showToast } from "../GlobalToast";
import {
	DURATION_PRESETS,
	FAVORITE_MEDICATION_OPTIONS,
	ODONTOGRAM_NOTATIONS,
	useDoctorPreferencesStore,
	type DefaultDentition,
} from "../../store/doctorPreferencesStore";
import { useThemeStore } from "../../store/themeStore";
import {
	AVAILABLE_QUICK_PROTOCOLS,
	THEME_OPTIONS,
} from "./doctorClinicalPreferencesConstants";
import {
	DoctorAnesthesiaDefaultsSection,
	DoctorForm043TemplatesSection,
	DoctorMaterialsCatalogSection,
	DoctorPrescriptions107Section,
	DoctorSpecialtyPresetsCard,
} from "./doctor";

interface DoctorClinicalPreferencesSectionProps {
	soundNotificationsMuted?: boolean | undefined;
	onToggleSoundMuted?: ((muted: boolean) => void) | undefined;
	onTestOnlineBookingSound?: (() => void) | undefined;
	onTestSlotEndSound?: (() => void) | undefined;
}

export function DoctorClinicalPreferencesSection({
	soundNotificationsMuted,
	onToggleSoundMuted,
	onTestOnlineBookingSound,
	onTestSlotEndSound,
}: DoctorClinicalPreferencesSectionProps) {
	const preferences = useDoctorPreferencesStore((s) => s.preferences);
	const updatePreferences = useDoctorPreferencesStore((s) => s.updatePreferences);
	const themeMode = useThemeStore((s) => s.themeMode);
	const setThemeMode = useThemeStore((s) => s.setThemeMode);

	const [clinicalSubTab, setClinicalSubTab] = useState<
		"materials" | "anesthesia" | "templates_043" | "prescriptions_107"
	>("materials");

	const handleDurationSelect = (mins: 15 | 30 | 45 | 60 | 90 | 120) => {
		updatePreferences({ defaultVisitDuration: mins });
		showToast(`Длительность визита по умолчанию: ${mins} мин`, "success");
	};

	const handleMedicationToggle = (medId: string) => {
		const current = preferences.favoriteMedicationIds || [];
		const next = current.includes(medId)
			? current.filter((id) => id !== medId)
			: [...current, medId];
		updatePreferences({ favoriteMedicationIds: next });
		const found = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === medId);
		const action = current.includes(medId) ? "удален из любимых" : "добавлен в любимые";
		showToast(`${found?.tradeName ?? medId} ${action}`, "info");
	};

	const handleProtocolToggle = (protocolId: string) => {
		const current = preferences.quickProtocolIds || [];
		const next = current.includes(protocolId)
			? current.filter((id) => id !== protocolId)
			: [...current, protocolId];
		updatePreferences({ quickProtocolIds: next });
		showToast("Список быстрых протоколов обновлен", "info");
	};

	return (
		<section className="settings-section" data-testid="doctor-clinical-preferences-section">
			<div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-[var(--line)]">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal-soft)] flex items-center justify-center text-[var(--teal-dark)]">
						<Stethoscope size={18} />
					</div>
					<div>
						<h3 className="m-0 text-base font-bold text-[var(--ink)]">
							Клинические настройки врача
						</h3>
						<p className="m-0 text-xs text-[var(--muted)]">
							Реестр 90% стоматологических материалов РФ/СНГ, пресеты 043/у, рецепты 107-1/у и сетка приёма.
						</p>
					</div>
				</div>
				<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
					<ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
					Автосохранение 0 мс
				</span>
			</div>

			<div className="space-y-6">
				{/* 0. Быстрые пресеты по специальности врача (1 клик) */}
				<DoctorSpecialtyPresetsCard />


				{/* Подвкладки клинических настроек */}
				<div className="flex items-center gap-1.5 border-b border-[var(--line)] pb-2 overflow-x-auto">
					<button
						type="button"
						onClick={() => setClinicalSubTab("materials")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
							clinicalSubTab === "materials"
								? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs"
								: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
						}`}
					>
						<Sparkles size={14} />
						<span>Материалы и протокол ЕМК</span>
					</button>
					<button
						type="button"
						onClick={() => setClinicalSubTab("anesthesia")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
							clinicalSubTab === "anesthesia"
								? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs"
								: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
						}`}
						data-testid="doctor-clinical-subtab-anesthesia"
					>
						<Syringe size={14} />
						<span>Анестезия и иглы</span>
					</button>
					<button
						type="button"
						onClick={() => setClinicalSubTab("templates_043")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
							clinicalSubTab === "templates_043"
								? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs"
								: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
						}`}
					>
						<FileText size={14} />
						<span>Шаблоны 043/у (Дневники)</span>
					</button>
					<button
						type="button"
						onClick={() => setClinicalSubTab("prescriptions_107")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
							clinicalSubTab === "prescriptions_107"
								? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs"
								: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
						}`}
					>
						<Pill size={14} />
						<span>Рецепты 107-1/у (Фармакопея)</span>
					</button>
				</div>

				{clinicalSubTab === "anesthesia" && <DoctorAnesthesiaDefaultsSection />}
				{clinicalSubTab === "templates_043" && <DoctorForm043TemplatesSection />}
				{clinicalSubTab === "prescriptions_107" && <DoctorPrescriptions107Section />}

				{clinicalSubTab === "materials" && (
					<>
						{/* 1. Длительность приёма по умолчанию */}
						<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
					<div className="flex items-center justify-between">
						<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<Clock size={15} className="text-[var(--teal)]" />
							<span>Длительность приёма по умолчанию</span>
						</label>
						<span className="text-[11px] font-medium text-[var(--muted)]">
							Подставляется в расписание и бронирование
						</span>
					</div>
					<div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
						{DURATION_PRESETS.map((mins) => {
							const isSelected = preferences.defaultVisitDuration === mins;
							return (
								<button
									key={mins}
									type="button"
									onClick={() => handleDurationSelect(mins)}
									className={`min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
										isSelected
											? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-sm scale-102"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
									}`}
								>
									<span>{mins} мин</span>
									{isSelected && <Check size={13} className="stroke-[3]" />}
								</button>
							);
						})}
					</div>
				</div>

				{/* 2. РЕЕСТР КЛИНИЧЕСКИХ МАТЕРИАЛОВ (90% рынка РФ/СНГ) и изоляция */}
				<DoctorMaterialsCatalogSection />


				{/* 4. Любимые медикаменты для рецептов (Рецептурный бланк 107-1/у) */}
				<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5">
					<div className="flex items-center justify-between">
						<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<Pill size={15} className="text-[var(--teal)]" />
							<span>Любимые медикаменты для рецептов (Бланк 107-1/у)</span>
						</label>
						<span className="text-[11px] font-medium text-[var(--muted)]">
							Быстрая выписка рецептов и назначений в 1 клик
						</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
						{FAVORITE_MEDICATION_OPTIONS.map((med) => {
							const isFavorite = (preferences.favoriteMedicationIds || []).includes(med.id);
							return (
								<button
									key={med.id}
									type="button"
									onClick={() => handleMedicationToggle(med.id)}
									className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1 min-h-[44px] ${
										isFavorite
											? "bg-[var(--paper)] border-[var(--teal)] shadow-2xs ring-1 ring-[var(--teal)]"
											: "bg-[var(--paper)] border-[var(--line)] opacity-75 hover:opacity-100 hover:border-[var(--teal)]/60"
									}`}
								>
									<div className="flex items-start justify-between gap-1 w-full">
										<span className="text-xs font-bold text-[var(--ink)] leading-snug">
											{med.tradeName}
										</span>
										{isFavorite ? (
											<span className="w-4 h-4 rounded-full bg-[var(--teal)] text-white flex items-center justify-center shrink-0">
												<Check size={10} className="stroke-[3]" />
											</span>
										) : (
											<span className="w-4 h-4 rounded-full border border-[var(--line)] shrink-0" />
										)}
									</div>
									<span className="text-[10px] text-[var(--muted)] line-clamp-1">
										{med.mnn}
									</span>
									<div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-[var(--line)]/50">
										<span className="text-[9px] font-mono font-bold text-[var(--teal)]">
											{med.dosage}
										</span>
										<span className="text-[9px] text-[var(--muted)] font-medium">
											{med.categoryLabel}
										</span>
									</div>
								</button>
							);
						})}
					</div>
				</div>

				{/* 5. Отображение зубной формулы / Одонтограмма */}
				<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3">
					<div className="flex items-center justify-between">
						<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<Sparkles size={15} className="text-[var(--teal)]" />
							<span>Зубная формула и одонтограмма</span>
						</label>
						<span className="text-[11px] font-medium text-[var(--muted)]">
							Стандарт нумерации в карте пациента
						</span>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div className="space-y-1">
							<span className="text-[11px] font-bold text-[var(--muted)] block">
								Система нумерации зубов
							</span>
							<div className="space-y-1.5">
								{ODONTOGRAM_NOTATIONS.map((n) => {
									const isSelected = preferences.odontogramNotation === n.key;
									return (
										<button
											key={n.key}
											type="button"
											onClick={() => {
												updatePreferences({ odontogramNotation: n.key });
												showToast(`Нумерация: ${n.title}`, "info");
											}}
											className={`w-full p-2 rounded-lg text-left border text-xs transition-all flex items-center justify-between min-h-[44px] sm:min-h-[32px] cursor-pointer ${
												isSelected
													? "bg-[var(--paper)] border-[var(--teal)] font-bold text-[var(--ink)] shadow-2xs"
													: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
										>
											<div className="flex items-center gap-2">
												<span>{n.title}</span>
												<span className="text-[10px] text-[var(--muted)] font-mono">
													({n.sample})
												</span>
											</div>
											{isSelected && <Check size={14} className="text-[var(--teal)] stroke-[3]" />}
										</button>
									);
								})}
							</div>
						</div>

						<div className="space-y-1">
							<span className="text-[11px] font-bold text-[var(--muted)] block">
								Тип зубного ряда по умолчанию
							</span>
							<div className="space-y-1.5">
								{[
									{ key: "adult", title: "Постоянный прикус (32 зуба, 11–48)" },
									{ key: "pediatric", title: "Молочный прикус (20 зубов, 51–85)" },
									{ key: "mixed", title: "Сменный прикус (детский / подростковый)" },
								].map((d) => {
									const isSelected = preferences.defaultDentition === d.key;
									return (
										<button
											key={d.key}
											type="button"
											onClick={() => {
												updatePreferences({ defaultDentition: d.key as DefaultDentition });
												showToast(`Прикус: ${d.title}`, "info");
											}}
											className={`w-full p-2 rounded-lg text-left border text-xs transition-all flex items-center justify-between min-h-[44px] sm:min-h-[32px] cursor-pointer ${
												isSelected
													? "bg-[var(--paper)] border-[var(--teal)] font-bold text-[var(--ink)] shadow-2xs"
													: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
										>
											<span>{d.title}</span>
											{isSelected && <Check size={14} className="text-[var(--teal)] stroke-[3]" />}
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</div>

				{/* 6. Быстрые шаблоны Формы 043/у */}
				<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
					<div className="flex items-center justify-between">
						<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<FileText size={15} className="text-[var(--teal)]" />
							<span>Быстрые шаблоны дневников Формы 043/у</span>
						</label>
						<span className="text-[11px] font-medium text-[var(--muted)]">
							Отображаются в панели 1-клик в карточке визита
						</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
						{AVAILABLE_QUICK_PROTOCOLS.map((p) => {
							const isChecked = (preferences.quickProtocolIds || []).includes(p.id);
							return (
								<button
									key={p.id}
									type="button"
									onClick={() => handleProtocolToggle(p.id)}
									className={`p-2.5 rounded-lg text-left border text-xs transition-all flex items-center justify-between min-h-[44px] sm:min-h-[36px] cursor-pointer ${
										isChecked
											? "bg-[var(--paper)] border-[var(--teal)] text-[var(--ink)] font-semibold shadow-2xs"
											: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] opacity-70 hover:opacity-100"
									}`}
								>
									<div className="flex items-center gap-2 min-w-0">
										<span
											className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
												isChecked
													? "bg-[var(--teal)] border-[var(--teal)] text-white"
													: "border-[var(--line)]"
											}`}
										>
											{isChecked && <Check size={11} className="stroke-[3]" />}
										</span>
										<span className="truncate">{p.title}</span>
									</div>
									<span className="text-[10px] font-mono font-bold text-[var(--muted)] shrink-0 ml-1">
										{p.icd}
									</span>
								</button>
							);
						})}
					</div>
				</div>
					</>
				)}

				{/* 7. Тема оформления рабочего места */}
				<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
					<div className="flex items-center justify-between">
						<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<Palette size={15} className="text-[var(--teal)]" />
							<span>Тема оформления кабинета</span>
						</label>
						<span className="text-[11px] font-medium text-[var(--muted)]">
							Мгновенное переключение без перезагрузки страницы
						</span>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
						{THEME_OPTIONS.map((theme) => {
							const isCurrent = themeMode === theme.mode;
							return (
								<button
									key={theme.mode}
									type="button"
									onClick={() => {
										setThemeMode(theme.mode);
										showToast(`Тема «${theme.title}» активирована`, "success");
									}}
									className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5 min-h-[44px] ${
										isCurrent
											? "bg-[var(--paper)] border-[var(--teal)] shadow-sm ring-2 ring-[var(--teal)] scale-102"
											: "bg-[var(--paper)] border-[var(--line)] hover:border-[var(--teal)]/60"
									}`}
								>
									<div className="flex items-center justify-between gap-1 w-full">
										<span className="text-xs font-bold text-[var(--ink)] truncate">
											{theme.title}
										</span>
										{isCurrent && (
											<span className="w-4 h-4 rounded-full bg-[var(--teal)] text-white flex items-center justify-center shrink-0">
												<Check size={10} className="stroke-[3]" />
											</span>
										)}
									</div>
									<div className="flex items-center gap-1 my-0.5">
										<div
											className="w-4 h-4 rounded-full border border-black/10 shrink-0"
											style={{ backgroundColor: theme.previewColors[0] }}
											title="Фон"
										/>
										<div
											className="w-4 h-4 rounded-full border border-black/10 shrink-0"
											style={{ backgroundColor: theme.previewColors[1] }}
											title="Карточка"
										/>
										<div
											className="w-4 h-4 rounded-full shrink-0"
											style={{ backgroundColor: theme.previewColors[2] }}
											title="Акцент"
										/>
										<span className="text-[10px] text-[var(--muted)] ml-auto font-medium">
											{theme.badge}
										</span>
									</div>
									<p className="text-[10px] text-[var(--muted)] m-0 line-clamp-1">
										{theme.desc}
									</p>
								</button>
							);
						})}
					</div>
				</div>

				{/* 8. Звуковые оповещения таймера и онлайн-записи */}
				<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							{soundNotificationsMuted ? (
								<VolumeX size={16} className="text-slate-400" />
							) : (
								<Volume2 size={16} className="text-[var(--teal)]" />
							)}
							<div>
								<span className="text-xs font-bold text-[var(--ink)] block">
									Звуковые оповещения врача
								</span>
								<span className="text-[11px] text-[var(--muted)]">
									{soundNotificationsMuted
										? "Звуки выключены"
										: "Синтез аудиосигналов Web Audio API активен"}
								</span>
							</div>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								checked={!soundNotificationsMuted}
								onChange={(e) => onToggleSoundMuted?.(!e.target.checked)}
								className="sr-only peer"
							/>
							<div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--teal)]" />
						</label>
					</div>

					<div className="flex gap-2 flex-wrap pt-1">
						<button
							type="button"
							onClick={onTestOnlineBookingSound}
							disabled={soundNotificationsMuted}
							className="secondary-button text-xs py-1.5 px-2.5 min-h-[44px] sm:min-h-[32px] inline-flex items-center gap-1.5 cursor-pointer"
						>
							<Volume2 size={13} />
							<span>Проверить: Онлайн-запись (440→660 Гц)</span>
						</button>
						<button
							type="button"
							onClick={onTestSlotEndSound}
							disabled={soundNotificationsMuted}
							className="secondary-button text-xs py-1.5 px-2.5 min-h-[44px] sm:min-h-[32px] inline-flex items-center gap-1.5 cursor-pointer"
						>
							<Volume2 size={13} />
							<span>Проверить: 5 мин до конца приёма (880→660 Гц)</span>
						</button>
					</div>
				</div>
			</div>
		</section>
	);
}
