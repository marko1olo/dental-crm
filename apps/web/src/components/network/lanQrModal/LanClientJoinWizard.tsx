import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw, Search, Server, ShieldCheck } from "lucide-react";
import type { DeviceRole } from "../lanQrEngine";
import { type DiscoveredServerOption, discoverLanServerOptions, submitAutoJoinPin } from "./lanConnectionHelpers";

export interface LanClientJoinWizardProps {
	readonly initialOrigin?: string | undefined;
	readonly initialRole?: DeviceRole | undefined;
	readonly onConnected?: (() => void) | undefined;
	readonly onOpenDiagnostics?: (() => void) | undefined;
}

export const LanClientJoinWizard: React.FC<LanClientJoinWizardProps> = ({
	initialOrigin,
	initialRole = "doctor",
	onConnected,
	onOpenDiagnostics,
}) => {
	const defaultOrigin = initialOrigin || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:4100` : "http://127.0.0.1:4100");
	const [servers, setServers] = useState<DiscoveredServerOption[]>([]);
	const [serverAddress, setServerAddress] = useState(defaultOrigin);
	const [pin, setPin] = useState("");
	const [role, setRole] = useState<DeviceRole>(initialRole);
	const [scanning, setScanning] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);

	const scanServers = useCallback(async () => {
		setScanning(true);
		const found = await discoverLanServerOptions();
		setServers(found);
		if (found[0]) setServerAddress(found[0].origin);
		setScanning(false);
	}, []);

	useEffect(() => { void scanServers(); }, [scanServers]);

	const handleJoin = async () => {
		const cleanPin = pin.replace(/\D/g, "");
		if (cleanPin.length !== 6) {
			setErrorMsg("Введите 6-значный PIN с экрана главного ПК клиники.");
			return;
		}
		setSubmitting(true);
		setErrorMsg(null);
		const res = await submitAutoJoinPin(serverAddress, cleanPin, role);
		setSubmitting(false);
		if (!res.ok) {
			setErrorMsg(res.message || "Ошибка сопряжения с сервером клиники.");
			return;
		}
		setSuccessMsg("Устройство подключено к серверу клиники");
		setTimeout(() => onConnected?.(), 600);
	};

	return (
		<div className="space-y-3.5" data-testid="lan-client-join-wizard">
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs font-medium text-[var(--ink)] inline-flex items-center gap-1.5"><Server className="w-4 h-4 text-[var(--primary)]" />Серверы в локальной сети</span>
					<button type="button" onClick={() => void scanServers()} className="h-8 px-2.5 rounded-md text-xs font-medium bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] inline-flex items-center gap-1.5 cursor-pointer">
						<Search className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} /><span>{scanning ? "Поиск..." : "Найти серверы"}</span>
					</button>
				</div>
				{servers.length > 0 ? (
					<div className="flex flex-wrap gap-1.5">{servers.map((s) => (
						<button key={s.origin} type="button" onClick={() => setServerAddress(s.origin)} className={`min-h-[44px] sm:min-h-[36px] px-3 rounded-lg text-xs border transition-colors cursor-pointer ${serverAddress === s.origin ? "bg-[var(--paper)] border-[var(--primary)] text-[var(--ink)] font-semibold" : "bg-[var(--paper)] border-[var(--line)] text-[var(--ink-muted,var(--muted))]"}`}>{s.label}</button>
					))}</div>
				) : <p className="text-[11px] text-[var(--ink-muted,var(--muted))]">Автопоиск mDNS/LAN не нашёл других узлов — укажите IP-адрес главного ПК вручную.</p>}
				<input type="text" value={serverAddress} onChange={(e) => setServerAddress(e.target.value)} placeholder="http://192.168.1.100:4100" aria-label="Адрес сервера клиники" className="w-full h-11 sm:h-9 px-3 rounded-xl sm:rounded-lg border border-[var(--line)] bg-[var(--paper)] text-sm font-mono text-[var(--ink)]" />
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div className="space-y-1.5">
					<label htmlFor="lan-join-pin-input" className="text-xs font-medium text-[var(--ink)]">6-значный PIN с главного ПК</label>
					<input id="lan-join-pin-input" type="text" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className="w-full h-11 sm:h-9 px-3 rounded-xl sm:rounded-lg border border-[var(--line)] bg-[var(--paper)] text-base font-mono tracking-widest text-center text-[var(--ink)]" />
				</div>
				<div className="space-y-1.5">
					<span className="text-xs font-medium text-[var(--ink)] block">Роль устройства</span>
					<div className="flex p-1 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] gap-1">
						<button type="button" onClick={() => setRole("doctor")} className={`flex-1 min-h-[36px] rounded-lg text-xs cursor-pointer ${role === "doctor" ? "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] font-semibold shadow-xs" : "bg-transparent border border-transparent text-[var(--ink-muted,var(--muted))] hover:text-[var(--ink)]"}`}>Врач</button>
						<button type="button" onClick={() => setRole("assistant")} className={`flex-1 min-h-[36px] rounded-lg text-xs cursor-pointer ${role === "assistant" ? "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] font-semibold shadow-xs" : "bg-transparent border border-transparent text-[var(--ink-muted,var(--muted))] hover:text-[var(--ink)]"}`}>Ассистент</button>
					</div>
				</div>
			</div>
			{errorMsg && <div className="p-2.5 rounded-lg bg-[var(--danger-soft,rgba(239,68,68,0.1))] border border-[var(--danger-soft,rgba(239,68,68,0.25))] text-xs text-[var(--danger,#ef4444)] flex items-start gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{errorMsg}</span></div>}
			{successMsg && <div className="p-2.5 rounded-lg bg-[var(--success-soft,rgba(16,185,129,0.12))] text-xs text-[var(--primary)] flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>{successMsg}</span></div>}
			<div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
				{onOpenDiagnostics && <button type="button" onClick={onOpenDiagnostics} className="w-full sm:w-auto min-h-[44px] sm:min-h-[36px] px-3 rounded-lg text-xs font-medium bg-transparent border border-transparent text-[var(--ink-muted,var(--muted))] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer">Подсказка по Windows Firewall</button>}
				<button type="button" onClick={() => void handleJoin()} data-testid="lan-client-join-submit-btn" className="w-full sm:w-auto min-h-[44px] sm:h-9 px-4 rounded-xl sm:rounded-lg text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] border border-transparent shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer sm:ml-auto">
					{submitting ? <RefreshCw className="w-4 h-4 animate-spin shrink-0" /> : <ShieldCheck className="w-4 h-4 shrink-0" />}
					<span>{submitting ? "Подключение..." : "Подключить устройство"}</span>
				</button>
			</div>
		</div>
	);
};
