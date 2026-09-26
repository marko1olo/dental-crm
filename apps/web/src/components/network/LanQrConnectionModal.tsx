/**
 * DENTE Dental CRM — LanQrConnectionModal
 *
 * Modal on the clinic server desktop: "Подключить планшет врача / ассистента в 1 клик".
 * Doctor or assistant points iPad/tablet camera at the server monitor and pairs instantly
 * without typing IP addresses or complex server credentials.
 *
 * Features:
 * - Real LAN IP detection (Wi-Fi prioritized, virtual WSL/Hyper-V/Docker strictly excluded)
 * - Dynamic cryptographically signed QR code (ISO/IEC 18004 SVG)
 * - 1-click role switcher: Doctor (iPad at chair) vs Assistant (Nurse tablet)
 * - Direct connection URL copy button with visual feedback
 * - AP Isolation router diagnostics & 1-click Windows Mobile Hotspot bypass guide
 * - 0 cartoon emojis — strict Lucide vector icons
 * - Maximum line count <= 800 (Mandate 8b)
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	AlertTriangle,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Copy,
	ExternalLink,
	HelpCircle,
	Info,
	Monitor,
	QrCode,
	Radio,
	RefreshCw,
	ShieldCheck,
	Smartphone,
	Tablet,
	Terminal,
	Wifi,
	X,
} from "lucide-react";
import {
	type DeviceRole,
	type LanServerInfoResponse,
	type LanServerInterfaceItem,
	buildLanConnectionUrl,
	formatAdapterDisplayName,
	generateLanPairingQr,
	getApIsolationDiagnostics,
	isWindowsHotspotIp,
} from "./lanQrEngine";

export interface LanQrConnectionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialRole?: DeviceRole;
}

export const LanQrConnectionModal: React.FC<LanQrConnectionModalProps> = ({
	isOpen,
	onClose,
	initialRole = "doctor",
}) => {
	const [role, setRole] = useState<DeviceRole>(initialRole);
	const [lanInfo, setLanInfo] = useState<LanServerInfoResponse | null>(null);
	const [selectedIp, setSelectedIp] = useState<string>("");
	const [activePairingToken, setActivePairingToken] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState<boolean>(false);
	const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
	const [activeTab, setActiveTab] = useState<"qr" | "diagnostics">("qr");
	const [showHotspotDetails, setShowHotspotDetails] = useState<boolean>(false);
	const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(900);

	// Load LAN info and pairing token from API
	const fetchLanInfo = useCallback(async (customRole?: DeviceRole) => {
		try {
			setLoading(true);
			setError(null);
			const targetRole = customRole || role;

			const response = await fetch("/api/network/lan-info");
			if (!response.ok) {
				throw new Error(`Ошибка сервера сети: ${response.status} ${response.statusText}`);
			}

			const data: LanServerInfoResponse = await response.json();
			setLanInfo(data);
			setSelectedIp((prev) => prev || data.primaryIp || "127.0.0.1");
			setActivePairingToken(data.pairingToken);
			setTimeRemainingSeconds(data.pairingExpiresInSeconds || 900);

			// If specific role requested, generate customized token for that role
			if (targetRole !== "doctor") {
				const pairRes = await fetch("/api/network/pair/generate", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ role: targetRole }),
				});
				if (pairRes.ok) {
					const pairData = await pairRes.json();
					setActivePairingToken(pairData.pairingToken);
				}
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			setError(msg);
			// Fallback local IP if server unreachable
			setSelectedIp(typeof window !== "undefined" ? window.location.hostname : "127.0.0.1");
		} finally {
			setLoading(false);
		}
	}, [role]);

	useEffect(() => {
		if (isOpen) {
			void fetchLanInfo(role);
		}
	}, [isOpen, fetchLanInfo, role]);

	// Countdown timer for pairing token validity
	useEffect(() => {
		if (!isOpen || timeRemainingSeconds <= 0) return;
		const timer = setInterval(() => {
			setTimeRemainingSeconds((prev) => {
				if (prev <= 1) {
					clearInterval(timer);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		return () => clearInterval(timer);
	}, [isOpen, timeRemainingSeconds]);

	// Refresh token and QR code on request
	const handleRefreshToken = async () => {
		try {
			setIsRefreshing(true);
			const response = await fetch("/api/network/pair/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ role, targetIp: selectedIp }),
			});

			if (response.ok) {
				const data = await response.json();
				setActivePairingToken(data.pairingToken);
				setTimeRemainingSeconds(data.expiresInSeconds || 900);
			} else {
				await fetchLanInfo(role);
			}
		} catch {
			await fetchLanInfo(role);
		} finally {
			setIsRefreshing(false);
		}
	};

	// Switch role (Doctor vs Assistant)
	const handleRoleChange = async (newRole: DeviceRole) => {
		setRole(newRole);
		try {
			setIsRefreshing(true);
			const response = await fetch("/api/network/pair/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ role: newRole, targetIp: selectedIp }),
			});
			if (response.ok) {
				const data = await response.json();
				setActivePairingToken(data.pairingToken);
				setTimeRemainingSeconds(data.expiresInSeconds || 900);
			}
		} catch {
			// ignore fallback
		} finally {
			setIsRefreshing(false);
		}
	};

	// Generated QR code payload
	const qrResult = useMemo(() => {
		const port =
			lanInfo?.webPort ||
			(typeof window !== "undefined" && window.location.port
				? Number(window.location.port)
				: 4000);
		const ip = selectedIp || lanInfo?.primaryIp || "127.0.0.1";
		const token = activePairingToken || "pairing-token-loading";

		return generateLanPairingQr(
			{
				lanIp: ip,
				port,
				pairingToken: token,
				role,
			},
			{
				size: 240,
				margin: 2,
				foregroundColor: "#090d16",
				backgroundColor: "#ffffff",
			},
		);
	}, [lanInfo, selectedIp, activePairingToken, role]);

	// Copy direct connection URL to clipboard
	const handleCopyUrl = async () => {
		try {
			if (navigator.clipboard) {
				await navigator.clipboard.writeText(qrResult.connectionUrl);
			} else {
				const textarea = document.createElement("textarea");
				textarea.value = qrResult.connectionUrl;
				document.body.appendChild(textarea);
				textarea.select();
				document.execCommand("copy");
				document.body.removeChild(textarea);
			}
			setCopied(true);
			setTimeout(() => setCopied(false), 2200);
		} catch {
			setCopied(false);
		}
	};

	// Diagnostics data
	const diagnostics = useMemo(() => getApIsolationDiagnostics(), []);

	// Active physical interfaces
	const physicalInterfaces = useMemo(() => {
		if (!lanInfo?.interfaces) return [];
		return lanInfo.interfaces.filter((i) => !i.isVirtual && i.score > 0);
	}, [lanInfo]);

	// Has Windows Hotspot IP active
	const hasActiveHotspot = useMemo(() => {
		return (
			lanInfo?.lanAddresses?.some(isWindowsHotspotIp) ||
			isWindowsHotspotIp(selectedIp)
		);
	}, [lanInfo, selectedIp]);

	// Formatted timer string MM:SS
	const formattedTime = useMemo(() => {
		const m = Math.floor(timeRemainingSeconds / 60);
		const s = timeRemainingSeconds % 60;
		return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	}, [timeRemainingSeconds]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
			<div
				className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border border-slate-700/60 overflow-hidden bg-slate-900 text-slate-100"
				role="dialog"
				aria-modal="true"
				aria-labelledby="lan-qr-modal-title"
			>
				{/* Top Bar Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
							<QrCode className="w-5 h-5" />
						</div>
						<div>
							<h2
								id="lan-qr-modal-title"
								className="text-base font-semibold tracking-tight text-white flex items-center gap-2"
							>
								Подключить планшет в 1 клик
								{hasActiveHotspot && (
									<span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
										<Radio className="w-3 h-3 animate-pulse" />
										Hotspot активен
									</span>
								)}
							</h2>
							<p className="text-xs text-slate-400">
								Мгновенный вход для врача или ассистента через камеру iPad / Android
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
						aria-label="Закрыть окно"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Tab Navigation */}
				<div className="flex border-b border-slate-800 bg-slate-950/50 px-5 pt-2 shrink-0">
					<button
						type="button"
						onClick={() => setActiveTab("qr")}
						className={`pb-2.5 px-3 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
							activeTab === "qr"
								? "border-sky-500 text-sky-400"
								: "border-transparent text-slate-400 hover:text-slate-200"
						}`}
					>
						<QrCode className="w-4 h-4" />
						QR-код подключения
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("diagnostics")}
						className={`pb-2.5 px-3 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
							activeTab === "diagnostics"
								? "border-sky-500 text-sky-400"
								: "border-transparent text-slate-400 hover:text-slate-200"
						}`}
					>
						<Wifi className="w-4 h-4" />
						Диагностика сети / Hotspot
						{lanInfo && lanInfo.interfaces.length > 0 && (
							<span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
								{physicalInterfaces.length} адаптера
							</span>
						)}
					</button>
				</div>

				{/* Modal Scrollable Body */}
				<div className="p-5 overflow-y-auto space-y-4">
					{error && (
						<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
							<AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
							<div>
								<p className="font-medium text-amber-300">Серверная диагностика</p>
								<p className="text-amber-200/90">{error}</p>
							</div>
						</div>
					)}

					{activeTab === "qr" ? (
						<>
							{/* Role Selection Segmented Bar */}
							<div className="flex items-center justify-between bg-slate-950/80 p-1 rounded-xl border border-slate-800">
								<button
									type="button"
									onClick={() => handleRoleChange("doctor")}
									className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
										role === "doctor"
											? "bg-sky-600 text-white shadow-sm"
											: "text-slate-400 hover:text-slate-200"
									}`}
								>
									<Tablet className="w-3.5 h-3.5" />
									Врач (Планшет у кресла)
								</button>
								<button
									type="button"
									onClick={() => handleRoleChange("assistant")}
									className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
										role === "assistant"
											? "bg-emerald-600 text-white shadow-sm"
											: "text-slate-400 hover:text-slate-200"
									}`}
								>
									<Smartphone className="w-3.5 h-3.5" />
									Ассистент (Сестринский планшет)
								</button>
							</div>

							{/* Main QR Card Frame */}
							<div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-slate-700/60 shadow-inner">
								{/* Crisp High-Contrast SVG QR Plate */}
								<div className="relative p-3.5 bg-white rounded-2xl shadow-xl border-4 border-slate-100 flex items-center justify-center">
									{loading ? (
										<div className="w-[240px] h-[240px] flex flex-col items-center justify-center text-slate-700">
											<RefreshCw className="w-8 h-8 animate-spin text-sky-600 mb-2" />
											<p className="text-xs font-medium">Определение LAN IP...</p>
										</div>
									) : (
										<div
											className="w-[240px] h-[240px] flex items-center justify-center"
											// biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized pure SVG generated locally by canonical QR engine
											dangerouslySetInnerHTML={{ __html: qrResult.qrSvg }}
										/>
									)}

									{/* Corner badge indicating active role */}
									<div className="absolute -top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white border border-slate-700 shadow-md">
										{role === "doctor" ? "Доктор" : "Ассистент"}
									</div>
								</div>

								{/* Live pairing status & Timer */}
								<div className="flex items-center gap-4 mt-4 text-xs">
									<div className="flex items-center gap-1.5 text-emerald-400 font-medium">
										<span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
										<span>Сервер готов к сопряжению</span>
									</div>
									<div className="text-slate-400 flex items-center gap-1">
										<span>QR активен:</span>
										<span className="font-mono text-slate-200">{formattedTime}</span>
									</div>
									<button
										type="button"
										onClick={handleRefreshToken}
										disabled={isRefreshing}
										className="p-1 rounded-md text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition-colors"
										title="Обновить QR-код"
										aria-label="Обновить QR-код"
									>
										<RefreshCw
											className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-sky-400" : ""}`}
										/>
									</button>
								</div>
							</div>

							{/* Connection Direct Link & Copy */}
							<div className="space-y-1.5">
								<label
									htmlFor="lan-connection-url-input"
									className="text-xs font-medium text-slate-300 flex items-center justify-between"
								>
									<span>Прямая ссылка для браузера планшета:</span>
									<span className="text-[11px] text-slate-400">
										IP: <span className="text-white font-mono">{selectedIp}</span>
									</span>
								</label>
								<div className="flex gap-2">
									<input
										id="lan-connection-url-input"
										type="text"
										readOnly
										value={qrResult.connectionUrl}
										className="flex-1 px-3 py-2 text-xs font-mono bg-slate-950/90 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-sky-500"
									/>
									<button
										type="button"
										onClick={handleCopyUrl}
										className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 ${
											copied
												? "bg-emerald-600 text-white"
												: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
										}`}
									>
										{copied ? (
											<>
												<Check className="w-3.5 h-3.5" />
												Скопировано
											</>
										) : (
											<>
												<Copy className="w-3.5 h-3.5" />
												Копировать
											</>
										)}
									</button>
								</div>
							</div>

							{/* Network Interface Switcher (if multiple physical adapters) */}
							{physicalInterfaces.length > 1 && (
								<div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
									<div className="text-xs font-medium text-slate-300 flex items-center justify-between">
										<span className="flex items-center gap-1.5">
											<Radio className="w-3.5 h-3.5 text-sky-400" />
											Выберите активный сетевой адаптер:
										</span>
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
										{physicalInterfaces.map((iface) => {
											const isSelected = selectedIp === iface.address;
											const formatted = formatAdapterDisplayName(
												iface,
												iface.address === lanInfo?.primaryIp,
											);
											return (
												<button
													key={`${iface.name}-${iface.address}`}
													type="button"
													onClick={() => setSelectedIp(iface.address)}
													className={`p-2 rounded-lg text-left border transition-all text-xs flex flex-col justify-between ${
														isSelected
															? "bg-sky-950/50 border-sky-500/80 text-white"
															: "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60"
													}`}
												>
													<div className="flex items-center justify-between">
														<span className="font-mono font-medium text-sky-300">
															{iface.address}
														</span>
														<span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
															{formatted.tag}
														</span>
													</div>
													<span className="text-[11px] text-slate-400 truncate mt-1">
														{iface.name}
													</span>
												</button>
											);
										})}
									</div>
								</div>
							)}

							{/* Fast AP Isolation Help Banner */}
							<div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start justify-between gap-3">
								<div className="flex items-start gap-2.5">
									<HelpCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
									<div className="text-xs">
										<p className="text-slate-200 font-medium">Планшет не открывает страницу?</p>
										<p className="text-slate-400 text-[11px] mt-0.5">
											На Wi-Fi роутере клиники может быть включена изоляция клиентов (AP Isolation).
										</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => setActiveTab("diagnostics")}
									className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 hover:bg-sky-500/25 transition-colors shrink-0"
								>
									Решение в 1 клик
								</button>
							</div>
						</>
					) : (
						/* Diagnostics & AP Isolation Bypass Tab */
						<div className="space-y-4">
							<div className="p-4 rounded-xl bg-sky-950/30 border border-sky-500/30 text-xs space-y-2">
								<div className="flex items-center gap-2 text-sky-300 font-semibold text-sm">
									<Info className="w-4 h-4" />
									{diagnostics.issueTitle}
								</div>
								<p className="text-slate-300 leading-relaxed">{diagnostics.cause}</p>
								<div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-200">
									<p className="font-medium text-sky-400">{diagnostics.solutionTitle}</p>
									<p className="text-[11px] text-slate-400 mt-0.5">
										{diagnostics.solutionDescription}
									</p>
								</div>
							</div>

							{/* Step by step guide */}
							<div className="space-y-2.5">
								<h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
									Пошаговая инструкция для Windows
								</h3>
								{diagnostics.steps.map((step) => (
									<div
										key={step.stepNumber}
										className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-start gap-3"
									>
										<div className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-500/20 text-sky-300 font-bold shrink-0 text-xs">
											{step.stepNumber}
										</div>
										<div className="space-y-1 flex-1">
											<p className="font-medium text-white">{step.title}</p>
											<p className="text-slate-400 text-[11px] leading-relaxed">
												{step.description}
											</p>
											{step.command && (
												<div className="flex items-center gap-2 mt-1">
													<code className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-400 font-mono text-[11px]">
														{step.command}
													</code>
													<a
														href={step.command}
														className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 font-medium"
													>
														<ExternalLink className="w-3 h-3" />
														Открыть в Windows
													</a>
												</div>
											)}
										</div>
									</div>
								))}
							</div>

							{/* Network interfaces raw audit table */}
							<div className="space-y-1.5">
								<button
									type="button"
									onClick={() => setShowHotspotDetails(!showHotspotDetails)}
									className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 p-2 rounded-lg bg-slate-950/40 border border-slate-800"
								>
									<span>Подробная топология сетевых адаптеров сервера</span>
									{showHotspotDetails ? (
										<ChevronUp className="w-4 h-4" />
									) : (
										<ChevronDown className="w-4 h-4" />
									)}
								</button>

								{showHotspotDetails && lanInfo?.interfaces && (
									<div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-2 max-h-48 overflow-y-auto font-mono">
										{lanInfo.interfaces.map((i) => (
											<div
												key={`${i.name}-${i.address}`}
												className="p-1.5 rounded bg-slate-900/60 border border-slate-800/80 flex items-center justify-between"
											>
												<div>
													<span className="text-slate-200 font-semibold">{i.name}</span>
													<span className="text-slate-400 ml-2">{i.address}</span>
												</div>
												<div className="flex items-center gap-2">
													<span
														className={`px-1.5 py-0.5 rounded text-[10px] ${
															i.isVirtual
																? "bg-red-500/20 text-red-400"
																: "bg-emerald-500/20 text-emerald-400"
														}`}
													>
														{i.isVirtual ? "Виртуальный / Исключен" : "Физический LAN"}
													</span>
													<span className="text-slate-400">Score: {i.score}</span>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					)}
				</div>

				{/* Bottom Bar Footer */}
				<div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
					<div className="flex items-center gap-2 text-xs text-slate-400">
						<ShieldCheck className="w-4 h-4 text-emerald-400" />
						<span>Шифрованное сопряжение по стандарту DENTE CRM</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
};
