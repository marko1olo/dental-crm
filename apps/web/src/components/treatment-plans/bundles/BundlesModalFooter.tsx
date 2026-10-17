import React from "react";
import { Stethoscope } from "lucide-react";

interface BundlesModalFooterProps {
	onClose: () => void;
}

export const BundlesModalFooter: React.FC<BundlesModalFooterProps> = ({ onClose }) => (
	<div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 text-xs text-[var(--muted)]">
		<div className="flex items-center gap-2">
			<Stethoscope size={14} className="text-[var(--teal)]" />
			<span>Все суммы рассчитываются в копейках с гарантией абсолютной точности.</span>
		</div>
		<button
			type="button"
			onClick={onClose}
			className="secondary-button min-h-[36px] px-4"
			data-testid="bundles-modal-bottom-close-btn"
		>
			Закрыть
		</button>
	</div>
);
