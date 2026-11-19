import React from "react";
import { HardwareSettingsTab } from "../settings/HardwareSettingsTab";
import { X } from "lucide-react";

export interface HardwareSettingsModalProps {
	isOpen?: boolean | undefined;
	onClose?: (() => void) | undefined;
}

export const HardwareSettingsModal: React.FC<HardwareSettingsModalProps> = ({
	isOpen = true,
	onClose,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
			data-testid="hardware-settings-modal"
		>
			<div className="w-full max-w-4xl max-h-[90vh] bg-[var(--paper)] text-[var(--ink)] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[var(--line)]">
				<div className="flex items-center justify-between p-4 border-b border-[var(--line)]">
					<h2 className="text-base font-semibold">Оборудование клиники</h2>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-lg hover:bg-[var(--paper-soft)]"
						data-testid="hardware-settings-modal-close"
						aria-label="Закрыть"
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
};

export default HardwareSettingsModal;
