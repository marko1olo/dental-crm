import React from "react";
import { Check, Copy, ExternalLink, HelpCircle, Radio } from "lucide-react";
import { formatAdapterDisplayName, type LanServerInterfaceItem } from "../lanQrEngine";

export interface LanConnectionActionsProps {
	readonly connectionUrl: string;
	readonly selectedIp: string;
	readonly requiresAuth: boolean;
	readonly copied: boolean;
	readonly onCopyUrl: () => void;
	readonly physicalInterfaces: readonly LanServerInterfaceItem[];
	readonly primaryIp?: string;
	readonly onSelectAdapter: (ip: string) => void;
	readonly onOpenDiagnostics?: () => void;
}

export const LanConnectionActions: React.FC<LanConnectionActionsProps> = ({
	connectionUrl, selectedIp, requiresAuth, copied, onCopyUrl, physicalInterfaces, primaryIp, onSelectAdapter, onOpenDiagnostics,
}) => {
	const displayUrl = requiresAuth ? "Требуется авторизация на сервере клиники" : connectionUrl;

	return (
		<div className="space-y-3">
			<div className="space-y-1.5">
				<label htmlFor="lan-connection-url-input" className="text-xs font-medium text-[var(--ink,#0f172a)] flex items-center justify-between">
					<span>Прямая ссылка для браузера:</span>
					<span className="text-[11px] text-[var(--muted,#64748b)]">
						IP: <span className="text-[var(--ink,#0f172a)] font-mono font-semibold">{selectedIp}</span>
					</span>
				</label>
				<div className="flex flex-wrap sm:flex-nowrap gap-2">
					<input
						id="lan-connection-url-input"
						type="text"
						readOnly
						value={displayUrl}
						className="flex-1 min-w-[200px] px-3 py-2 text-xs font-mono bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] rounded-xl text-[var(--ink,#0f172a)] focus:outline-none focus:border-[var(--teal,#0d9488)]"
					/>
					<button
						type="button"
						onClick={onCopyUrl}
						data-testid="lan-qr-copy-url-btn"
						className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer ${
							copied ? "bg-emerald-600 text-white" : "bg-teal-600 hover:bg-teal-700 text-white"
						}`}
					>
						{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
						<span>{copied ? "Скопировано" : "Скопировать"}</span>
					</button>
					{!requiresAuth && (
						<a
							href={connectionUrl}
							target="_blank"
							rel="noreferrer"
							data-testid="lan-qr-open-browser-btn"
							className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-card,#f1f5f9)] text-[var(--ink,#0f172a)] flex items-center justify-center gap-1.5 shrink-0 transition-colors"
						>
							<ExternalLink className="w-4 h-4 text-[var(--teal,#0d9488)]" />
							<span className="hidden sm:inline">Открыть</span>
						</a>
					)}
				</div>
			</div>

			{physicalInterfaces.length > 1 && (
				<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-2">
					<div className="text-xs font-medium text-[var(--ink,#0f172a)] flex items-center gap-1.5">
						<Radio className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
						<span>Активный сетевой адаптер:</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{physicalInterfaces.map((iface) => {
							const isSelected = selectedIp === iface.address;
							const formatted = formatAdapterDisplayName(iface, iface.address === primaryIp);
							return (
								<button
									key={`${iface.name}-${iface.address}`}
									type="button"
									onClick={() => onSelectAdapter(iface.address)}
									className={`min-h-[44px] p-2.5 rounded-lg text-left border transition-all text-xs flex flex-col justify-between cursor-pointer ${
										isSelected
											? "bg-[var(--paper,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
											: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-card,#f1f5f9)] text-[var(--ink,#0f172a)]"
									}`}
								>
									<div className="flex items-center justify-between w-full">
										<span className="font-mono font-medium text-[var(--teal,#0d9488)]">{iface.address}</span>
										<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] border border-[var(--line,#e2e8f0)]">{formatted.tag}</span>
									</div>
									<span className="text-[11px] text-[var(--muted,#64748b)] truncate mt-1">{iface.name}</span>
								</button>
							);
						})}
					</div>
				</div>
			)}

			{onOpenDiagnostics && (
				<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex items-center justify-between gap-3">
					<div className="flex items-center gap-2.5">
						<HelpCircle className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
						<span className="text-xs text-[var(--ink,#0f172a)]">Планшет не открывает адрес сервера?</span>
					</div>
					<button
						type="button"
						onClick={onOpenDiagnostics}
						className="min-h-[44px] px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--teal,#0d9488)]/10 border border-[var(--teal,#0d9488)]/30 text-[var(--teal,#0d9488)] hover:bg-[var(--teal,#0d9488)]/20 transition-colors shrink-0 cursor-pointer"
					>
						Решение в 1 клик
					</button>
				</div>
			)}
		</div>
	);
};
