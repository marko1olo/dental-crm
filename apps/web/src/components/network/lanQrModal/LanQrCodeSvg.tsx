import React from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import type { DeviceRole } from "../lanQrEngine";

export interface LanQrCodeSvgProps {
	readonly qrSvg: string;
	readonly role: DeviceRole;
	readonly pairingPin?: string | null | undefined;
	readonly requiresAuth: boolean;
	readonly loading: boolean;
}

export const LanQrCodeSvg: React.FC<LanQrCodeSvgProps> = ({
	qrSvg,
	role,
	pairingPin,
	requiresAuth,
	loading,
}) => {
	return (
		<div className="flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] shadow-inner">
			<div className="relative p-2.5 sm:p-3.5 bg-white rounded-2xl shadow-md border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
				{requiresAuth ? (
					<div className="w-[190px] h-[190px] sm:w-[210px] sm:h-[210px] flex flex-col items-center justify-center text-center p-3 text-slate-800">
						<ShieldCheck className="w-10 h-10 text-amber-500 mb-2" />
						<p className="text-xs font-semibold text-slate-900 mb-1">
							Требуется авторизация
						</p>
						<p className="text-[11px] text-slate-600 leading-snug">
							Для генерации QR-кода сопряжения планшетов выполните вход на сервере клиники.
						</p>
					</div>
				) : loading ? (
					<div className="w-[190px] h-[190px] sm:w-[210px] sm:h-[210px] flex flex-col items-center justify-center text-slate-700">
						<RefreshCw className="w-7 h-7 animate-spin text-teal-600 mb-2" />
						<p className="text-xs font-medium">Определение LAN IP...</p>
					</div>
				) : (
					<div
						className="w-[190px] h-[190px] sm:w-[210px] sm:h-[210px] flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
						data-testid="lan-qr-svg-container"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized pure SVG generated locally by canonical QR engine
						dangerouslySetInnerHTML={{ __html: qrSvg }}
					/>
				)}

				<div className="absolute -top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-teal-300 border border-slate-700 shadow-xs">
					{role === "doctor" ? "Врач у кресла" : "Ассистент"}
				</div>
			</div>

			{pairingPin && !requiresAuth && (
				<div
					data-testid="lan-qr-pin-display"
					className="mt-2.5 sm:mt-3.5 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--teal,#0d9488)]/40 flex items-center gap-2 shadow-xs"
				>
					<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] uppercase tracking-wider">
						ПИН:
					</span>
					<span className="font-mono text-sm sm:text-base font-bold text-[var(--teal,#0d9488)] tracking-widest">
						{pairingPin}
					</span>
				</div>
			)}
		</div>
	);
};
