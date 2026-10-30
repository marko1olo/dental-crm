/**
 * apps/web/src/components/telephony/TelephonyCallList.tsx
 *
 * DENTE Dental CRM — Telephony Studio: Master Call Log List.
 * Mandate 8b: Healthy modular component (~120-150 lines).
 */

import React from "react";
import {
	PhoneIncoming,
	PhoneMissed,
	PhoneOutgoing,
	Search,
	Volume2,
} from "lucide-react";
import {
	type TelephonyCatalogCall,
	type TelephonyFilterType,
	TELEPHONY_CALL_TYPES,
	TELEPHONY_FILTER_TABS,
	maskPhoneRu,
	formatCallDuration,
} from "./telephonyCatalogData";

export interface TelephonyCallListProps {
	calls: TelephonyCatalogCall[];
	selectedCallId: string;
	onSelectCall: (id: string) => void;
	searchQuery: string;
	onSearchChange: (query: string) => void;
	activeFilter: TelephonyFilterType;
	onFilterChange: (filter: TelephonyFilterType) => void;
	activeMobileTab: "journal" | "dialer";
}

export const TelephonyCallList: React.FC<TelephonyCallListProps> = ({
	calls,
	selectedCallId,
	onSelectCall,
	searchQuery,
	onSearchChange,
	activeFilter,
	onFilterChange,
	activeMobileTab,
}) => {
	return (
		<div
			className={`w-full sm:w-1/2 lg:w-5/12 border-b sm:border-b-0 sm:border-r border-[var(--line)] flex flex-col min-h-0 bg-[var(--paper)] ${
				activeMobileTab === "journal" ? "flex" : "hidden sm:flex"
			}`}
		>
			{/* Search & Filters */}
			<div className="p-3 border-b border-[var(--line)] bg-[var(--paper-strong)] space-y-2 shrink-0">
				<div className="relative flex items-center">
					<Search className="absolute left-3 w-4 h-4 text-[var(--ink-muted)] pointer-events-none" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Поиск по номеру или ФИО..."
						data-testid="telephony-search-input"
						className="w-full pl-10 pr-3 h-9 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-hidden focus:ring-1 focus:ring-[var(--teal,#0d9488)] transition-all"
					/>
				</div>

				<div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
					{TELEPHONY_FILTER_TABS.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => onFilterChange(tab.id)}
							className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all shrink-0 ${
								activeFilter === tab.id
									? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)]"
									: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-secondary)] hover:bg-[var(--paper-secondary)]"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{/* Call List (iOS Phone Recents Style) */}
			<div className="flex-1 overflow-y-auto space-y-1.5 p-2 bg-[var(--paper)]">
				{calls.length === 0 ? (
					<div className="p-8 text-center text-sm text-[var(--ink-muted)]">
						Звонков по заданным критериям не найдено
					</div>
				) : (
					calls.map((call) => {
						const isSelected = selectedCallId === call.id;
						const typeCfg = TELEPHONY_CALL_TYPES[call.callType];
						return (
							<button
								key={call.id}
								type="button"
								onClick={() => onSelectCall(call.id)}
								data-testid={`call-item-${call.id}`}
								className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 border ${
									isSelected
										? "bg-[var(--paper-secondary)] border-[var(--teal,#0d9488)]/50 ring-1 ring-[var(--teal,#0d9488)]/30 text-[var(--ink)]"
										: "bg-[var(--paper-strong)] border-[var(--line)] hover:bg-[var(--paper-secondary)]/70 text-[var(--ink)]"
								}`}
							>
								<div className="mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-[var(--paper-secondary)] border border-[var(--line)]">
									{typeCfg.isMissed ? (
										<PhoneMissed className="w-3.5 h-3.5 text-[var(--danger,#ef4444)]" />
									) : typeCfg.isIncoming ? (
										<PhoneIncoming className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
									) : (
										<PhoneOutgoing className="w-3.5 h-3.5 text-[var(--ink-secondary)]" />
									)}
								</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between gap-1 mb-0.5">
										<span className="text-sm font-semibold text-[var(--ink)] truncate">
											{call.callerName}
										</span>
										<span className="text-xs text-[var(--ink-muted)] shrink-0">
											{call.timestampText}
										</span>
									</div>
									<div className="text-xs text-[var(--ink-secondary)] font-mono truncate">
										{maskPhoneRu(call.phone)}
									</div>
									<div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
										<span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium border ${typeCfg.badgeClass}`}>
											{typeCfg.shortLabel}
										</span>
										{call.durationSeconds > 0 && (
											<span className="text-[10px] text-[var(--ink-muted)]">
												{formatCallDuration(call.durationSeconds)}
											</span>
										)}
										{call.hasRecording && (
											<span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--paper)] text-[var(--ink-secondary)] border border-[var(--line)] flex items-center gap-1">
												<Volume2 className="w-2.5 h-2.5" />
												Аудио
											</span>
										)}
									</div>
								</div>
							</button>
						);
					})
				)}
			</div>
		</div>
	);
};
