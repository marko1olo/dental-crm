import { CalendarDays, Lock, ShieldCheck } from "lucide-react";
import React from "react";
import type { PublicBookingWidgetConfig } from "./bookingConfigTypes";

interface Props {
	config: PublicBookingWidgetConfig;
	onChange: (updated: PublicBookingWidgetConfig) => void;
}

export const BookingAntiSpamCard: React.FC<Props> = ({ config, onChange }) => {
	const update = (partial: Partial<PublicBookingWidgetConfig>) => onChange({ ...config, ...partial });

	return (
		<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-card)] space-y-4">
			<div className="flex items-center gap-2">
				<ShieldCheck size={18} className="text-[var(--teal)]" />
				<h4 className="m-0 text-sm font-semibold text-[var(--ink)]">Защита от спама и ложных записей</h4>
			</div>

			<div className="space-y-3">
				<label className="flex items-center gap-2.5 text-xs text-[var(--ink)] cursor-pointer">
					<input
						type="checkbox"
						checked={config.requirePhoneOtp}
						onChange={(e) => update({ requirePhoneOtp: e.target.checked })}
						className="rounded border-[var(--line)] text-teal-600"
					/>
					<span>Подтверждение номера телефона через SMS / звонок-сброс</span>
				</label>

				<label className="flex items-center gap-2.5 text-xs text-[var(--ink)] cursor-pointer">
					<input
						type="checkbox"
						checked={config.honeypotSpamShield}
						onChange={(e) => update({ honeypotSpamShield: e.target.checked })}
						className="rounded border-[var(--line)] text-teal-600"
					/>
					<span>Автоматическая защита от ботов (скрытая Honeypot-ловушка)</span>
				</label>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--line-subtle)]">
					<div>
						<label className="block text-xs font-medium text-[var(--muted)] mb-1">
							Горизонт записи вперёд
						</label>
						<select
							value={config.bookingHorizonDays}
							onChange={(e) => update({ bookingHorizonDays: Number(e.target.value) })}
							className="w-full h-9 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
						>
							<option value={7}>7 дней (1 неделя)</option>
							<option value={14}>14 дней (2 недели)</option>
							<option value={30}>30 дней (1 месяц)</option>
						</select>
					</div>

					<div>
						<label className="block text-xs font-medium text-[var(--muted)] mb-1">
							Макс. активных броней на телефон
						</label>
						<select
							value={config.maxActiveBookingsPerPhone}
							onChange={(e) => update({ maxActiveBookingsPerPhone: Number(e.target.value) })}
							className="w-full h-9 px-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
						>
							<option value={1}>1 запись</option>
							<option value={2}>2 записи</option>
							<option value={3}>3 записи</option>
						</select>
					</div>
				</div>
			</div>
		</div>
	);
};
