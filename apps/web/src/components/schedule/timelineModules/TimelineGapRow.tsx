import { Clock, Plus } from "lucide-react";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";
import { formatMinutesForHumans } from "../scheduleDayGrouping";

interface TimelineGapRowProps {
	dateKey: string;
	row: any;
	gapStartLabel: string | null;
	gapEndLabel: string | null;
	onEmptySlotClick?: (slot: QuickBookingSlotInfo) => void;
}

export function TimelineGapRow({
	dateKey,
	row,
	gapStartLabel,
	gapEndLabel,
	onEmptySlotClick,
}: TimelineGapRowProps) {
	const handleClick = () => {
		if (typeof onEmptySlotClick === "function") {
			const slotPayload: {
				dateKey: string;
				startsAt?: string;
				endsAt?: string;
				durationMinutes?: number;
			} = {
				dateKey,
			};
			if (row.startsAt) slotPayload.startsAt = row.startsAt;
			if (row.endsAt) slotPayload.endsAt = row.endsAt;
			if (row.minutes) slotPayload.durationMinutes = row.minutes;
			onEmptySlotClick(slotPayload);
		}
	};

	return (
		<div
			data-timeline-focusable="true"
			tabIndex={0}
			role="button"
			onClick={handleClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleClick();
				}
			}}
			className="schedule-day-gap group my-2 ml-3 pr-2 sm:pr-0 p-2.5 rounded-xl border border-dashed border-[var(--teal)]/40 hover:border-[var(--teal)] bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] transition-all cursor-pointer flex items-center justify-between gap-3 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal)] focus:outline-none min-h-[44px]"
			data-testid="schedule-day-gap"
			aria-label={`Свободное окно: ${formatMinutesForHumans(row.minutes)}. Нажмите для быстрой записи`}
			style={{ contentVisibility: "auto", containIntrinsicSize: "1px 48px" }}
		>
			<div className="flex items-center gap-2 min-w-0 flex-1">
				<Clock size={14} className="text-[var(--teal)] shrink-0" />
				<div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center">
					<span className="whitespace-nowrap">
						Свободно {formatMinutesForHumans(row.minutes)}
					</span>
					{gapStartLabel && gapEndLabel && (
						<span className="text-[11px] sm:text-xs text-[var(--muted)] sm:ml-1 whitespace-nowrap">
							({gapStartLabel} – {gapEndLabel})
						</span>
					)}
				</div>
			</div>
			<span className="min-h-[36px] min-w-[76px] px-2.5 py-1 rounded-lg bg-[var(--teal-dark)] text-white text-xs font-bold flex items-center justify-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity shrink-0 whitespace-nowrap">
				<Plus size={14} className="shrink-0" />
				<span>Записать</span>
			</span>
		</div>
	);
}
