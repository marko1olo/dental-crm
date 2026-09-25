/**
 * InvoiceAdminPinDrawer.tsx — Шторка авторизации управляющего клиники (Admin Override)
 * и быстрое согласование под личную ответственность врача (Мандат 8e).
 */

import React from "react";
import { Key, ShieldCheck } from "lucide-react";

export interface InvoiceAdminPinDrawerProps {
	readonly show: boolean;
	readonly adminPinInput: string;
	readonly setAdminPinInput: (val: string) => void;
	readonly adminReasonInput: string;
	readonly setAdminReasonInput: (val: string) => void;
	readonly isVerifyingPin: boolean;
	readonly onDoctorClinicalOverride: () => void;
	readonly onVerifyAdminPin: () => void | Promise<void>;
	readonly onCloseDrawer: () => void;
}

export const InvoiceAdminPinDrawer: React.FC<InvoiceAdminPinDrawerProps> = ({
	show,
	adminPinInput,
	setAdminPinInput,
	adminReasonInput,
	setAdminReasonInput,
	isVerifyingPin,
	onDoctorClinicalOverride,
	onVerifyAdminPin,
	onCloseDrawer,
}) => {
	if (!show) return null;

	return (
		<div
			data-testid="admin-pin-drawer"
			className="px-6 py-4 bg-amber-500/10 border-t border-amber-500/30 flex items-center justify-between gap-4"
		>
			<div className="flex items-center gap-3 flex-1">
				<Key
					size={20}
					className="text-amber-600 dark:text-amber-400 shrink-0"
				/>
				<div>
					<div className="font-bold text-xs text-amber-900 dark:text-amber-100">
						Авторизация управляющего клиники (Admin Override)
					</div>
					<div className="text-[11px] text-amber-800 dark:text-amber-300">
						Введите PIN-код для снятия ограничений и согласования цен
					</div>
				</div>
				<input
					type="password"
					maxLength={8}
					placeholder="PIN-код"
					data-testid="admin-pin-input"
					value={adminPinInput}
					onChange={(e) => setAdminPinInput(e.target.value)}
					className="w-28 px-3 py-1.5 bg-[var(--paper-strong)] border border-[var(--line)] rounded-lg text-sm font-mono tracking-widest text-center"
				/>
				<input
					type="text"
					placeholder="Основание согласования..."
					data-testid="admin-reason-input"
					value={adminReasonInput}
					onChange={(e) => setAdminReasonInput(e.target.value)}
					className="flex-1 px-3 py-1.5 bg-[var(--paper-strong)] border border-[var(--line)] rounded-lg text-xs"
				/>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onDoctorClinicalOverride}
					className="px-3 py-1.5 min-h-[36px] sm:min-h-[44px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1 cursor-pointer"
					data-testid="doctor-clinical-decision-btn"
					title="Согласовать цены решением лечащего врача"
				>
					<ShieldCheck size={14} />
					<span>Решение врача (1 клик)</span>
				</button>
				<button
					type="button"
					onClick={onVerifyAdminPin}
					disabled={isVerifyingPin}
					data-testid="admin-pin-verify-btn"
					className="px-4 py-1.5 min-h-[36px] sm:min-h-[44px] rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50 cursor-pointer"
				>
					{isVerifyingPin ? "Проверка..." : "Авторизовать"}
				</button>
				<button
					type="button"
					onClick={onCloseDrawer}
					data-testid="admin-pin-cancel-btn"
					className="px-3 py-1.5 min-h-[36px] sm:min-h-[44px] rounded-lg bg-[var(--paper-strong)] text-[var(--ink-muted)] hover:text-[var(--ink)] text-xs cursor-pointer"
				>
					Отмена
				</button>
			</div>
		</div>
	);
};
