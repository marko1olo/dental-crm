import React from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import type { DeviceRole } from "../lanQrEngine";

export interface LanQrCodeSvgProps {
	readonly qrSvg: string;
	readonly role: DeviceRole;
	readonly pairingPin?: string | null | undefined;
	readonly autoJoinPin?: string | null | undefined;
	readonly requiresAuth: boolean;
	readonly loading: boolean;
}

export const LanQrCodeSvg: React.FC<LanQrCodeSvgProps> = ({
	qrSvg,
	role,
	pairingPin,
	autoJoinPin,
	requiresAuth,
	loading,
}) => {
	return (
		<div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)]">
			<div className="relative p-2.5 sm:p-3 bg-white rounded-2xl shadow-sm border border-[var(--line)] flex items-center justify-center">
				{requiresAuth ? (
					<div className="w-[156px] h-[156px] sm:w-[168px] sm:h-[168px] flex flex-col items-center justify-center text-center p-2 text-[#090d16]">
						<ShieldCheck className="w-9 h-9 text-amber-500 mb-1.5" />
						<p className="text-xs font-semibold text-[#090d16] mb-1">
							Требуется авторизация
						</p>
						<p className="text-[11px] text-[#475569] leading-snug">
							Для генерации QR-кода сопряжения планшетов выполните вход на сервере клиники.
						</p>
					</div>
				) : loading ? (
					<div className="w-[156px] h-[156px] sm:w-[168px] sm:h-[168px] flex flex-col items-center justify-center text-[#090d16]">
						<RefreshCw className="w-7 h-7 animate-spin text-[var(--primary)] mb-2" />
						<p className="text-xs font-medium">Определение LAN IP...</p>
					</div>
				) : (
					<div
						className="w-[156px] h-[156px] sm:w-[168px] sm:h-[168px] flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>img]:w-full [&>img]:h-full"
						data-testid="lan-qr-svg-container"
					>
						<img
							src={`data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}`}
							alt="QR-код подключения LAN"
							className="w-full h-full object-contain"
						/>
					</div>
				)}

				<div className="absolute -top-3 right-3 h-6 px-2.5 rounded-full text-xs font-medium inline-flex items-center bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-xs">
					{role === "doctor" ? "Врач у кресла" : "Ассистент"}
				</div>
			</div>

			{(pairingPin || autoJoinPin) && !requiresAuth && (
				<div className="mt-3 flex flex-wrap items-center justify-center gap-2">
					{pairingPin && (
						<div
							data-testid="lan-qr-pin-display"
							className="px-3.5 py-1.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center gap-2 shadow-xs"
						>
							<span className="text-xs font-medium text-[var(--ink-muted,var(--muted))]">
								ПИН:
							</span>
							<span className="font-mono text-sm sm:text-base font-semibold text-[var(--primary)] tracking-widest tabular-nums">
								{pairingPin}
							</span>
						</div>
					)}
					{autoJoinPin && (
						<div
							data-testid="lan-auto-join-pin-display"
							className="px-3.5 py-1.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center gap-2 shadow-xs"
						>
							<span className="text-xs font-medium text-[var(--ink-muted,var(--muted))]">
								Код сети:
							</span>
							<span className="font-mono text-sm sm:text-base font-semibold text-[var(--ink)] tracking-widest tabular-nums">
								{autoJoinPin}
							</span>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
