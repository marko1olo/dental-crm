import {
	buildGoogleCalendarSubscriptionUrl,
	buildWebcalUrl,
	buildYandexCalendarSubscriptionUrl,
} from "@dental/shared";
import {
	Check,
	CheckCircle2,
	Copy,
	ExternalLink,
	Globe,
	Lock,
	Smartphone,
} from "lucide-react";
import React from "react";

export interface CalendarFeedData {
	doctorId: string;
	doctorName: string;
	feedUrl: string;
	webcalUrl: string;
	tokenVersion: number;
	tokenCreatedAt?: string | null;
}

export interface DoctorCalendarSyncLinksProps {
	feedData: CalendarFeedData;
	copiedKey: "feed" | "webcal" | null;
	onCopy: (text: string, key: "feed" | "webcal") => void;
}

export function DoctorCalendarSyncLinks({
	feedData,
	copiedKey,
	onCopy,
}: DoctorCalendarSyncLinksProps) {
	const origin = typeof window !== "undefined" ? window.location.origin : "";
	const fullFeedUrl = `${origin}${feedData.feedUrl}`;
	const webcalUrl = buildWebcalUrl(feedData.feedUrl, origin);
	const yandexUrl = buildYandexCalendarSubscriptionUrl(
		feedData.feedUrl,
		origin,
	);
	const googleUrl = buildGoogleCalendarSubscriptionUrl(
		feedData.feedUrl,
		origin,
	);

	return (
		<div className="space-y-4">
			<div>
				<div className="flex items-center justify-between mb-1.5">
					<label
						htmlFor="calendar-feed-url-input"
						className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5"
					>
						<Lock className="w-3.5 h-3.5 text-amber-500" />
						<span>Персональная ссылка подписки (iCalendar / webcal)</span>
					</label>
					<span className="text-[10px] font-mono text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f8fafc)] px-2 py-0.5 rounded-md border border-[var(--line,#e2e8f0)]">
						Версия ключа: v{feedData.tokenVersion}
					</span>
				</div>
				<div className="flex gap-2">
					<input
						id="calendar-feed-url-input"
						type="text"
						readOnly
						value={webcalUrl || fullFeedUrl}
						className="flex-1 min-h-[44px] px-3 font-mono text-xs rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] select-all focus:outline-hidden"
						data-testid="calendar-feed-url-input"
					/>
					<button
						type="button"
						onClick={() => onCopy(webcalUrl || fullFeedUrl, "feed")}
						className="min-h-[44px] px-4 rounded-xl font-medium text-xs bg-[var(--teal-dark,var(--brand-primary))] text-white hover:opacity-90 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
						data-testid="copy-calendar-link-btn"
					>
						{copiedKey === "feed" ? (
							<>
								<Check className="w-4 h-4 text-emerald-300" />
								<span>Скопировано</span>
							</>
						) : (
							<>
								<Copy className="w-4 h-4" />
								<span>Копировать</span>
							</>
						)}
					</button>
				</div>
			</div>

			<div>
				<div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] mb-2">
					Быстрое подключение календаря
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
					<a
						href={yandexUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="p-3 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-700 dark:text-red-300 flex flex-col items-center justify-center gap-1 text-center transition-all group"
					>
						<div className="flex items-center gap-1.5 font-bold text-xs">
							<span>Яндекс Календарь</span>
							<ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
						</div>
						<span className="text-[10px] text-[var(--muted,#64748b)]">
							Добавить подписку
						</span>
					</a>

					<a
						href={webcalUrl}
						className="p-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 hover:bg-sky-500/10 text-sky-700 dark:text-sky-300 flex flex-col items-center justify-center gap-1 text-center transition-all group"
					>
						<div className="flex items-center gap-1.5 font-bold text-xs">
							<Smartphone className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
							<span>Apple Calendar</span>
						</div>
						<span className="text-[10px] text-[var(--muted,#64748b)]">
							iPhone, iPad, Mac
						</span>
					</a>

					<a
						href={googleUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="p-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-700 dark:text-blue-300 flex flex-col items-center justify-center gap-1 text-center transition-all group"
					>
						<div className="flex items-center gap-1.5 font-bold text-xs">
							<Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
							<span>Google Календарь</span>
						</div>
						<span className="text-[10px] text-[var(--muted,#64748b)]">
							Веб и Android
						</span>
					</a>
				</div>
			</div>

			<div className="p-3.5 rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs text-[var(--ink,#0f172a)] space-y-2">
				<div className="font-bold flex items-center gap-1.5 text-xs text-[var(--ink,#0f172a)]">
					<CheckCircle2 className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
					<span>Как это работает:</span>
				</div>
				<ul className="list-disc list-inside space-y-1 text-[11px] text-[var(--muted,#64748b)]">
					<li>Календарь автоматически синхронизируется каждые 15 минут.</li>
					<li>Переносы, отмены и новые записи обновляются автоматически.</li>
					<li>События содержат напоминания за 15 минут до начала приёма.</li>
				</ul>
			</div>
		</div>
	);
}
