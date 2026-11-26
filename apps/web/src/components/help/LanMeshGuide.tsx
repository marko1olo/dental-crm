/**
 * DENTE CRM — LAN Zero-Conf Mesh Live Status & Guide
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8e, 8n, 8x, 8am
 * Shows real connected LAN mesh peers & rotating 6-digit PIN from Fastify API,
 * honest empty state when no peers are connected, and launches the LAN Pairing Wizard.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
	Gamepad2,
	HelpCircle,
	Laptop,
	Network,
	QrCode,
	RefreshCw,
	Server,
	ShieldCheck,
	Smartphone,
	Wifi,
	WifiOff,
	Zap,
} from "lucide-react";
import type { ClinicalGuideProps } from "./index";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";
import { getClinicAuthHeaders } from "../network/lanQrModal/lanConnectionHelpers";

interface LiveMeshPeer {
	readonly nodeId: string;
	readonly role: string;
	readonly ip: string;
	readonly port: number;
	readonly status: string;
	readonly appVersion?: string;
}

interface LiveAutoJoinStatus {
	readonly primaryIp: string;
	readonly apiPort: number;
	readonly webPort: number;
	readonly currentPin: string;
	readonly remainingSeconds: number;
}

export const LanMeshGuide: React.FC<ClinicalGuideProps> = ({ onLaunchTour }) => {
	const [peers, setPeers] = useState<LiveMeshPeer[]>([]);
	const [autoJoin, setAutoJoin] = useState<LiveAutoJoinStatus | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== "undefined" ? navigator.onLine : true));

	const fetchLiveMesh = useCallback(async () => {
		setIsLoading(true);
		setLoadError(null);
		try {
			const headers = getClinicAuthHeaders();
			const [meshRes, joinRes] = await Promise.all([
				fetch("/api/network/lan-mesh/status", { headers, cache: "no-store" }),
				fetch("/api/network/mesh/auto-join/status", { headers, cache: "no-store" }),
			]);
			if (meshRes.ok) {
				const rawMesh = (await meshRes.json()) as { data?: { ok?: boolean; peers?: LiveMeshPeer[] }; ok?: boolean; peers?: LiveMeshPeer[] };
				const meshData = rawMesh?.data ?? rawMesh;
				setPeers(Array.isArray(meshData.peers) ? meshData.peers : []);
			} else if (meshRes.status === 401) {
				setPeers([]);
			}
			if (joinRes.ok) {
				const rawJoin = (await joinRes.json()) as { data?: { ok?: boolean; status?: LiveAutoJoinStatus }; ok?: boolean; status?: LiveAutoJoinStatus };
				const joinData = rawJoin?.data ?? rawJoin;
				if (joinData.ok && joinData.status) {
					setAutoJoin(joinData.status);
				}
			}
			if (!meshRes.ok && !joinRes.ok && meshRes.status !== 401) {
				setLoadError(`Статус сети недоступен (${meshRes.status})`);
			}
		} catch {
			setLoadError("Нет ответа от локального сервера клиники");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchLiveMesh();
		if (typeof window === "undefined") return;
		const onOnline = () => {
			setIsOnline(true);
			void fetchLiveMesh();
		};
		const onOffline = () => setIsOnline(false);
		window.addEventListener("online", onOnline);
		window.addEventListener("offline", onOffline);
		return () => {
			window.removeEventListener("online", onOnline);
			window.removeEventListener("offline", onOffline);
		};
	}, [fetchLiveMesh]);

	const handleOpenWizard = () => {
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente:open-lan-qr"));
		}
	};

	const handleLaunchTour = () => {
		if (onLaunchTour) {
			onLaunchTour("solo_doctor");
		} else {
			startDoctorTour("solo_doctor");
		}
	};

	return (
		<div className="space-y-4 text-xs text-[var(--ink)]">
			{/* Header summary banner */}
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-start justify-between gap-3">
				<div className="flex items-start gap-2.5 flex-1 min-w-[220px]">
					<div className="p-2 rounded-lg bg-[var(--primary-soft,rgba(13,148,136,0.12))] text-[var(--primary)] shrink-0">
						<Network className="w-4 h-4" />
					</div>
					<div className="min-w-0">
						<div className="font-semibold text-sm text-[var(--ink)] flex flex-wrap items-center gap-2">
							<span>Локальная сеть клиники (LAN Mesh)</span>
							<span className="h-6 px-2 text-xs font-medium rounded-full inline-flex items-center gap-1 bg-[var(--success-soft,rgba(16,185,129,0.12))] text-[var(--primary)]">
								{isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
								<span>{isOnline ? "Сеть активна" : "Автономный офлайн-режим"}</span>
							</span>
						</div>
						<p className="text-[var(--ink-muted,var(--muted))] text-xs mt-1 leading-relaxed">
							Прямое подключение планшетов врачей, ассистентов и регистратуры по локальному Wi-Fi в офлайн-режиме без зависимости от интернета.
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={handleOpenWizard}
					className="h-9 min-h-[44px] sm:min-h-[36px] px-3.5 rounded-lg text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
				>
					<QrCode className="w-4 h-4 shrink-0" />
					<span>Мастер подключения</span>
				</button>
			</div>

			{/* Live Mesh Topology */}
			<div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden">
				<div className="px-3.5 py-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<span className={`w-2 h-2 rounded-full shrink-0 ${peers.length > 0 ? "bg-emerald-500" : "bg-[var(--ink-muted,var(--muted))]"}`} />
						<span className="font-semibold text-xs text-[var(--ink)]">
							Подключенные устройства клиники ({peers.length})
						</span>
					</div>
					<button
						type="button"
						onClick={() => void fetchLiveMesh()}
						className="h-8 px-2.5 rounded-md text-xs font-medium bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] inline-flex items-center gap-1.5 cursor-pointer"
					>
						<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
						<span>Обновить</span>
					</button>
				</div>

				<div className="p-3.5">
					{loadError ? (
						<div className="py-8 flex flex-col items-center text-center gap-2 text-[var(--ink-muted,var(--muted))]">
							<WifiOff className="w-8 h-8 opacity-60" />
							<p className="text-sm font-medium text-[var(--ink)]">{loadError}</p>
							<p className="text-xs">Проверьте локальный сервер клиники (порт 4100) или откройте мастер подключения.</p>
						</div>
					) : peers.length === 0 ? (
						<div className="py-8 flex flex-col items-center text-center gap-2.5" data-testid="lan-mesh-empty-state">
							<Server className="w-10 h-10 text-[var(--ink-muted,var(--muted))] opacity-60" />
							<div className="space-y-1">
								<p className="text-sm font-medium text-[var(--ink)]">Устройства не подключены</p>
								<p className="text-xs text-[var(--ink-muted,var(--muted))] max-w-md">
									Сейчас активен только этот компьютер. Нажмите «Мастер подключения», чтобы показать QR-код или 6-значный PIN для планшета.
								</p>
							</div>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
							{peers.map((peer) => (
								<div
									key={peer.nodeId}
									className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] space-y-1.5"
								>
									<div className="flex items-center justify-between pb-1.5 border-b border-[var(--line)]">
										<div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--ink)] truncate">
											{peer.role === "assistant" ? (
												<Smartphone className="w-4 h-4 text-[var(--primary)] shrink-0" />
											) : (
												<Laptop className="w-4 h-4 text-[var(--primary)] shrink-0" />
											)}
											<span className="truncate">{peer.nodeId}</span>
										</div>
										<span className="h-5 px-2 text-[11px] font-medium rounded-full inline-flex items-center bg-[var(--success-soft,rgba(16,185,129,0.12))] text-[var(--primary)]">
											{peer.status}
										</span>
									</div>
									<div className="font-mono tabular-nums text-[11px] text-[var(--ink-muted,var(--muted))] flex items-center justify-between">
										<span>Адрес:</span>
										<span className="text-[var(--ink)] font-medium">{peer.ip}:{peer.port}</span>
									</div>
									<div className="text-[11px] text-[var(--ink-muted,var(--muted))] flex items-center justify-between">
										<span>Роль:</span>
										<span className="text-[var(--ink)]">{peer.role}</span>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{autoJoin && (
					<div className="px-3.5 py-2.5 bg-[var(--paper-soft)] border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
						<div className="space-y-0.5">
							<div className="text-xs font-medium text-[var(--ink)] flex items-center gap-1.5">
								<ShieldCheck className="w-4 h-4 text-[var(--primary)]" />
								<span>Текущий код быстрого сопряжения клиники</span>
							</div>
							<div className="text-[11px] text-[var(--ink-muted,var(--muted))] font-mono">
								Адрес: {autoJoin.primaryIp}:{autoJoin.webPort}
							</div>
						</div>
						<div className="px-3 py-1 rounded-lg bg-[var(--paper)] border border-[var(--line)] font-mono font-semibold text-base text-[var(--primary)] tracking-widest tabular-nums">
							{autoJoin.currentPin}
						</div>
					</div>
				)}
			</div>

			{/* Help FAQ */}
			<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<HelpCircle className="w-4 h-4 text-[var(--primary)]" />
					<span>Подключение без интернета и системного администратора</span>
				</div>
				<ul className="text-[11px] text-[var(--ink-muted,var(--muted))] space-y-1.5">
					<li>• Планшеты и ноутбуки в одной Wi-Fi сети находят сервер клиники автоматически через mDNS и сканер подсети.</li>
					<li>• Если роутер блокирует передачу между клиентами (AP Isolation), включите встроенный Hotspot Windows 11 или введите IP сервера вручную.</li>
				</ul>
			</div>

			{/* Training CTA */}
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="space-y-0.5">
					<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
						<Gamepad2 className="w-4 h-4 text-[var(--primary)]" />
						<span>Обзор рабочего места врача</span>
					</div>
					<p className="text-[11px] text-[var(--ink-muted,var(--muted))]">
						Короткое интерактивное знакомство с приёмом у кресла и автономным режимом.
					</p>
				</div>
				<button
					type="button"
					onClick={handleLaunchTour}
					className="h-9 min-h-[44px] sm:min-h-[36px] px-3.5 rounded-lg bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] font-medium text-sm inline-flex items-center gap-1.5 cursor-pointer shrink-0"
				>
					<Zap className="w-4 h-4 text-[var(--primary)]" />
					<span>Запустить обзор</span>
				</button>
			</div>
		</div>
	);
};
