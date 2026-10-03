import React from "react";
import { X } from "lucide-react";
import { HardwareSettingsTab } from "../settings/HardwareSettingsTab";

export interface HardwareSettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

/**
 * DENTE CRM — Hardware Settings Modal Facade (Mandate 8s: Single Canonical Domain Authority).
 * Encapsulates the canonical HardwareSettingsTab in an accessible dialog shell.
 */
export function HardwareSettingsModal({ isOpen, onClose }: HardwareSettingsModalProps) {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
			role="dialog"
			aria-modal="true"
			data-testid="hardware-settings-modal"
		>
			<div className="relative flex flex-col w-full max-w-5xl h-[85vh] bg-[var(--surface-primary,#18181b)] border border-[var(--border-subtle,#27272a)] rounded-xl shadow-2xl overflow-hidden">
				<div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle,#27272a)] bg-[var(--surface-secondary,#202024)]">
					<h2 className="text-base font-semibold text-[var(--text-primary,#f4f4f5)]">
						Настройки оборудования и шлюзов (Hardware Gateway)
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-md text-[var(--text-muted,#a1a1aa)] hover:text-[var(--text-primary,#fff)] hover:bg-[var(--surface-tertiary,#2e2e33)] transition-colors"
						title="Закрыть"
						data-testid="hardware-settings-modal-close"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
				<div className="flex-1 overflow-y-auto p-4">
					<HardwareSettingsTab />
				</div>
			</div>
		</div>
	);
}

export default HardwareSettingsModal;
