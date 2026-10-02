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

import React, { useState } from "react";
import {
	Activity,
	CheckCircle2,
	Gamepad2,
	HelpCircle,
	Laptop,
	Network,
	QrCode,
	RefreshCw,
	ShieldAlert,
	ShieldCheck,
	Smartphone,
	Sparkles,
	Wifi,
	WifiOff,
	Zap,
} from "lucide-react";
import type { ClinicalGuideProps } from "./index";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

interface MeshNode {
	id: string;
	name: string;
	role: string;
	ip: string;
	syncStatus: "synced" | "syncing" | "standby";
	lastTx: string;
}

const INITIAL_NODES: MeshNode[] = [
	{
		id: "node-reception",
		name: "ПК Регистратуры",
		role: "Ресепшен (Касса, Запись)",
		ip: "192.168.1.101",
		syncStatus: "synced",
		lastTx: "10:14:02 (Чек 54-ФЗ №148)",
	},
	{
		id: "node-surgery",
		name: "Планшет Хирургии",
		role: "У кресла (Одонтограмма, КТ)",
		ip: "192.168.1.105",
		syncStatus: "synced",
		lastTx: "10:14:15 (Зуб 2.6 Пульпит)",
	},
	{
		id: "node-doctor-laptop",
		name: "Ноутбук Главврача",
		role: "Кабинет (Планы, Аудит)",
		ip: "192.168.1.108",
		syncStatus: "synced",
		lastTx: "10:13:50 (План лечения Оптимум)",
	},
];

export const LanMeshGuide: React.FC<ClinicalGuideProps> = ({ onLaunchTour }) => {
	const [nodes] = useState<MeshNode[]>(INITIAL_NODES);
	const [isInternetOnline, setIsInternetOnline] = useState<boolean>(true);
	const [pairingMode, setPairingMode] = useState<"pin" | "qr">("pin");
	const [simulatedTxCount, setSimulatedTxCount] = useState<number>(42);

	const handleLaunchTour = () => {
		if (onLaunchTour) {
			onLaunchTour("solo_doctor");
		} else {
			startDoctorTour("solo_doctor");
		}
	};

	const handleSimulateLocalTx = () => {
		setSimulatedTxCount((c) => c + 1);
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

			{/* Interactive Visual Preview: Topology Schematics & P2P Mesh Monitor */}
			<div className="rounded-lg border border-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-2xs space-y-0">
				{/* Top Status Bar: Quiet Green LAN Beacon & WAN Toggle */}
				<div className="p-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
						<span className="font-bold text-xs text-[var(--ink)]">
							Локальная сеть клиники: P2P Mesh активен
						</span>
						<span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold">
							3 узла • 0 коллизий
						</span>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setIsInternetOnline((v) => !v)}
							className={`h-7 px-2.5 rounded border text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
								isInternetOnline
									? "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
									: "bg-amber-500/20 border-amber-500/40 text-amber-800 dark:text-amber-200"
							}`}
							title="Переключить состояние интернет-провайдера для проверки автономности"
						>
							{isInternetOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
							<span>{isInternetOnline ? "Интернет: Онлайн" : "Интернет: Отключен (Офлайн-режим)"}</span>
						</button>

						<button
							type="button"
							onClick={handleSimulateLocalTx}
							className="h-7 px-2 rounded bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer"
							title="Симулировать сохранение дневника по локальной сети"
						>
							<RefreshCw size={11} />
							<span>Записать транзакцию ({simulatedTxCount})</span>
						</button>
					</div>
				</div>

				{/* Network Topology 3-Node Interactive Diagram */}
				<div className="p-3 bg-[var(--paper)] space-y-3">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
						{nodes.map((node) => (
							<div
								key={node.id}
								className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] space-y-2 hover:border-indigo-500/50 transition-all"
							>
								<div className="flex items-center justify-between pb-1.5 border-b border-[var(--line)]">
									<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink)]">
										{node.id === "node-surgery" ? (
											<Smartphone size={14} className="text-indigo-600 dark:text-indigo-400" />
										) : node.id === "node-doctor-laptop" ? (
											<Laptop size={14} className="text-indigo-600 dark:text-indigo-400" />
										) : (
											<Network size={14} className="text-indigo-600 dark:text-indigo-400" />
										)}
										<span className="truncate">{node.name}</span>
									</div>
									<span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
										CRDT OK
									</span>
								</div>

								<div className="space-y-1 text-[11px]">
									<div className="text-[var(--muted)] text-[10px]">{node.role}</div>
									<div className="font-mono text-[10px] text-[var(--ink)] flex items-center justify-between">
										<span>IP адрес:</span>
										<span className="font-semibold text-indigo-600 dark:text-indigo-400">{node.ip}</span>
									</div>
									<div className="text-[10px] text-[var(--muted)] flex items-center justify-between pt-0.5 border-t border-[var(--line)]/50">
										<span>Посл. дельта:</span>
										<span className="truncate max-w-[130px] font-medium text-[var(--ink)]">{node.lastTx}</span>
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Survivability Banner during simulated outage */}
					{!isInternetOnline && (
						<div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-[11px] text-amber-900 dark:text-amber-200">
							<ShieldAlert size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
							<div>
								<span className="font-bold">Внешний интернет недоступен! Режим автономного Wi-Fi Mesh:</span>
								<p className="text-[10px] text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-normal">
									Все 3 рабочих места синхронизируются напрямую по протоколу UDP/TCP через локальный Wi-Fi роутер.
									Одонтограмма, касса 54-ФЗ и снимки сохраняются в локальный IndexedDB без риска потери данных.
								</p>
							</div>
						</div>
					)}
				</div>

				{/* 5-Second Pairing Simulator (PIN vs QR) */}
				<div className="p-3 bg-[var(--paper-soft)] border-t border-[var(--line)] space-y-2.5">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink)]">
							<ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
							<span>Быстрое сопряжение планшета у кресла за 5 секунд</span>
						</div>

						<div className="flex items-center rounded-md border border-[var(--line)] bg-[var(--paper)] p-0.5 text-[10px]">
							<button
								type="button"
								onClick={() => setPairingMode("pin")}
								className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
									pairingMode === "pin"
										? "bg-indigo-600 text-white shadow-2xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								6-значный PIN
							</button>
							<button
								type="button"
								onClick={() => setPairingMode("qr")}
								className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-all ${
									pairingMode === "qr"
										? "bg-indigo-600 text-white shadow-2xs"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								QR-код камеры
							</button>
						</div>
					</div>

					{pairingMode === "pin" ? (
						<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
							<div className="space-y-0.5">
								<div className="text-[11px] font-semibold text-[var(--ink)]">
									Код сопряжения для браузера планшета:
								</div>
								<div className="text-[10px] text-[var(--muted)]">
									Введите на планшете по адресу <code className="text-indigo-600 font-bold">192.168.1.101:5173</code>
								</div>
							</div>
							<div className="px-3 py-1.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 font-mono font-bold text-base text-indigo-700 dark:text-indigo-300 tracking-wider">
								482 915
							</div>
						</div>
					) : (
						<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
							<div className="space-y-0.5">
								<div className="text-[11px] font-semibold text-[var(--ink)]">
									Наведите камеру планшета на этот экран:
								</div>
								<div className="text-[10px] text-[var(--muted)]">
									Быстрый переход по защищённой ссылке <code className="text-indigo-600 font-bold">dente://pair?key=crdt-78a</code>
								</div>
							</div>
							<div className="p-2 rounded bg-white border border-[var(--line)] flex items-center justify-center shrink-0">
								<QrCode size={40} className="text-slate-900" />
							</div>
						</div>
					)}
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
