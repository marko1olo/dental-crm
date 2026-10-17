import React from "react";
import type { TelephonyCallLogFilter } from "./telephonyDrawerTypes";

export interface TelephonyCallLogEmptyProps {
	activeFilter: TelephonyCallLogFilter;
}

export function TelephonyCallLogEmpty({
	activeFilter,
}: TelephonyCallLogEmptyProps): React.JSX.Element {
	return (
		<div
			className="p-6 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-center space-y-1.5"
			data-testid="telephony-call-log-empty"
		>
			<div className="text-xs font-bold text-[var(--ink)]">
				{activeFilter === "missed_unhandled"
					? "Необработанных пропущенных вызовов нет"
					: activeFilter === "recorded"
						? "Записей разговоров по фильтру не найдено"
						: "Журнал вызовов за смену пуст"}
			</div>
			<div className="text-[11px] text-[var(--muted)]">
				Все новые входящие и исходящие звонки ВАТС отображаются здесь в реальном времени
			</div>
		</div>
	);
}
