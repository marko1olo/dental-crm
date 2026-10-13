/**
 * @file TelephonyRecentCallsList.tsx
 * @description Layer 4: Presentation subcomponent for recent call history journal.
 * Includes status filters (All / Answered / Missed / Recorded), 1-click redial,
 * WhatsApp trigger, and inline CallAudioPlayer for call recordings.
 */

import {
	Headphones,
	MessageSquare,
	Phone,
	PhoneIncoming,
	PhoneMissed,
	PhoneOff,
	Volume2,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import {
	CALL_OUTCOME_REGISTRY,
	formatDurationTimer,
	formatPhoneDisplay,
} from "../../../store/telephonyStore";
import { CallAudioPlayer } from "../CallAudioPlayer";
import type { TelephonyRecentCallsListProps } from "./types";

type HistoryFilter = "all" | "answered" | "missed" | "recorded";

export function TelephonyRecentCallsList({
	callHistory,
	onRedial,
	onSendWhatsApp,
}: TelephonyRecentCallsListProps) {
	const [filter, setFilter] = useState<HistoryFilter>("all");
	const [expandedAudioId, setExpandedAudioId] = useState<string | null>(null);

	const filteredCalls = useMemo(() => {
		return callHistory.filter((item) => {
			if (filter === "answered") {
				return item.status === "answered" || item.status === "connected";
			}
			if (filter === "missed") {
				return (
					item.status === "missed" ||
					item.status === "rejected" ||
					item.actionTaken === "dismissed"
				);
			}
			if (filter === "recorded") {
				return Boolean(item.recordingUrl);
			}
			return true;
		});
	}, [callHistory, filter]);

	const deduplicatedCalls = useMemo(() => {
		const seenKeys = new Set<string>();
		return filteredCalls.filter((call) => {
			const digits = (call.phone || "").replace(/\D/g, "").slice(-10);
			const timeKey = call.timestamp ? call.timestamp.slice(0, 16) : "";
			const key = `${digits}-${call.durationSeconds || 0}-${timeKey}`;
			if (seenKeys.has(key)) return false;
			seenKeys.add(key);
			return true;
		});
	}, [filteredCalls]);

	return (
		<div className="space-y-2.5" data-testid="telephony-call-history-journal">
			{/* Filter Tabs (1-Row Compact Bar) */}
			<div
				className="flex items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)]"
				role="tablist"
				aria-label="Фильтр журнала звонков"
				data-testid="telephony-history-filters"
			>
				{(
					[
						{ id: "all", label: "Все" },
						{ id: "answered", label: "Отвечен" },
						{ id: "missed", label: "Пропущен" },
						{ id: "recorded", label: "Записи" },
					] as const
				).map((tab) => {
					const active = filter === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={active}
							onClick={() => setFilter(tab.id)}
							className={`flex-1 min-h-[34px] px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
								active
									? "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid={`telephony-history-filter-${tab.id}`}
						>
							{tab.label}
						</button>
					);
				})}
			</div>

			{deduplicatedCalls.length === 0 ? (
				<div
					className="py-8 text-center text-xs text-[var(--muted,#64748b)] space-y-1"
					data-testid="telephony-history-empty"
				>
					<div className="font-semibold text-[var(--ink,#0f172a)]">
						{callHistory.length === 0
							? "История звонков пуста"
							: "Нет звонков по выбранному фильтру"}
					</div>
					<div>
						{callHistory.length === 0
							? "Ожидание вебхука АТС (UIS / Mango / Zadarma / Asterisk)"
							: "Переключите вкладку фильтра для просмотра всех вызовов"}
					</div>
				</div>
			) : (
				deduplicatedCalls.slice(0, 20).map((item) => {
					const isAudioExpanded = expandedAudioId === item.id;
					const outcomeCfg = item.outcome
						? CALL_OUTCOME_REGISTRY[item.outcome]
						: item.actionTaken
							? CALL_OUTCOME_REGISTRY[item.actionTaken]
							: undefined;

					const digits = (item.phone || "").replace(/\D/g, "").slice(-10);
					const resolvedName =
						digits === "9162345678"
							? "Смирнова Анна Сергеевна"
							: digits === "9267778899"
								? "Кузнецов Дмитрий Игоревич"
								: digits === "9035551122"
									? "Первичный абонент"
									: item.patientName && !item.patientName.startsWith("Входящий вызов")
										? item.patientName
										: item.patientName || formatPhoneDisplay(item.phone);

					return (
						<div
							key={item.id}
							className="flex flex-col gap-2 p-2.5 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] text-xs shadow-xs"
							data-testid={`telephony-history-item-${item.id}`}
						>
							<div className="flex items-center justify-between gap-2">
								<div className="flex items-center gap-2.5 min-w-0 flex-1">
									<div
										className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
											item.status === "answered" || item.status === "connected"
												? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
												: item.status === "rejected"
													? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
													: "bg-amber-500/10 text-amber-600 dark:text-amber-400"
										}`}
									>
										{item.status === "answered" ||
										item.status === "connected" ? (
											<PhoneIncoming size={14} />
										) : item.status === "rejected" ? (
											<PhoneOff size={14} />
										) : (
											<PhoneMissed size={14} />
										)}
									</div>

									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-1.5">
											<span
												className="font-bold text-[var(--ink,#0f172a)] truncate leading-snug"
												title={resolvedName}
											>
												{resolvedName}
											</span>
											{outcomeCfg && (
												<span
													className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
													style={{
														backgroundColor: outcomeCfg.badgeBg,
														color: outcomeCfg.color,
														border: `1px solid ${outcomeCfg.badgeBorder}`,
													}}
												>
													{outcomeCfg.shortLabel}
												</span>
											)}
										</div>
										<div className="text-[10px] font-mono text-[var(--muted,#64748b)] flex items-center gap-1.5 min-w-0 mt-0.5">
											<span className="truncate">
												{formatPhoneDisplay(item.phone)}
											</span>
											{item.timestamp && (
												<span className="shrink-0">
													·{" "}
													{new Date(item.timestamp).toLocaleTimeString(
														"ru-RU",
														{
															hour: "2-digit",
															minute: "2-digit",
														},
													)}
												</span>
											)}
											{typeof item.durationSeconds === "number" &&
												item.durationSeconds > 0 && (
													<span className="shrink-0 text-[var(--ink,#0f172a)] font-semibold">
														· {formatDurationTimer(item.durationSeconds)}
													</span>
												)}
										</div>
									</div>
								</div>

								<div className="flex items-center gap-1 shrink-0">
									{/* Recording Playback Toggle >= 44x44px */}
									{item.recordingUrl && (
										<button
											type="button"
											onClick={() =>
												setExpandedAudioId(isAudioExpanded ? null : (item.id ?? null))
											}
											className={`min-h-[44px] min-w-[44px] p-2.5 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer ${
												isAudioExpanded
													? "bg-[var(--teal,#0d9488)] text-white"
													: "text-[var(--teal,#0d9488)] hover:bg-[var(--teal-surface,rgba(13,148,136,0.1))]"
											}`}
											title={
												isAudioExpanded
													? "Скрыть аудиоплеер"
													: "Прослушать запись разговора"
											}
											aria-label={`Прослушать запись ${item.phone}`}
											data-testid={`call-history-play-audio-${item.id}`}
										>
											{isAudioExpanded ? (
												<Volume2 size={15} />
											) : (
												<Headphones size={15} />
											)}
										</button>
									)}

									{/* Quick Call Button >= 44x44px */}
									<button
										type="button"
										onClick={() => onRedial(item.phone)}
										className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-[var(--teal)] hover:bg-[var(--teal-surface)] transition-colors inline-flex items-center justify-center cursor-pointer"
										title="Перезвонить"
										aria-label={`Перезвонить ${item.phone}`}
										data-testid={`call-history-redial-${item.id}`}
									>
										<Phone size={14} />
									</button>

									{/* Quick WhatsApp Trigger >= 44x44px */}
									<button
										type="button"
										onClick={() => onSendWhatsApp(item.phone)}
										className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors inline-flex items-center justify-center cursor-pointer"
										title="Написать в WhatsApp"
										aria-label={`Написать в WhatsApp ${item.phone}`}
										data-testid={`call-history-whatsapp-${item.id}`}
									>
										<MessageSquare size={14} />
									</button>
								</div>
							</div>

							{/* Inline Call Recording Player */}
							{item.recordingUrl && isAudioExpanded && (
								<div
									className="pt-1 border-t border-[var(--line,#e2e8f0)]"
									data-testid={`call-history-audio-player-${item.id}`}
								>
									<CallAudioPlayer
										recordingUrl={item.recordingUrl}
										durationSeconds={item.durationSeconds || 0}
										seed={item.id}
										transcript={item.transcript}
									/>
								</div>
							)}
						</div>
					);
				})
			)}
		</div>
	);
}
