/**
 * DENTE CRM — LAN Zero-Conf Mesh Quick Guide
 *
 * 1-Page Technical & Clinical Cheat Sheet:
 * - How to pair secondary doctor/assistant tablets via 6-digit PIN.
 * - Pairing via QR Code scanning on mobile/tablet (dente://pair).
 * - Zero router / firewall setup: UDP 4101 broadcast & TCP 4100-4105.
 * - Offline Local Wi-Fi Mesh Survivability (zero dependency on external internet).
 * - Split-Brain Auto-Healing & CRDT Reconciliation.
 */

import React from "react";
import { Laptop, Network, QrCode, ShieldAlert, Smartphone, Wifi, WifiOff, Zap } from "lucide-react";

export const LanMeshGuide: React.FC = () => {
	return (
		<div className="space-y-4 text-xs text-[var(--ink)]">
			{/* Header summary banner */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-start gap-2.5">
				<div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-500 shrink-0">
					<Network size={16} />
				</div>
				<div>
					<div className="font-semibold text-sm text-[var(--ink)]">
						LAN Mesh: Бесшовное подключение планшетов и автономность без интернета
					</div>
					<div className="text-[var(--muted)] text-[11px] mt-0.5">
						Подключение iPad / Android-планшетов ассистента за 5 секунд по 6-значному PIN-коду
						или QR, полная работа при обрыве интернета провайдера.
					</div>
				</div>
			</div>

			{/* 2 Ways to Pair Secondary Tablets */}
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
							2. Посмотрите активный 6-значный PIN (например, <code className="font-bold text-indigo-500">482 915</code>).<br />
							3. Введите эти 6 цифр на планшете в браузере или приложении. Сопряжение мгновенно.
						</p>
						<div className="text-[10px] text-[var(--muted)] bg-[var(--paper-soft)] p-1.5 rounded">
							PIN автоматически обновляется каждые 15 минут с окном допуска ввода 60 секунд.
						</div>
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
							1. Наведите камеру iPad или Android-планшета на экран ПК врача.<br />
							2. Нажмите на всплывающее уведомление <code>dente://pair</code>.<br />
							3. Планшет подключен и сразу открывает текущего пациента в кресле.
						</p>
						<div className="text-[10px] text-[var(--muted)] bg-[var(--paper-soft)] p-1.5 rounded">
							Криптографическая подпись HMAC-SHA256 защищает сеть от несанкционированного доступа.
						</div>
					</div>
				</div>
			</div>

			{/* Offline Survivability & Mesh Sync */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<WifiOff size={14} className="text-amber-500" />
					<span>Автономность при обрыве интернета в клинике</span>
				</div>
				<p className="text-[11px] text-[var(--muted)] leading-relaxed">
					Если экскаватор перерезал оптику или у провайдера авария — <strong>приём пациентов НЕ останавливается!</strong>
					Компьютеры и планшеты клиники общаются напрямую по локальной сети Wi-Fi через UDP-маяки (порт 4101)
					и локальные сокеты (порты 4100–4105).
				</p>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
					<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]/50">
						<span className="font-semibold text-[var(--ink)] block">Соматический статус</span>
						<span className="text-[var(--muted)]">Аллергии и противопоказания никогда не теряются (Union Merge).</span>
					</div>
					<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]/50">
						<span className="font-semibold text-[var(--ink)] block">Зубная формула</span>
						<span className="text-[var(--muted)]">Слияние правок поверхностей по векторным часам (LWW).</span>
					</div>
					<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]/50">
						<span className="font-semibold text-[var(--ink)] block">Дневник приема</span>
						<span className="text-[var(--muted)]">Хронологическое объединение записей врача и ассистента.</span>
					</div>
				</div>
			</div>

			{/* Router & Firewall Specs */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)]">
					Сетевые параметры (для системного инженера клиники):
				</div>
				<ul className="text-[11px] text-[var(--muted)] space-y-1 list-disc list-inside">
					<li><strong>UDP 4101:</strong> Маяки обнаружения (Zero-Conf Discovery) и Heartbeat аренды Master.</li>
					<li><strong>TCP 4100–4105:</strong> Синхронизация мутаций и передача снимков между ПК.</li>
					<li><strong>Изоляция сетей:</strong> Поддерживаются многосетевые компьютеры (Ethernet + Wi-Fi) с авто-исключением виртуальных адаптеров (Docker, WSL, Hyper-V, VPN).</li>
				</ul>
			</div>
		</div>
	);
};
