import { ArrowLeft } from "lucide-react";
import type React from "react";
import type { StaffChatHeaderProps } from "./types";

export const StaffChatHeader: React.FC<StaffChatHeaderProps> = ({
	activeChannel,
	selectedLocation,
	locations,
	onBackToChannels,
	onLocationChange,
}) => {
	return (
		<div className="p-3 sm:p-4 border-b border-[var(--line)] flex items-center justify-between gap-2 bg-[var(--paper-soft)]/50">
			<div className="flex items-center gap-2 min-w-0 flex-1">
				{/* Кнопка «Назад к каналам» для смартфонов */}
				<button
					type="button"
					onClick={onBackToChannels}
					className="md:hidden p-2 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
					title="Назад к каналам"
				>
					<ArrowLeft size={18} />
				</button>

				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<h3 className="text-sm sm:text-base font-bold text-[var(--ink)] flex items-center gap-1 truncate">
							{activeChannel?.type === "channel" ? "#" : "@"}
							{activeChannel?.name || "Выберите канал"}
						</h3>
						{activeChannel?.isDefault && (
							<span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 font-semibold shrink-0">
								Клинический канал
							</span>
						)}
					</div>
					{activeChannel?.description && (
						<p className="text-[11px] sm:text-xs text-[var(--muted)] truncate">
							{activeChannel.description}
						</p>
					)}
				</div>
			</div>

			{/* Селектор рабочего места врача */}
			<div className="flex items-center gap-1.5 sm:gap-2 bg-[var(--paper)] px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border border-[var(--line)] shadow-2xs shrink-0">
				<span className="text-[11px] text-[var(--muted)] font-medium hidden sm:inline shrink-0">
					Мой кабинет:
				</span>
				<select
					value={selectedLocation}
					onChange={(e) => onLocationChange(e.target.value)}
					className="text-[11px] sm:text-xs font-bold rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] px-1.5 sm:px-2 py-1 cursor-pointer focus:outline-teal-500 max-w-[125px] sm:max-w-none truncate"
					title="Выберите рабочее место для подстановки в вызов интеркома"
					data-testid="chairside-location-selector"
				>
					{locations.map((loc) => (
						<option key={loc.id} value={loc.name}>
							{loc.name}
						</option>
					))}
				</select>
			</div>
		</div>
	);
};
