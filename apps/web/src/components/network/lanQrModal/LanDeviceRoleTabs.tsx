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
			className="flex items-center justify-between bg-[var(--paper-soft)] p-1 rounded-xl border border-[var(--line)] gap-1"
			role="tablist"
			aria-label="Выбор роли устройства"
		>
			<button
				type="button"
				role="tab"
				aria-selected={role === "doctor"}
				onClick={() => onRoleChange("doctor")}
				data-testid="lan-qr-role-doctor-btn"
				className={`flex-1 min-h-[44px] py-1.5 px-2.5 rounded-lg text-xs text-center leading-tight flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
					role === "doctor"
						? "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-xs font-semibold"
						: "bg-transparent border border-transparent text-[var(--ink-muted,var(--muted))] hover:text-[var(--ink)] font-medium"
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
				className={`flex-1 min-h-[44px] py-1.5 px-2.5 rounded-lg text-xs text-center leading-tight flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
					role === "assistant"
						? "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-xs font-semibold"
						: "bg-transparent border border-transparent text-[var(--ink-muted,var(--muted))] hover:text-[var(--ink)] font-medium"
				}`}
			>
				<Smartphone className="w-4 h-4 shrink-0" />
				<span>Ассистент (Телефон)</span>
			</button>
		</div>
	);
};
