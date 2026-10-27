import React from "react";

export function ShiftTimeMenuSection({
	isQuickStatusUpdating,
	handleShiftAppointmentTime,
	onClose,
}: {
	isQuickStatusUpdating: boolean;
	handleShiftAppointmentTime: (minutes: number) => Promise<void>;
	onClose: () => void;
}) {
	return (
		<>
			<div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1">
				Опоздание (сдвиг времени)
			</div>
			<div className="grid grid-cols-3 gap-1 px-1 py-0.5">
				{[15, 30, 45].map((m) => (
					<button
						key={m}
						type="button"
						disabled={isQuickStatusUpdating}
						onClick={() => {
							onClose();
							void handleShiftAppointmentTime(m);
						}}
						className="h-7 min-h-[28px] sm:h-7 sm:min-h-[28px] touch:min-h-[44px] px-1.5 py-1 rounded-md border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-hover,var(--paper-soft,#f8fafc))] text-[var(--ink,#0f172a)] text-xs font-bold transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center whitespace-nowrap"
						title={`Сдвинуть на +${m} минут`}
					>
						+{m}м
					</button>
				))}
			</div>
		</>
	);
}
