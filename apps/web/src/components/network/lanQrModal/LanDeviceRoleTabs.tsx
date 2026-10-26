import React from "react";
import { Smartphone, Tablet } from "lucide-react";
import type { DeviceRole } from "../lanQrEngine";

export interface LanDeviceRoleTabsProps {
	readonly role: DeviceRole;
	readonly onRoleChange: (newRole: DeviceRole) => void;
}

export const LanDeviceRoleTabs: React.FC<LanDeviceRoleTabsProps> = ({
	role,
	onRoleChange,
}) => {
	return (
		<div
			className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl border border-[var(--line,#e2e8f0)]"
			role="tablist"
			aria-label="Выбор роли устройства"
		>
			<button
				type="button"
				role="tab"
				aria-selected={role === "doctor"}
				onClick={() => onRoleChange("doctor")}
				data-testid="lan-qr-role-doctor-btn"
				className={`flex-1 min-h-[44px] py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
					role === "doctor"
						? "bg-teal-600 text-white shadow-xs font-semibold"
						: "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
				}`}
			>
				<Tablet className="w-4 h-4 shrink-0" />
				<span>Врач у кресла (Планшет)</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={role === "assistant"}
				onClick={() => onRoleChange("assistant")}
				data-testid="lan-qr-role-assistant-btn"
				className={`flex-1 min-h-[44px] py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
					role === "assistant"
						? "bg-teal-600 text-white shadow-xs font-semibold"
						: "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
				}`}
			>
				<Smartphone className="w-4 h-4 shrink-0" />
				<span>Ассистент (Телефон)</span>
			</button>
		</div>
	);
};
