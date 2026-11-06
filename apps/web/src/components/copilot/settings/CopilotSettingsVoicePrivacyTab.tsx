/**
 * @file CopilotSettingsVoicePrivacyTab.tsx
 * @description Voice recognition & clinical privacy settings:
 * Engine selection (Gemini Live / Whisper / Web Speech), sensitivity,
 * SOAP autosave debouncing, PHI data masking, and chairside microphone (Mandate 8b <= 200 lines).
 */

import React from "react";
import { Command, Mic, Radio, Shield, Volume2 } from "lucide-react";
import type { SpeechEngine, WebSpeechSensitivity } from "../../../store/copilotStore";

export interface CopilotSettingsVoicePrivacyTabProps {
	speechEngine?: SpeechEngine;
	setSpeechEngine?: (e: SpeechEngine) => void;
	webSpeechSensitivity: WebSpeechSensitivity;
	setSpeechSensitivity: (v: WebSpeechSensitivity) => void;
	autoSaveDrafts: boolean;
	setAutoSaveDrafts: (v: boolean) => void;
	maskPhiData: boolean;
	setMaskPhiData: (v: boolean) => void;
	autoMicOnAppointmentOpen: boolean;
	setAutoMic: (v: boolean) => void;
	globalDictationHotkey?: string;
	setGlobalHotkey?: (v: string) => void;
}

export function CopilotSettingsVoicePrivacyTab({
	speechEngine = "gemini_live",
	setSpeechEngine,
	webSpeechSensitivity,
	setSpeechSensitivity,
	autoSaveDrafts,
	setAutoSaveDrafts,
	maskPhiData,
	setMaskPhiData,
	autoMicOnAppointmentOpen,
	setAutoMic,
	globalDictationHotkey = "F9",
	setGlobalHotkey,
}: CopilotSettingsVoicePrivacyTabProps) {
	return (
		<div className="space-y-4 text-xs" data-testid="copilot-settings-voice-privacy-tab">
			<div className="p-3 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,rgba(13,148,136,0.06))] flex items-start gap-2.5">
				<Mic size={18} className="text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
				<div>
					<div className="font-bold text-[var(--ink)]">Голосовое управление и безопасность данных</div>
					<p className="text-[11px] text-[var(--muted)] leading-relaxed">
						Распознавание речи у кресла пациента, локальная фильтрация шума и обезличивание медицинских данных.
					</p>
				</div>
			</div>

			{setSpeechEngine && (
				<section className="space-y-1.5">
					<label className="font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Radio size={14} className="text-[var(--teal,#0d9488)]" />
						<span>Движок распознавания речи</span>
					</label>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
						{[
							{ id: "gemini_live" as SpeechEngine, label: "Gemini Live", note: "Потоковый диалог" },
							{ id: "whisper" as SpeechEngine, label: "Whisper Cascade", note: "Медицинский словарь" },
							{ id: "web_speech" as SpeechEngine, label: "Web Speech", note: "Встроенный в браузер" },
						].map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => setSpeechEngine(item.id)}
								className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
									speechEngine === item.id
										? "border-[var(--teal,#0d9488)] bg-[var(--paper)] text-[var(--ink)] shadow-xs font-bold"
										: "border-[var(--line)] bg-[var(--paper)]/50 text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid={`copilot-speech-engine-${item.id}`}
							>
								<div className="text-[11px] font-semibold">{item.label}</div>
								<div className="text-[9px] text-[var(--muted)]">{item.note}</div>
							</button>
						))}
					</div>
				</section>
			)}

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
			</section>

			{setGlobalHotkey && (
				<section className="space-y-1.5">
					<label className="font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Command size={14} className="text-[var(--teal,#0d9488)]" />
						<span>Горячая клавиша быстрой диктовки</span>
					</label>
					<div className="flex gap-2">
						<input
							type="text"
							value={globalDictationHotkey}
							onChange={(e) => setGlobalHotkey(e.target.value)}
							placeholder="F9"
							className="w-32 h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono text-xs focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
						/>
						<span className="text-[10px] text-[var(--muted)] self-center">Нажатие {globalDictationHotkey || "F9"} мгновенно активирует микрофон</span>
					</div>
				</section>
			)}

			<section className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] space-y-2">
				<label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-[var(--ink)]">
					<input
						type="checkbox"
						checked={autoSaveDrafts}
						onChange={(e) => setAutoSaveDrafts(e.target.checked)}
						className="rounded text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)]"
					/>
					<span>Автосохранение черновиков дневников SOAP</span>
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
					<span className="flex items-center gap-1.5">
						<Shield size={13} className="text-[var(--teal,#0d9488)]" />
						<span>Защита персональных данных пациента (Маскирование PHI)</span>
					</span>
				</label>
				<p className="text-[10px] text-[var(--muted)] pl-5">
					ФИО, телефоны и идентификаторы заменяются псевдонимами перед отправкой промптов в облачные LLM шлюзы.
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
					Сразу активирует голосовое стенографирование при переходе врача в активный визит.
				</p>
			</section>
		</div>
	);
}
