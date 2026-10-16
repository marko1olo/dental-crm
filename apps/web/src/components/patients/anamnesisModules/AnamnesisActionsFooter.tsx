import React from "react";
import { Check, Copy, Printer } from "lucide-react";
import { showToast } from "../../GlobalToast";

export interface AnamnesisActionsFooterProps {
	readonly onSave: () => void;
	readonly onClose: () => void;
	readonly onSyncDiary?: (() => void) | undefined;
}

export const AnamnesisActionsFooter: React.FC<AnamnesisActionsFooterProps> = React.memo(({
	onSave,
	onClose,
	onSyncDiary,
}) => {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 p-4 border-t border-[var(--line)] bg-[var(--paper-soft)]">
			<div className="flex items-center gap-2">
				{onSyncDiary && (
					<button
						type="button"
						onClick={onSyncDiary}
						className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors inline-flex items-center gap-1.5 text-xs cursor-pointer"
						data-testid="btn-anamnesis-sync-emk"
					>
						<Copy size={13} className="text-[var(--teal)]" />
						<span>В дневник карты (043/у)</span>
					</button>
				)}
				<button
					type="button"
					onClick={() => showToast("Печать бланка анкеты здоровья отправлена на принтер", "info")}
					className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors inline-flex items-center gap-1.5 text-xs cursor-pointer"
					data-testid="btn-anamnesis-print-blank"
				>
					<Printer size={13} className="text-[var(--muted)]" />
					<span>Печать анкеты (А4)</span>
				</button>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onClose}
					className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors text-xs cursor-pointer"
				>
					Отмена
				</button>
				<button
					type="button"
					onClick={onSave}
					className="border border-[var(--line)] bg-[var(--teal)] text-white font-bold rounded-lg px-3 py-1.5 shadow-2xs hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 text-xs cursor-pointer"
					data-testid="btn-anamnesis-save"
				>
					<Check size={14} />
					<span>Сохранить анкету</span>
				</button>
			</div>
		</div>
	);
});
