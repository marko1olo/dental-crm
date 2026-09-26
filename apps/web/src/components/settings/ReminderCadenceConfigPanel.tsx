/**
 * apps/web/src/components/settings/ReminderCadenceConfigPanel.tsx
 *
 * Operational reminder cadence settings for clinic Reception & Administrators.
 * Controls 24h confirmation, 2h geolocation alert, 24h post-op checkup, and fallback routing.
 *
 * Mandates 8b, 8c, 8d, 8e: <= 800 lines, zero cartoon emojis, Lucide icons, desktop density.
 */

import React, { useState, useEffect } from "react";
import {
	BellRing,
	Check,
	CheckCheck,
	Clock,
	HeartPulse,
	HelpCircle,
	MapPin,
	MessageSquare,
	RefreshCw,
	Save,
	ShieldCheck,
	Smartphone,
	Zap,
} from "lucide-react";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { showToast } from "../GlobalToast";

export interface ReminderCadenceSettings {
	remind24hEnabled: boolean;
	remind24hWithConfirmButton: boolean;
	remind24hChannelPriority: "whatsapp_first" | "telegram_first" | "sms_first";
	remind2hEnabled: boolean;
	remind2hIncludeGeolocation: boolean;
	remind2hIncludePassportReminder: boolean;
	postOp24hEnabled: boolean;
	postOp24hCheckupSomatic: boolean;
	postOp24hEmergencyPhoneLink: boolean;
	fallbackToSmsIfUnread: boolean;
	fallbackSmsDelayMinutes: number;
}

export const DEFAULT_REMINDER_CADENCE: ReminderCadenceSettings = {
	remind24hEnabled: true,
	remind24hWithConfirmButton: true,
	remind24hChannelPriority: "whatsapp_first",
	remind2hEnabled: true,
	remind2hIncludeGeolocation: true,
	remind2hIncludePassportReminder: true,
	postOp24hEnabled: true,
	postOp24hCheckupSomatic: true,
	postOp24hEmergencyPhoneLink: true,
	fallbackToSmsIfUnread: true,
	fallbackSmsDelayMinutes: 60,
};

const STORAGE_KEY = "dente_reminder_cadence_v1";

export function loadReminderCadenceSettings(): ReminderCadenceSettings {
	const raw = safeLocalStorageGetItem(STORAGE_KEY);
	if (!raw) return DEFAULT_REMINDER_CADENCE;
	try {
		const parsed = JSON.parse(raw);
		return { ...DEFAULT_REMINDER_CADENCE, ...parsed };
	} catch {
		return DEFAULT_REMINDER_CADENCE;
	}
}

export function saveReminderCadenceSettings(settings: ReminderCadenceSettings): void {
	safeLocalStorageSetItem(STORAGE_KEY, JSON.stringify(settings));
}

export const ReminderCadenceConfigPanel: React.FC = () => {
	const [settings, setSettings] = useState<ReminderCadenceSettings>(
		loadReminderCadenceSettings,
	);
	const [isSaved, setIsSaved] = useState(false);

	const updateSetting = <K extends keyof ReminderCadenceSettings>(
		key: K,
		value: ReminderCadenceSettings[K],
	) => {
		setSettings((prev) => {
			const next = { ...prev, [key]: value };
			saveReminderCadenceSettings(next);
			return next;
		});
		setIsSaved(true);
	};

	useEffect(() => {
		if (isSaved) {
			const timer = setTimeout(() => setIsSaved(false), 2000);
			return () => clearTimeout(timer);
		}
	}, [isSaved]);

	const handleReset = () => {
		setSettings(DEFAULT_REMINDER_CADENCE);
		saveReminderCadenceSettings(DEFAULT_REMINDER_CADENCE);
		showToast("Настройки каденции сброшены на стандартные", "info");
	};

	return (
		<div className="space-y-5" data-testid="reminder-cadence-panel">
			{/* Header */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
						<BellRing size={20} />
					</div>
					<div>
						<h3 className="font-bold text-sm sm:text-base text-[var(--ink)]">
							Каденция автоматических напоминаний пациентам
						</h3>
						<p className="text-xs text-[var(--muted)]">
							Автоматическая отправка уведомлений перед визитом и контроль самочувствия после лечения
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{isSaved && (
						<span className="text-xs font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1">
							<Check size={14} /> Сохранено
						</span>
					)}
					<button
						type="button"
						onClick={handleReset}
						className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer flex items-center gap-1.5 transition-colors"
						title="Вернуть стандартные интервалы"
					>
						<RefreshCw size={13} />
						Сбросить
					</button>
				</div>
			</div>

			{/* Cadence 1: 24h Prior */}
			<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-start gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
							<Clock size={16} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h4 className="font-bold text-sm text-[var(--ink)]">
									1. Напоминание за 24 часа до приёма
								</h4>
								<span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300">
									Основное
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] mt-0.5">
								Отправляется накануне визита. Содержит дату, точное время, ФИО врача, адрес клиники и кнопку подтверждения.
							</p>
						</div>
					</div>

					<label className="relative inline-flex items-center cursor-pointer shrink-0">
						<input
							type="checkbox"
							checked={settings.remind24hEnabled}
							onChange={(e) => updateSetting("remind24hEnabled", e.target.checked)}
							className="sr-only peer"
						/>
						<div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-teal-600" />
					</label>
				</div>

				{settings.remind24hEnabled && (
					<div className="pt-2 border-t border-[var(--line)] grid grid-cols-1 sm:grid-cols-2 gap-3 pl-10 text-xs">
						<label className="flex items-center gap-2 text-[var(--ink)] cursor-pointer">
							<input
								type="checkbox"
								checked={settings.remind24hWithConfirmButton}
								onChange={(e) => updateSetting("remind24hWithConfirmButton", e.target.checked)}
								className="rounded text-teal-600 focus:ring-teal-500"
							/>
							<span>Интерактивная кнопка «Подтвердить визит»</span>
						</label>

						<div className="flex items-center gap-2 text-[var(--ink)]">
							<span className="text-[var(--muted)]">Приоритетный канал:</span>
							<select
								value={settings.remind24hChannelPriority}
								onChange={(e) =>
									updateSetting(
										"remind24hChannelPriority",
										e.target.value as ReminderCadenceSettings["remind24hChannelPriority"],
									)
								}
								className="px-2 py-1 rounded border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:outline-none"
							>
								<option value="whatsapp_first">WhatsApp → Telegram → SMS</option>
								<option value="telegram_first">Telegram → WhatsApp → SMS</option>
								<option value="sms_first">Только SMS (прямой шлюз)</option>
							</select>
						</div>

						<p className="sm:col-span-2 text-[11px] text-[var(--muted)] m-0">
							При нажатии пациентом кнопки «Подтвердить» в мессенджере статус приёма в расписании администратора мгновенно меняется на «Подтверждён» со звуковым сигналом.
						</p>
					</div>
				)}
			</div>

			{/* Cadence 2: 2h Prior with Geolocation */}
			<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-start gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
							<MapPin size={16} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h4 className="font-bold text-sm text-[var(--ink)]">
									2. Напоминание за 2 часа до приёма (навигация и выход)
								</h4>
								<span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
									Геопозиция
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] mt-0.5">
								Напоминание о необходимости выехать в клинику, ссылка на Яндекс.Карты / 2ГИС и правила входа.
							</p>
						</div>
					</div>

					<label className="relative inline-flex items-center cursor-pointer shrink-0">
						<input
							type="checkbox"
							checked={settings.remind2hEnabled}
							onChange={(e) => updateSetting("remind2hEnabled", e.target.checked)}
							className="sr-only peer"
						/>
						<div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-teal-600" />
					</label>
				</div>

				{settings.remind2hEnabled && (
					<div className="pt-2 border-t border-[var(--line)] grid grid-cols-1 sm:grid-cols-2 gap-3 pl-10 text-xs">
						<label className="flex items-center gap-2 text-[var(--ink)] cursor-pointer">
							<input
								type="checkbox"
								checked={settings.remind2hIncludeGeolocation}
								onChange={(e) => updateSetting("remind2hIncludeGeolocation", e.target.checked)}
								className="rounded text-teal-600 focus:ring-teal-500"
							/>
							<span>Включать прямую ссылку на точку на Яндекс.Картах</span>
						</label>

						<label className="flex items-center gap-2 text-[var(--ink)] cursor-pointer">
							<input
								type="checkbox"
								checked={settings.remind2hIncludePassportReminder}
								onChange={(e) => updateSetting("remind2hIncludePassportReminder", e.target.checked)}
								className="rounded text-teal-600 focus:ring-teal-500"
							/>
							<span>Напомнить взять паспорт для первичного договора</span>
						</label>
					</div>
				)}
			</div>

			{/* Cadence 3: 24h Post-Op / Wellbeing Checkup */}
			<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-start gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
							<HeartPulse size={16} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h4 className="font-bold text-sm text-[var(--ink)]">
									3. Памятка и контроль самочувствия через 24ч после операции
								</h4>
								<span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300">
									Форма 043/у
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] mt-0.5">
								Отправляется после удалений, имплантации и эндодонтии. Опрос самочувствия (болевой синдром, отёк) и памятка ухода за лункой.
							</p>
						</div>
					</div>

					<label className="relative inline-flex items-center cursor-pointer shrink-0">
						<input
							type="checkbox"
							checked={settings.postOp24hEnabled}
							onChange={(e) => updateSetting("postOp24hEnabled", e.target.checked)}
							className="sr-only peer"
						/>
						<div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-teal-600" />
					</label>
				</div>

				{settings.postOp24hEnabled && (
					<div className="pt-2 border-t border-[var(--line)] grid grid-cols-1 sm:grid-cols-2 gap-3 pl-10 text-xs">
						<label className="flex items-center gap-2 text-[var(--ink)] cursor-pointer">
							<input
								type="checkbox"
								checked={settings.postOp24hCheckupSomatic}
								onChange={(e) => updateSetting("postOp24hCheckupSomatic", e.target.checked)}
								className="rounded text-teal-600 focus:ring-teal-500"
							/>
							<span>Опрос самочувствия (при жалобе создаётся задача администратору)</span>
						</label>

						<label className="flex items-center gap-2 text-[var(--ink)] cursor-pointer">
							<input
								type="checkbox"
								checked={settings.postOp24hEmergencyPhoneLink}
								onChange={(e) => updateSetting("postOp24hEmergencyPhoneLink", e.target.checked)}
								className="rounded text-teal-600 focus:ring-teal-500"
							/>
							<span>Кнопка экстренного звонка дежурному врачу</span>
						</label>
					</div>
				)}
			</div>

			{/* Cadence 4: Fallback Delivery Rules */}
			<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3">
				<div className="flex items-center gap-2 text-xs font-bold text-[var(--ink)]">
					<Zap size={14} className="text-amber-500" />
					<span>Каскадная доставка (Waterfall Routing)</span>
				</div>
				<p className="text-xs text-[var(--muted)] m-0 leading-relaxed">
					Если сообщение в WhatsApp или Telegram не прочитано пациентом в течение{" "}
					<span className="font-semibold text-[var(--ink)]">{settings.fallbackSmsDelayMinutes} минут</span>, система автоматически отправляет краткое SMS-уведомление через резервный шлюз.
				</p>
				<div className="flex items-center gap-4 text-xs pt-1">
					<label className="flex items-center gap-2 text-[var(--ink)] cursor-pointer">
						<input
							type="checkbox"
							checked={settings.fallbackToSmsIfUnread}
							onChange={(e) => updateSetting("fallbackToSmsIfUnread", e.target.checked)}
							className="rounded text-teal-600 focus:ring-teal-500"
						/>
						<span>Включить резервную отправку по SMS</span>
					</label>

					{settings.fallbackToSmsIfUnread && (
						<div className="flex items-center gap-1.5 text-[var(--ink)]">
							<span className="text-[var(--muted)]">Таймаут:</span>
							<select
								value={settings.fallbackSmsDelayMinutes}
								onChange={(e) => updateSetting("fallbackSmsDelayMinutes", Number(e.target.value))}
								className="px-2 py-0.5 rounded border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:outline-none"
							>
								<option value={30}>30 минут</option>
								<option value={60}>60 минут (рекомендуется)</option>
								<option value={120}>2 часа</option>
							</select>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ReminderCadenceConfigPanel;
