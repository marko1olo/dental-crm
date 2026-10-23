import { AlertCircle, Check, Phone, RotateCw, Sunrise, Sun, Sunset, WifiOff } from "lucide-react";
import type React from "react";
import { BookingSlotsEmptyState } from "./BookingSlotsEmptyState";
import type { BookingSlotItem } from "./contracts/bookingContracts";
import type { SlotPeriod } from "./BookingSlotPeriodFilters";

export interface BookingSlotGridProps {
	readonly slotsLoading: boolean;
	readonly filteredSlots: BookingSlotItem[];
	readonly activePeriodFilter: SlotPeriod;
	readonly morningSlots: BookingSlotItem[];
	readonly afternoonSlots: BookingSlotItem[];
	readonly eveningSlots: BookingSlotItem[];
	readonly selectedSlot: BookingSlotItem | null;
	readonly onSelectSlot: (slot: BookingSlotItem) => void;
	readonly onJoinWaitlist?: (() => void) | undefined;
	readonly slotError?: string | null | undefined;
	readonly onRetry?: (() => void) | undefined;
}

const renderSlotButton = (
	slot: BookingSlotItem,
	selectedSlot: BookingSlotItem | null,
	onSelectSlot: (slot: BookingSlotItem) => void,
) => {
	const isSelected = selectedSlot?.time === slot.time;
	return (
		<button
			type="button"
			key={slot.time}
			className={`dbw-slot-btn ${isSelected ? "selected" : ""}`}
			onClick={() => onSelectSlot(slot)}
			aria-pressed={isSelected}
		>
			<span className="text-base font-bold">{slot.time}</span>
			{isSelected && (
				<Check size={14} className="dbw-slot-check" aria-hidden="true" />
			)}
		</button>
	);
};

export const BookingSlotGrid: React.FC<BookingSlotGridProps> = ({
	slotsLoading,
	filteredSlots,
	activePeriodFilter,
	morningSlots,
	afternoonSlots,
	eveningSlots,
	selectedSlot,
	onSelectSlot,
	onJoinWaitlist,
	slotError,
	onRetry,
}) => {
	if (slotsLoading) {
		return (
			<div className="dbw-slots-section" aria-live="polite">
				<div className="dbw-slots-loading-container">
					<div className="dbw-loading-spinner" aria-hidden="true" />
					<div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
						Загрузка свободных интервалов…
					</div>
				</div>
			</div>
		);
	}

	if (slotError && filteredSlots.length === 0) {
		const isNetworkOrOffline =
			slotError.toLowerCase().includes("интернет") ||
			slotError.toLowerCase().includes("сетев") ||
			slotError.toLowerCase().includes("таймаут") ||
			slotError.toLowerCase().includes("связи") ||
			slotError.toLowerCase().includes("offline") ||
			slotError.toLowerCase().includes("timeout") ||
			slotError.toLowerCase().includes("connection") ||
			slotError.toLowerCase().includes("connect");

		return (
			<div className="dbw-slots-section" aria-live="polite">
				<div
					className="dbw-slots-offline-container text-center p-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/40 dark:bg-amber-950/20"
					data-testid="slots-offline-fallback"
				>
					<div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
						{isNetworkOrOffline ? <WifiOff size={24} /> : <AlertCircle size={24} />}
					</div>
					<h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
						{isNetworkOrOffline
							? "Связь с сервером клиники временно недоступна"
							: "Не удалось загрузить доступные интервалы"}
					</h4>
					<p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mb-4">
						{slotError}
					</p>
					<div className="flex flex-wrap items-center justify-center gap-2">
						<a
							href="tel:+78000000000"
							className="primary-button inline-flex items-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm min-h-[44px]"
							data-testid="call-clinic-btn"
						>
							<Phone size={16} />
							<span>Позвонить в клинику</span>
						</a>
						{onRetry && (
							<button
								type="button"
								className="secondary-button inline-flex items-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm min-h-[44px]"
								onClick={onRetry}
								data-testid="retry-slots-btn"
							>
								<RotateCw size={16} />
								<span>Повторить попытку</span>
							</button>
						)}
					</div>
				</div>
			</div>
		);
	}

	if (filteredSlots.length === 0) {
		return <BookingSlotsEmptyState onJoinWaitlist={onJoinWaitlist} />;
	}

	return (
		<div className="dbw-slots-section" aria-live="polite">
			<div className="dbw-slots-groups">
				{activePeriodFilter === "all" ? (
					<>
						{morningSlots.length > 0 && (
							<div className="dbw-slot-group">
								<div className="dbw-slots-period-label">
									<Sunrise size={16} />
									<span>Утро (09:00–12:00)</span>
									<span className="dbw-period-count-badge">{morningSlots.length}</span>
								</div>
								<div className="dbw-slots-grid">
									{morningSlots.map((s) => renderSlotButton(s, selectedSlot, onSelectSlot))}
								</div>
							</div>
						)}
						{afternoonSlots.length > 0 && (
							<div className="dbw-slot-group">
								<div className="dbw-slots-period-label">
									<Sun size={16} />
									<span>День (12:00–16:00)</span>
									<span className="dbw-period-count-badge">{afternoonSlots.length}</span>
								</div>
								<div className="dbw-slots-grid">
									{afternoonSlots.map((s) => renderSlotButton(s, selectedSlot, onSelectSlot))}
								</div>
							</div>
						)}
						{eveningSlots.length > 0 && (
							<div className="dbw-slot-group">
								<div className="dbw-slots-period-label">
									<Sunset size={16} />
									<span>Вечер (16:00–21:00)</span>
									<span className="dbw-period-count-badge">{eveningSlots.length}</span>
								</div>
								<div className="dbw-slots-grid">
									{eveningSlots.map((s) => renderSlotButton(s, selectedSlot, onSelectSlot))}
								</div>
							</div>
						)}
					</>
				) : (
					<div className="dbw-slots-grid">
						{filteredSlots.map((s) => renderSlotButton(s, selectedSlot, onSelectSlot))}
					</div>
				)}
			</div>
		</div>
	);
};
