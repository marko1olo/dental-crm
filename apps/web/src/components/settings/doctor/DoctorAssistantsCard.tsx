import { Camera, FileText, HeartPulse, Mic, Wand2 } from "lucide-react";
import type React from "react";
import {
	type DoctorSpecialtyKey,
	useDoctorPreferencesStore,
} from "../../../store/doctorPreferencesStore";
import { showToast } from "../../GlobalToast";
import { DelimitedTileCard } from "../DelimitedTileCard";
import { SPECIALTY_PRESET_BUTTONS } from "./doctorSettingsTypes";

export const DoctorAssistantsCard: React.FC = () => {
	const preferences = useDoctorPreferencesStore((s) => s.preferences);
	const updatePreferences = useDoctorPreferencesStore((s) => s.updatePreferences);
	const applySpecialtyPreset = useDoctorPreferencesStore((s) => s.applySpecialtyPreset);

	const handleToggleAssistant = (
		key: "autoMkb10" | "somaticWarnings" | "instantPhotoProtocol" | "voiceDictationActive",
		label: string,
	) => {
		const next = !preferences[key];
		updatePreferences({ [key]: next });
		showToast(`${label}: ${next ? "включено" : "выключено"}`, next ? "success" : "info");
	};

	return (
		<div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3.5 space-y-2.5 shadow-xs">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Wand2 size={14} className="text-[var(--teal)]" />
					<h4 className="text-xs font-bold text-[var(--ink)] m-0">
						Клинические ассистенты приёма
					</h4>
				</div>
				<div className="flex items-center gap-3">
					<span className="text-[11px] text-[var(--muted)] hidden md:inline">
						Сохраняется мгновенно без перезагрузки
					</span>
					<div className="flex items-center gap-1.5 shrink-0">
						<span className="text-[11px] font-medium text-[var(--muted)] whitespace-nowrap">
							Профиль:
						</span>
						<select
							value={preferences.specialty}
							onChange={(e) => {
								const val = e.target.value as DoctorSpecialtyKey;
								applySpecialtyPreset(val);
								const label =
									SPECIALTY_PRESET_BUTTONS.find((b) => b.key === val)?.label || val;
								showToast(`Пресет «${label}» активирован`, "success");
							}}
							className="h-7 text-xs px-2.5 py-0 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] font-medium cursor-pointer focus:outline-none focus:border-[var(--teal)] transition-colors"
							data-testid="doctor-specialty-preset-select"
						>
							{SPECIALTY_PRESET_BUTTONS.map((spec) => (
								<option key={spec.key} value={spec.key}>
									{spec.label}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				<DelimitedTileCard
					icon={FileText}
					title="МКБ-10 Автоподбор"
					description="Подстановка диагноза"
					checked={preferences.autoMkb10}
					onChange={() => handleToggleAssistant("autoMkb10", "МКБ-10 Автоподбор")}
					testId="doctor-assistant-toggle-autoMkb10"
				/>
				<DelimitedTileCard
					icon={HeartPulse}
					title="Соматические алерты"
					description="Аллергии и стоп-факторы"
					checked={preferences.somaticWarnings}
					onChange={() => handleToggleAssistant("somaticWarnings", "Соматические алерты")}
					testId="doctor-assistant-toggle-somaticWarnings"
				/>
				<DelimitedTileCard
					icon={Camera}
					title="Быстрый фотопротокол"
					description="Захват снимков SD/SMB"
					checked={preferences.instantPhotoProtocol}
					onChange={() => handleToggleAssistant("instantPhotoProtocol", "Быстрый фотопротокол")}
					testId="doctor-assistant-toggle-instantPhotoProtocol"
				/>
				<DelimitedTileCard
					icon={Mic}
					title="Голосовая диктовка"
					description="Заполнение карты голосом"
					checked={preferences.voiceDictationActive}
					onChange={() => handleToggleAssistant("voiceDictationActive", "Голосовая диктовка")}
					testId="doctor-assistant-toggle-voiceDictationActive"
				/>
			</div>
		</div>
	);
};
