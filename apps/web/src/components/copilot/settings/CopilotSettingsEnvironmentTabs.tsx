/**
 * @file CopilotSettingsEnvironmentTabs.tsx
 * @description Granular tri-environment settings tabs for DENTE AI Copilot:
 * Web Browser, Desktop PC Workstation, and Mobile / Chairside Tablet.
 * (Mandate 8b <= 250 lines, Mandate 8e, Mandate 8x).
 */

import React from "react";
import {
	Globe, HardDrive, Mic, Monitor, Smartphone, Vibrate, Volume2
} from "lucide-react";
import type {
	TomographyViewerApp,
	WebSpeechSensitivity,
} from "../../../store/copilotStore";

export interface CopilotWebBrowserTabProps {
	webSpeechSensitivity: WebSpeechSensitivity;
	setSpeechSensitivity: (v: WebSpeechSensitivity) => void;
	autoSaveDrafts: boolean;
	setAutoSaveDrafts: (v: boolean) => void;
	maskPhiData: boolean;
	setMaskPhiData: (v: boolean) => void;
}

export function CopilotWebBrowserTab({
	webSpeechSensitivity, setSpeechSensitivity,
	autoSaveDrafts, setAutoSaveDrafts,
	maskPhiData, setMaskPhiData,
}: CopilotWebBrowserTabProps) {
	return (
		<div className="space-y-4 text-xs" data-testid="copilot-settings-web-tab">
			<div className="p-3 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,rgba(13,148,136,0.06))] flex items-start gap-2.5">
				<Globe size={18} className="text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
				<div>
					<div className="font-bold text-[var(--ink)]">Среда «Веб-браузер»</div>
					<p className="text-[11px] text-[var(--muted)] leading-relaxed">
						Работа через защищенный API и Web Speech API в Chrome/Edge/Safari. Изоляция сессий и маскирование персональных данных.
					</p>
				</div>
			</div>

			<section className="space-y-1.5">
				<label className="font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Volume2 size={14} className="text-[var(--teal,#0d9488)]" />
					<span>Чувствительность распознавания речи Web Speech</span>
				</label>
				<select
					value={webSpeechSensitivity}
					onChange={(e) => setSpeechSensitivity(e.target.value as WebSpeechSensitivity)}
					className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs cursor-pointer focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
				>
					<option value="high">Высокая (у изголовья кресла, тихая диктовка)</option>
					<option value="normal">Стандартная (сбалансированная фильтрация шума)</option>
					<option value="low">Умеренная (подавление шума слюноотсоса и компрессора)</option>
				</select>
				<p className="text-[10px] text-[var(--muted)]">Адаптирует алгоритм порога уверенности распознавания аудиопотока браузера.</p>
			</section>

			<section className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] space-y-2">
				<label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-[var(--ink)]">
					<input
						type="checkbox"
						checked={autoSaveDrafts}
						onChange={(e) => setAutoSaveDrafts(e.target.checked)}
						className="rounded text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)]"
					/>
					<span>Автосохранение черновиков дневников SOAP на лету</span>
				</label>
				<p className="text-[10px] text-[var(--muted)] pl-5">
					Сохраняет набранный врачом текст при переключении вкладок с дебаунсом 500мс без риска потери данных.
				</p>
			</section>

			<section className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] space-y-2">
				<label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-[var(--ink)]">
					<input
						type="checkbox"
						checked={maskPhiData}
						onChange={(e) => setMaskPhiData(e.target.checked)}
						className="rounded text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)]"
					/>
					<span>Защита персональных данных пациента (Маскирование PHI)</span>
				</label>
				<p className="text-[10px] text-[var(--muted)] pl-5">
					ФИО, телефоны и идентификаторы заменяются псевдонимами перед отправкой промптов в облачные LLM шлюзы.
				</p>
			</section>
		</div>
	);
}

export interface CopilotDesktopNativeTabProps {
	localDropzonePath: string;
	setDropzonePath: (v: string) => void;
	tomographyViewerApp: TomographyViewerApp;
	setTomographyViewer: (v: TomographyViewerApp) => void;
	fiscalRegisterComPort: string;
	setComPort: (v: string) => void;
	localInferenceServerUrl: string;
	setLocalInferenceUrl: (v: string) => void;
	globalDictationHotkey: string;
	setGlobalHotkey: (v: string) => void;
}

export function CopilotDesktopNativeTab({
	localDropzonePath, setDropzonePath,
	tomographyViewerApp, setTomographyViewer,
	fiscalRegisterComPort, setComPort,
	localInferenceServerUrl, setLocalInferenceUrl,
	globalDictationHotkey, setGlobalHotkey,
}: CopilotDesktopNativeTabProps) {
	return (
		<div className="space-y-4 text-xs" data-testid="copilot-settings-desktop-tab">
			<div className="p-3 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,rgba(13,148,136,0.06))] flex items-start gap-2.5">
				<Monitor size={18} className="text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
				<div>
					<div className="font-bold text-[var(--ink)]">Среда «Десктоп ПК (Рабочая станция)»</div>
					<p className="text-[11px] text-[var(--muted)] leading-relaxed">
						Прямой доступ к локальной файловой системе, сетевым папкам томографов, кассовым COM-портам и локальному инференсу Ollama.
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

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<section className="space-y-1.5">
					<label className="font-bold text-[var(--ink)]">Сервер локальной нейросети</label>
					<input
						type="text"
						value={localInferenceServerUrl}
						onChange={(e) => setLocalInferenceUrl(e.target.value)}
						placeholder="http://localhost:11434"
						className="w-full h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono text-[11px] focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					/>
				</section>
				<section className="space-y-1.5">
					<label className="font-bold text-[var(--ink)]">Глобальный хоткей диктовки</label>
					<input
						type="text"
						value={globalDictationHotkey}
						onChange={(e) => setGlobalHotkey(e.target.value)}
						placeholder="F9 или Ctrl+Shift+D"
						className="w-full h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono text-[11px] focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					/>
				</section>
			</div>
		</div>
	);
}

export interface CopilotMobileTabletTabProps {
	gloveModeTouchTarget: boolean;
	setGloveMode: (v: boolean) => void;
	screenWakeLock: boolean;
	setWakeLock: (v: boolean) => void;
	hapticFeedbackEnabled: boolean;
	setHaptic: (v: boolean) => void;
	autoMicOnAppointmentOpen: boolean;
	setAutoMic: (v: boolean) => void;
}

export function CopilotMobileTabletTab({
	gloveModeTouchTarget, setGloveMode,
	screenWakeLock, setWakeLock,
	hapticFeedbackEnabled, setHaptic,
	autoMicOnAppointmentOpen, setAutoMic,
}: CopilotMobileTabletTabProps) {
	return (
		<div className="space-y-4 text-xs" data-testid="copilot-settings-mobile-tab">
			<div className="p-3 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,rgba(13,148,136,0.06))] flex items-start gap-2.5">
				<Smartphone size={18} className="text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
				<div>
					<div className="font-bold text-[var(--ink)]">Среда «Мобилка / Планшет у кресла»</div>
					<p className="text-[11px] text-[var(--muted)] leading-relaxed">
						Эргономика сенсорного ввода у кресла пациента: работа в перчатках, виброотклик, защита от засыпания экрана и быстрый голосовой старт.
					</p>
				</div>
			</div>

			<section className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] space-y-2">
				<label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-[var(--ink)]">
					<input
						type="checkbox"
						checked={gloveModeTouchTarget}
						onChange={(e) => setGloveMode(e.target.checked)}
						className="rounded text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)]"
					/>
					<span>Режим работы в перчатках (Touch Target &ge; 48px)</span>
				</label>
				<p className="text-[10px] text-[var(--muted)] pl-5">
					Увеличивает активные сенсорные области кнопок и формулы зубов для безошибочного тапа в медицинских перчатках.
				</p>
			</section>

			<section className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] space-y-2">
				<label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-[var(--ink)]">
					<input
						type="checkbox"
						checked={screenWakeLock}
						onChange={(e) => setWakeLock(e.target.checked)}
						className="rounded text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)]"
					/>
					<span>Удержание экрана включенным (Screen Wake Lock)</span>
				</label>
				<p className="text-[10px] text-[var(--muted)] pl-5">
					Предотвращает автоматическую блокировку и затухание экрана планшета во время врачебных манипуляций.
				</p>
			</section>

			<section className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] space-y-2">
				<label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-[var(--ink)]">
					<input
						type="checkbox"
						checked={hapticFeedbackEnabled}
						onChange={(e) => setHaptic(e.target.checked)}
						className="rounded text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)]"
					/>
					<span className="flex items-center gap-1.5">
						<Vibrate size={13} className="text-[var(--teal,#0d9488)]" />
						<span>Тактильный виброотклик при фиксации команд</span>
					</span>
				</label>
				<p className="text-[10px] text-[var(--muted)] pl-5">
					Краткая тактильная вибрация через Haptic API подтверждает успешное применение команды без отрыва взгляда от пациента.
				</p>
			</section>

			<section className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] space-y-2">
				<label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-[var(--ink)]">
					<input
						type="checkbox"
						checked={autoMicOnAppointmentOpen}
						onChange={(e) => setAutoMic(e.target.checked)}
						className="rounded text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)]"
					/>
					<span className="flex items-center gap-1.5">
						<Mic size={13} className="text-[var(--teal,#0d9488)]" />
						<span>Автоматический переход к микрофону в карте приёма</span>
					</span>
				</label>
				<p className="text-[10px] text-[var(--muted)] pl-5">
					Сразу открывает голосовое стенографирование при входе врача в активный визит пациента.
				</p>
			</section>
		</div>
	);
}
