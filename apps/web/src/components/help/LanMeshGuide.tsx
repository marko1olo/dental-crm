/**
 * DENTE CRM — LAN Zero-Conf Mesh Quick Guide
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8e, 8n, 8x
 *
 * 1-Page Technical & Clinical Cheat Sheet:
 * - How to pair secondary doctor/assistant tablets via 6-digit PIN
 * - Pairing via QR Code scanning on mobile/tablet (dente://pair)
 * - Zero router / firewall setup: UDP 4101 broadcast & TCP 4100-4105
 * - Offline Local Wi-Fi Mesh Survivability (zero dependency on external internet)
 * - Split-Brain Auto-Healing & CRDT Reconciliation
 * - Hotkeys, FAQs, and interactive tour button
 */

import React from "react";
import {
	Gamepad2,
	HelpCircle,
	Laptop,
	Network,
	QrCode,
	ShieldAlert,
	Smartphone,
	Sparkles,
	Wifi,
	WifiOff,
	Zap,
} from "lucide-react";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

export const LanMeshGuide: React.FC = () => {
	const handleLaunchTour = () => {
		startDoctorTour("solo_doctor");
	};

	return (
		<div className="space-y-4 text-xs text-[var(--ink)]">
			{/* Header summary banner */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-start gap-2.5">
				<div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
					<Network size={18} />
				</div>
				<div className="flex-1 min-w-0">
					<div className="font-semibold text-sm text-[var(--ink)] flex items-center justify-between gap-2">
						<span>LAN Mesh: Локальная сеть и планшеты</span>
						<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
							Офлайн-автономия
						</span>
					</div>
					<div className="text-[var(--muted)] text-[11px] mt-1 leading-relaxed">
						Беспроводное сопряжение планшетов iPad и Android у кресла по 6-значному PIN или QR-коду за 5 секунд.
						Гарантирует 100% работу клиники при отключении интернета у провайдера.
					</div>
				</div>
			</div>

			{/* 1. Зачем нужен этот раздел */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<Sparkles size={14} className="text-indigo-500" />
					<span>Зачем нужен этот раздел</span>
				</div>
				<p className="text-[var(--muted)] text-[11px] leading-relaxed">
					Раздел защищает клинику от аварий интернет-провайдера и соединяет рабочие места без проводов.
					Врач и ассистент одновременно видят одонтограмму и снимки на планшете, а данные синхронизируются по локальному Wi-Fi без задержек.
				</p>
			</div>

			{/* 2. Пошаговая инструкция */}
			<div className="space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)]">
					Два способа сопряжения кресельного планшета (без системного администратора):
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
							<span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[11px] font-bold">
								A
							</span>
							<Smartphone size={14} className="text-indigo-500" />
							<span>Быстрый 6-значный PIN-код</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							1. На главном ПК врача откройте статус сети в правом верхнем углу.<br />
							2. Посмотрите активный PIN (например, <code className="font-bold text-indigo-500">482 915</code>).<br />
							3. Введите эти 6 цифр на планшете в браузере или приложении. Сопряжение мгновенно.
						</p>
					</div>

					<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
							<span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[11px] font-bold">
								B
							</span>
							<QrCode size={14} className="text-indigo-500" />
							<span>Сканирование QR-кода камерой</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							1. Наведите камеру iPad или планшета на экран ПК врача.<br />
							2. Нажмите на уведомление <code>dente://pair</code>.<br />
							3. Планшет подключен и сразу открывает текущего пациента в кресле.
						</p>
					</div>
				</div>
			</div>

			{/* Автономность без интернета */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<WifiOff size={14} className="text-amber-500" />
					<span>Автономность при обрыве интернета в клинике</span>
				</div>
				<p className="text-[11px] text-[var(--muted)] leading-relaxed">
					Если экскаватор перерезал кабель или у провайдера сбой — <strong>приём пациентов НЕ останавливается!</strong>
					Компьютеры и планшеты клиники общаются напрямую по локальной сети Wi-Fi через защищенный протокол DENTE Mesh.
				</p>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
					<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]/50">
						<span className="font-semibold text-[var(--ink)] block">Соматический статус</span>
						<span className="text-[var(--muted)]">Аллергии и противопоказания никогда не теряются.</span>
					</div>
					<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]/50">
						<span className="font-semibold text-[var(--ink)] block">Зубная формула</span>
						<span className="text-[var(--muted)]">Автоматическое слияние правок поверхностей.</span>
					</div>
					<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]/50">
						<span className="font-semibold text-[var(--ink)] block">Дневник приема</span>
						<span className="text-[var(--muted)]">Хронологическое объединение записей врача.</span>
					</div>
				</div>
			</div>

			{/* 3. Горячие клавиши */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Горячие клавиши (Hotkeys)</span>
					<span className="text-[10px] text-[var(--muted)]">Сеть и статус</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Показать PIN и статус сети:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-indigo-600 dark:text-indigo-400">
							Ctrl + Alt + N
						</kbd>
					</div>
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Повторная синхронизация:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-indigo-600 dark:text-indigo-400">
							F5
						</kbd>
					</div>
				</div>
			</div>

			{/* 4. Частые вопросы и ошибки */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<HelpCircle size={14} className="text-amber-500" />
					<span>Частые вопросы и как избежать затыков</span>
				</div>
				<ul className="text-[11px] text-[var(--muted)] space-y-1.5">
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Нужен ли интернет для сопряжения?</strong>
						<span>Нет! Достаточно обычного Wi-Fi роутера клиники. Планшеты и компьютеры находят друг друга автоматически без выхода во внешнюю сеть.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Защищена ли локальная сеть?</strong>
						<span>Да, весь трафик между устройствами шифруется по стандарту HMAC-SHA256, сторонние устройства в клинике не получат доступ к картам.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Что если сменился IP-адрес компьютера?</strong>
						<span>Система работает по технологии Zero-Conf и мгновенно переподключается без ручной перенастройки адресов.</span>
					</li>
				</ul>
			</div>

			{/* 5. Интерактивная кнопка обучения */}
			<div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="space-y-0.5">
					<div className="font-semibold text-xs text-indigo-800 dark:text-indigo-200 flex items-center gap-1.5">
						<Gamepad2 size={16} className="text-indigo-600 dark:text-indigo-400" />
						<span>Интерактивный тренажёр: LAN Mesh и сопряжение</span>
					</div>
					<p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
						Узнайте, как подключить планшет ассистента за 5 секунд без системного администратора.
					</p>
				</div>
				<button
					type="button"
					onClick={handleLaunchTour}
					className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
				>
					<Zap size={14} />
					<span>Запустить обучение</span>
				</button>
			</div>
		</div>
	);
};
