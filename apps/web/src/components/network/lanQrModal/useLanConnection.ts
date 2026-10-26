import { useCallback, useEffect, useMemo, useState } from "react";
import { type DeviceRole, type LanServerInfoResponse, generateLanPairingQr, isWindowsHotspotIp } from "../lanQrEngine";
import { copyTextSafely, formatSecondsToTimer, getClinicAuthHeaders } from "./lanConnectionHelpers";

export function useLanConnection(isOpen: boolean, initialRole: DeviceRole = "doctor", onClose: () => void) {
	const [role, setRole] = useState<DeviceRole>(initialRole);
	const [lanInfo, setLanInfo] = useState<LanServerInfoResponse | null>(null);
	const [selectedIp, setSelectedIp] = useState<string>("");
	const [activePairingToken, setActivePairingToken] = useState<string>("");
	const [pairingPin, setPairingPin] = useState<string | null>(null);
	const [requiresAuth, setRequiresAuth] = useState(false), [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null), [copied, setCopied] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false), [showHotspotDetails, setShowHotspotDetails] = useState(false);
	const [activeTab, setActiveTab] = useState<"qr" | "diagnostics">("qr");
	const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(900);
	const [pingMs, setPingMs] = useState<number | null>(null), [connectedPeersCount, setConnectedPeersCount] = useState(0);

	const fetchLanInfo = useCallback(async (targetRole?: DeviceRole) => {
		try {
			setLoading(true); setError(null);
			const r = targetRole || role;
			const res = await fetch("/api/network/lan-info", { headers: getClinicAuthHeaders() });
			if (!res.ok) throw new Error(`Ошибка сети: ${res.status}`);
			const data: LanServerInfoResponse = await res.json();
			setLanInfo(data); setRequiresAuth(Boolean(data.requiresAuth || !data.pairingToken));
			setSelectedIp(data.primaryIp || "127.0.0.1"); setActivePairingToken(data.pairingToken || "");
			setPairingPin(data.pairingPin || null); setTimeRemainingSeconds(data.pairingExpiresInSeconds || 900);
			if (r !== "doctor" && data.pairingToken) {
				const pr = await fetch("/api/network/pair/generate", {
					method: "POST", headers: getClinicAuthHeaders(), body: JSON.stringify({ role: r, targetIp: data.primaryIp }),
				});
				if (pr.ok) {
					const pd = await pr.json();
					setActivePairingToken(pd.pairingToken); setPairingPin(pd.pairingPin || null);
				}
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setSelectedIp(typeof window !== "undefined" ? window.location.hostname : "127.0.0.1");
		} finally { setLoading(false); }
	}, [role]);

	useEffect(() => {
		if (!isOpen) return;
		void fetchLanInfo(role);
		const check = () => {
			const s = performance.now();
			fetch("/api/network/ping", { cache: "no-store" })
				.then((r) => r.ok && setPingMs(Math.max(1, Math.round(performance.now() - s))))
				.catch(() => setPingMs(null));
			fetch("/api/network/lan-mesh/status", { cache: "no-store" })
				.then((r) => r.json()).then((d) => d?.ok && setConnectedPeersCount(d.peers?.length || 0))
				.catch(() => {});
		};
		check();
		const iv = setInterval(check, 4000);
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => { clearInterval(iv); window.removeEventListener("keydown", onKey); };
	}, [isOpen, fetchLanInfo, role, onClose]);

	useEffect(() => {
		if (!isOpen || timeRemainingSeconds <= 0) return;
		const tm = setInterval(() => setTimeRemainingSeconds((p) => (p <= 1 ? 0 : p - 1)), 1000);
		return () => clearInterval(tm);
	}, [isOpen, timeRemainingSeconds]);

	const handleRefreshToken = async () => {
		setIsRefreshing(true);
		await fetchLanInfo(role);
		setIsRefreshing(false);
	};

	const handleRoleChange = async (newRole: DeviceRole) => {
		setRole(newRole);
		if (requiresAuth || !activePairingToken) return;
		try {
			setIsRefreshing(true);
			const res = await fetch("/api/network/pair/generate", {
				method: "POST", headers: getClinicAuthHeaders(), body: JSON.stringify({ role: newRole, targetIp: selectedIp }),
			});
			if (res.ok) {
				const d = await res.json();
				setActivePairingToken(d.pairingToken); setPairingPin(d.pairingPin || null);
			}
		} finally { setIsRefreshing(false); }
	};

	const qrResult = useMemo(() => {
		const port = typeof window !== "undefined" && window.location.port ? Number(window.location.port) : (lanInfo?.webPort || 5173);
		const ip = selectedIp || lanInfo?.primaryIp || (typeof window !== "undefined" ? window.location.hostname : "127.0.0.1");
		return generateLanPairingQr(
			{ lanIp: ip, port, pairingToken: activePairingToken || "pairing-token-loading", pairingPin, role, path: "/mobile" },
			{ size: 210, margin: 2, foregroundColor: "#090d16", backgroundColor: "#ffffff" },
		);
	}, [lanInfo, selectedIp, activePairingToken, pairingPin, role]);

	const handleCopyUrl = async () => {
		const text = requiresAuth ? (typeof window !== "undefined" ? window.location.origin : "") : qrResult.connectionUrl;
		const ok = await copyTextSafely(text);
		setCopied(ok);
		if (ok) setTimeout(() => setCopied(false), 2200);
	};

	const physicalInterfaces = useMemo(() => lanInfo?.interfaces?.filter((i) => !i.isVirtual && i.score > 0) || [], [lanInfo]);
	const hasActiveHotspot = useMemo(() => lanInfo?.lanAddresses?.some(isWindowsHotspotIp) || isWindowsHotspotIp(selectedIp), [lanInfo, selectedIp]);
	const formattedTime = useMemo(() => formatSecondsToTimer(timeRemainingSeconds), [timeRemainingSeconds]);

	return {
		role, lanInfo, selectedIp, activePairingToken, pairingPin, requiresAuth, loading, error, copied,
		isRefreshing, activeTab, setActiveTab, showHotspotDetails, setShowHotspotDetails, pingMs, connectedPeersCount,
		qrResult, physicalInterfaces, hasActiveHotspot, formattedTime,
		handleRefreshToken, handleRoleChange, handleCopyUrl, handleSelectAdapter: setSelectedIp,
	};
}
