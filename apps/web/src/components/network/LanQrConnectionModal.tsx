import React from "react";
import { createPortal } from "react-dom";
import { QrCode, Radio, ShieldCheck, Wifi, X } from "lucide-react";
import type { DeviceRole } from "./lanQrEngine";
import { LanClientJoinWizard } from "./lanQrModal/LanClientJoinWizard";
import { LanConnectionActions } from "./lanQrModal/LanConnectionActions";
import { LanDeviceRoleTabs } from "./lanQrModal/LanDeviceRoleTabs";
import { LanQrCodeSvg } from "./lanQrModal/LanQrCodeSvg";
import { LanTelemetryStatus } from "./lanQrModal/LanTelemetryStatus";
import { LanTroubleshootingGuide } from "./lanQrModal/LanTroubleshootingGuide";
import { LanWizardModeTabs } from "./lanQrModal/LanWizardModeTabs";
import { useLanConnection } from "./lanQrModal/useLanConnection";

export interface LanQrConnectionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialRole?: DeviceRole;
}

export const LanQrConnectionModal: React.FC<LanQrConnectionModalProps> = ({ isOpen, onClose, initialRole = "doctor" }) => {
	const c = useLanConnection(isOpen, initialRole, onClose);
	if (!isOpen || typeof document === "undefined") return null;

	return createPortal(
		<div className="lan-qr-modal-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[var(--backdrop,rgba(15,23,42,0.65))] backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="lan-qr-modal-title" data-testid="lan-qr-connection-modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="relative w-full max-w-xl max-h-[90vh] sm:max-h-[92vh] flex flex-col rounded-t-[24px] rounded-b-none sm:rounded-2xl shadow-2xl border border-[var(--line)] overflow-hidden overflow-x-clip bg-[var(--paper)] text-[var(--ink)]">
				<div className="sm:hidden flex justify-center pt-2.5 pb-0.5 shrink-0"><div className="w-9 h-1 rounded-full bg-[var(--line)] pointer-events-none" /></div>
				<div className="min-h-[56px] px-4 sm:px-5 py-2.5 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-2 shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--primary-soft,rgba(13,148,136,0.12))] text-[var(--primary)] shrink-0"><QrCode className="w-5 h-5" /></div>
						<div className="min-w-0 space-y-0.5">
							<h2 id="lan-qr-modal-title" className="text-sm sm:text-base font-semibold tracking-tight text-[var(--ink)] flex items-center gap-2 truncate">
								Сеть клиники и сопряжение
								{c.hasActiveHotspot && <span className="h-5 px-2 rounded-full text-xs font-medium bg-[var(--success-soft,rgba(16,185,129,0.12))] text-[var(--primary)] inline-flex items-center gap-1"><Radio className="w-3 h-3 animate-pulse" />Hotspot</span>}
							</h2>
							<p className="text-xs text-[var(--ink-muted,var(--muted))] truncate">Локальное Wi-Fi подключение без интернета</p>
						</div>
					</div>
					<button type="button" onClick={onClose} data-testid="lan-qr-modal-close-btn" className="min-h-[44px] min-w-[44px] rounded-xl !bg-transparent !border-0 text-[var(--ink-muted,var(--muted))] hover:text-[var(--ink)] hover:!bg-[var(--paper-soft)] inline-flex items-center justify-center cursor-pointer" aria-label="Закрыть окно"><X className="w-5 h-5" /></button>
				</div>
				<div className="px-5 pt-2.5 pb-1.5 border-b border-[var(--line)] bg-[var(--paper)] space-y-2 shrink-0">
					<LanWizardModeTabs mode={c.wizardMode} onChange={c.setWizardMode} />
					{c.wizardMode === "host" && (
						<div className="flex gap-2">
							<button type="button" onClick={() => c.setActiveTab("qr")} data-testid="lan-qr-tab-qr" className={`pb-1.5 px-2 text-xs font-medium !bg-transparent border-x-0 border-t-0 border-b-2 inline-flex items-center gap-1.5 cursor-pointer ${c.activeTab === "qr" ? "border-[var(--primary)] text-[var(--primary)] font-semibold" : "border-transparent text-[var(--ink-muted,var(--muted))] hover:text-[var(--ink)]"}`}><QrCode className="w-3.5 h-3.5" />QR и PIN</button>
							<button type="button" onClick={() => c.setActiveTab("diagnostics")} data-testid="lan-qr-tab-diagnostics" className={`pb-1.5 px-2 text-xs font-medium !bg-transparent border-x-0 border-t-0 border-b-2 inline-flex items-center gap-1.5 cursor-pointer ${c.activeTab === "diagnostics" ? "border-[var(--primary)] text-[var(--primary)] font-semibold" : "border-transparent text-[var(--ink-muted,var(--muted))] hover:text-[var(--ink)]"}`}><Wifi className="w-3.5 h-3.5" />Диагностика / Hotspot</button>
						</div>
					)}
				</div>
				<div className="p-4 overflow-y-auto space-y-3">
					{c.wizardMode === "client" ? (
						<LanClientJoinWizard initialOrigin={c.selectedIp ? `http://${c.selectedIp}:${c.lanInfo?.apiPort || 4100}` : undefined} initialRole={initialRole} onConnected={onClose} onOpenDiagnostics={() => { c.setWizardMode("host"); c.setActiveTab("diagnostics"); }} />
					) : c.activeTab === "qr" ? (
						<>
							<LanDeviceRoleTabs role={c.role} onRoleChange={c.handleRoleChange} />
							<LanQrCodeSvg qrSvg={c.qrResult.qrSvg} role={c.role} pairingPin={c.pairingPin} autoJoinPin={c.autoJoinPin} requiresAuth={c.requiresAuth} loading={c.loading} />
							<LanTelemetryStatus pingMs={c.pingMs} connectedPeersCount={c.connectedPeersCount} formattedTime={c.formattedTime} isRefreshing={c.isRefreshing} onRefresh={c.handleRefreshToken} />
							<LanConnectionActions connectionUrl={c.qrResult.connectionUrl} selectedIp={c.selectedIp} requiresAuth={c.requiresAuth} copied={c.copied} onCopyUrl={c.handleCopyUrl} physicalInterfaces={c.physicalInterfaces} primaryIp={c.lanInfo?.primaryIp} onSelectAdapter={c.handleSelectAdapter} onOpenDiagnostics={() => c.setActiveTab("diagnostics")} />
						</>
					) : (
						<LanTroubleshootingGuide interfaces={c.lanInfo?.interfaces} showDetails={c.showHotspotDetails} onToggleDetails={() => c.setShowHotspotDetails(!c.showHotspotDetails)} />
					)}
				</div>
				<div className="h-16 px-5 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between shrink-0">
					<div className="flex items-center gap-2 text-xs text-[var(--ink-muted,var(--muted))]"><ShieldCheck className="w-4 h-4 text-[var(--primary)]" /><span>Шифрованное сопряжение DENTE</span></div>
					<button type="button" onClick={onClose} data-testid="lan-qr-footer-close-btn" className="min-h-[44px] sm:h-9 px-4 rounded-xl sm:rounded-lg text-sm font-medium bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer">Закрыть</button>
				</div>
			</div>
		</div>,
		document.body,
	);
};
