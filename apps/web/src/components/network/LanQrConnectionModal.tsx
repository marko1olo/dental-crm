import React from "react";
import { createPortal } from "react-dom";
import { QrCode, Radio, ShieldCheck, Wifi, X } from "lucide-react";
import type { DeviceRole } from "./lanQrEngine";
import { LanConnectionActions } from "./lanQrModal/LanConnectionActions";
import { LanDeviceRoleTabs } from "./lanQrModal/LanDeviceRoleTabs";
import { LanQrCodeSvg } from "./lanQrModal/LanQrCodeSvg";
import { LanTelemetryStatus } from "./lanQrModal/LanTelemetryStatus";
import { LanTroubleshootingGuide } from "./lanQrModal/LanTroubleshootingGuide";
import { useLanConnection } from "./lanQrModal/useLanConnection";

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
	const c = useLanConnection(isOpen, initialRole, onClose);
	if (!isOpen || typeof document === "undefined") return null;

	return createPortal(
		<div className="lan-qr-modal-overlay fixed inset-0 flex items-center justify-center p-3 sm:p-4 bg-[var(--backdrop,rgba(15,23,42,0.65))] backdrop-blur-xs animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="lan-qr-modal-title" data-testid="lan-qr-connection-modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="relative w-full max-w-xl max-h-[88vh] sm:max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border border-[var(--line,#e2e8f0)] overflow-hidden bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] transition-colors">
				<div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--teal,#0d9488)]/10 border border-[var(--teal,#0d9488)]/30 text-[var(--teal,#0d9488)]">
							<QrCode className="w-5 h-5" />
						</div>
						<div>
							<h2 id="lan-qr-modal-title" className="text-base font-semibold tracking-tight text-[var(--ink,#0f172a)] flex items-center gap-2">
								Подключение планшета врача (LAN QR)
								{c.hasActiveHotspot && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1"><Radio className="w-3 h-3 animate-pulse" />Hotspot</span>}
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)]">Прямое Wi-Fi подключение врача и ассистента в локальной сети</p>
						</div>
					</div>
					<button type="button" onClick={onClose} data-testid="lan-qr-modal-close-btn" className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-card,#f1f5f9)] transition-colors flex items-center justify-center cursor-pointer" aria-label="Закрыть окно"><X className="w-5 h-5" /></button>
				</div>
				<div className="flex border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] px-5 pt-2 shrink-0">
					<button type="button" onClick={() => c.setActiveTab("qr")} data-testid="lan-qr-tab-qr" className={`pb-2.5 px-3 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${c.activeTab === "qr" ? "border-teal-600 text-teal-600 dark:text-teal-400 font-semibold" : "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"}`}><QrCode className="w-4 h-4" />QR-код подключения</button>
					<button type="button" onClick={() => c.setActiveTab("diagnostics")} data-testid="lan-qr-tab-diagnostics" className={`pb-2.5 px-3 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${c.activeTab === "diagnostics" ? "border-teal-600 text-teal-600 dark:text-teal-400 font-semibold" : "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"}`}><Wifi className="w-4 h-4" />Диагностика сети / Hotspot</button>
				</div>
				<div className="p-4 sm:p-5 overflow-y-auto space-y-3.5">
					{c.activeTab === "qr" ? (
						<>
							<LanDeviceRoleTabs role={c.role} onRoleChange={c.handleRoleChange} />
							<LanQrCodeSvg qrSvg={c.qrResult.qrSvg} role={c.role} pairingPin={c.pairingPin} requiresAuth={c.requiresAuth} loading={c.loading} />
							<LanTelemetryStatus pingMs={c.pingMs} connectedPeersCount={c.connectedPeersCount} formattedTime={c.formattedTime} isRefreshing={c.isRefreshing} onRefresh={c.handleRefreshToken} />
							<LanConnectionActions connectionUrl={c.qrResult.connectionUrl} selectedIp={c.selectedIp} requiresAuth={c.requiresAuth} copied={c.copied} onCopyUrl={c.handleCopyUrl} physicalInterfaces={c.physicalInterfaces} primaryIp={c.lanInfo?.primaryIp} onSelectAdapter={c.handleSelectAdapter} onOpenDiagnostics={() => c.setActiveTab("diagnostics")} />
						</>
					) : (
						<LanTroubleshootingGuide interfaces={c.lanInfo?.interfaces} showDetails={c.showHotspotDetails} onToggleDetails={() => c.setShowHotspotDetails(!c.showHotspotDetails)} />
					)}
				</div>
				<div className="px-5 py-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between shrink-0">
					<div className="flex items-center gap-2 text-xs text-[var(--muted,#64748b)]"><ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /><span>Шифрованное сопряжение DENTE</span></div>
					<button type="button" onClick={onClose} data-testid="lan-qr-footer-close-btn" className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-card,#f1f5f9)] text-[var(--ink,#0f172a)] transition-colors cursor-pointer">Закрыть</button>
				</div>
			</div>
		</div>,
		document.body
	);
};
