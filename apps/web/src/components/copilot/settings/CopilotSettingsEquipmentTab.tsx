/**
 * @file CopilotSettingsEquipmentTab.tsx
 * @description Cabinet equipment & hardware integration tab:
 * Tomography dropzones, DICOM viewers, fiscal register COM ports,
 * dictation hotkeys, and hardware ergonomics (Mandate 8b <= 250 lines).
 */

import React from "react";
import { HardDrive, Monitor, Sliders, Smartphone, Vibrate } from "lucide-react";
import type { TomographyViewerApp } from "../../../store/copilotStore";

export interface CopilotSettingsEquipmentTabProps {
	localDropzonePath: string;
	setDropzonePath: (v: string) => void;
	tomographyViewerApp: TomographyViewerApp;
	setTomographyViewer: (v: TomographyViewerApp) => void;
	fiscalRegisterComPort: string;
	setComPort: (v: string) => void;
	globalDictationHotkey: string;
	setGlobalHotkey: (v: string) => void;
	gloveModeTouchTarget: boolean;
	setGloveMode: (v: boolean) => void;
	screenWakeLock: boolean;
	setWakeLock: (v: boolean) => void;
	hapticFeedbackEnabled: boolean;
	setHaptic: (v: boolean) => void;
}

export function CopilotSettingsEquipmentTab({
	localDropzonePath, setDropzonePath,
	tomographyViewerApp, setTomographyViewer,
	fiscalRegisterComPort, setComPort,
	globalDictationHotkey, setGlobalHotkey,
	gloveModeTouchTarget, setGloveMode,
	screenWakeLock, setWakeLock,
	hapticFeedbackEnabled, setHaptic,
}: CopilotSettingsEquipmentTabProps) {
	return (
		<div className="space-y-4 text-xs" data-testid="copilot-settings-equipment-tab">
			<div className="p-3 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,rgba(13,148,136,0.06))] flex items-start gap-2.5">
				<HardDrive size={18} className="text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
				<div>
					<div className="font-bold text-[var(--ink)]">Оборудование и рабочая станция кабинета</div>
					<p className="text-[11px] text-[var(--muted)] leading-relaxed">
						Интеграция с локальными томографами, визиографами, кассовыми аппаратами и аппаратными сенсорами.
					</p>
				</div>
			</div>

			<section className="space-y-1.5">
				<label className="font-bold text-[var(--ink)] flex items-center gap-1.5">
					<HardDrive size={14} className="text-[var(--teal,#0d9488)]" />
					<span>Сетевая папка визиографов и КЛКТ (ПК Dropzone)</span>
				</label>
				<input
					type="text"
					value={localDropzonePath}
					onChange={(e) => setDropzonePath(e.target.value)}
					placeholder="C:\Radiology\Export или \\server\radiology"
					className="w-full h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono text-[11px] focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
				/>
				<p className="text-[10px] text-[var(--muted)]">ИИ сканирует появление свежих DICOM/RVG снимков и связывает их с зубом пациента.</p>
			</section>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<section className="space-y-1.5">
					<label className="font-bold text-[var(--ink)]">Просмотрщик томограмм</label>
					<select
						value={tomographyViewerApp}
						onChange={(e) => setTomographyViewer(e.target.value as TomographyViewerApp)}
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs cursor-pointer focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					>
						<option value="planmeca_romexis">Planmeca Romexis 3D / ProSensor</option>
						<option value="vatech_ez3d">Vatech Ez3D Plus / EzDent-i</option>
						<option value="sirona_sidexis">Dentsply Sirona Sidexis 4</option>
						<option value="custom">Пользовательский просмотрщик</option>
					</select>
				</section>
				<section className="space-y-1.5">
					<label className="font-bold text-[var(--ink)]">COM-порт кассы и чеков</label>
					<select
						value={fiscalRegisterComPort}
						onChange={(e) => setComPort(e.target.value)}
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs cursor-pointer focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					>
						<option value="COM1">COM1 (Атол / Штрих-М)</option>
						<option value="COM2">COM2</option>
						<option value="COM3">COM3 (USB-Serial эмуляция)</option>
						<option value="COM4">COM4</option>
						<option value="COM8">COM8</option>
						<option value="None">Без прямого COM-порта</option>
					</select>
				</section>
			</div>

			<section className="space-y-1.5">
				<label className="font-bold text-[var(--ink)]">Глобальный хоткей диктовки</label>
				<input
					type="text"
					value={globalDictationHotkey}
					onChange={(e) => setGlobalHotkey(e.target.value)}
					placeholder="F9 или Ctrl+Shift+D"
					className="w-full h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono text-[11px] focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
				/>
				<p className="text-[10px] text-[var(--muted)]">Активирует стенографист из любого окна рентгенографии или томографа.</p>
			</section>

			<div className="pt-2 border-t border-[var(--line)] space-y-2">
				<div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Sliders size={14} className="text-[var(--teal,#0d9488)]" />
					<span>Сенсорная эргономика рабочего места</span>
				</div>

				<div className="space-y-2">
					<label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-[var(--ink)] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)]">
						<input
							type="checkbox"
							checked={gloveModeTouchTarget}
							onChange={(e) => setGloveMode(e.target.checked)}
							className="rounded text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)]"
						/>
						<span className="flex-1">
							<span>Режим работы в перчатках (Touch Target &ge; 48px)</span>
							<p className="text-[10px] text-[var(--muted)] font-normal mt-0.5">Увеличенные интерактивные зоны для работы в медицинских перчатках.</p>
						</span>
					</label>

					<label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-[var(--ink)] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)]">
						<input
							type="checkbox"
							checked={screenWakeLock}
							onChange={(e) => setWakeLock(e.target.checked)}
							className="rounded text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)]"
						/>
						<span className="flex-1">
							<span>Удержание экрана включенным (Screen Wake Lock)</span>
							<p className="text-[10px] text-[var(--muted)] font-normal mt-0.5">Предотвращает засыпание и блокировку экрана при активном приёме у кресла.</p>
						</span>
					</label>

					<label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-[var(--ink)] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)]">
						<input
							type="checkbox"
							checked={hapticFeedbackEnabled}
							onChange={(e) => setHaptic(e.target.checked)}
							className="rounded text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)]"
						/>
						<span className="flex-1 flex items-center gap-1.5">
							<Vibrate size={13} className="text-[var(--teal,#0d9488)]" />
							<span>Тактильный виброотклик при фиксации команд</span>
						</span>
					</label>
				</div>
			</div>
		</div>
	);
}
