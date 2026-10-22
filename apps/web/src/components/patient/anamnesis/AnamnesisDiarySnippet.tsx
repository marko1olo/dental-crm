/**
 * AnamnesisDiarySnippet.tsx — Предпросмотр записи клинического анамнеза для медицинской карты приёма.
 */

import React from "react";
import { Copy } from "lucide-react";

export interface AnamnesisDiarySnippetProps {
	readonly diaryText: string;
	readonly onSyncToDiary: () => void;
}

export const AnamnesisDiarySnippet: React.FC<AnamnesisDiarySnippetProps> = ({
	diaryText,
	onSyncToDiary,
}) => {
	return (
		<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/50 border border-[var(--line,#e2e8f0)] dark:border-slate-700 flex flex-col gap-1.5">
			<div className="flex items-center justify-between">
				<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
					Предпросмотр записи для медицинской карты (Дневник приёма):
				</span>
				<button
					type="button"
					onClick={onSyncToDiary}
					className="text-xs font-bold text-[var(--teal,#0d9488)] hover:underline inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer min-h-[32px] px-2 select-none"
				>
					<Copy className="w-3.5 h-3.5" />
					<span>Скопировать</span>
				</button>
			</div>
			<div className="p-2.5 rounded-lg bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[11.5px] font-mono text-[var(--ink,#0f172a)] dark:text-slate-200 border border-[var(--line,#e2e8f0)] dark:border-slate-700 whitespace-pre-wrap select-all">
				{diaryText}
			</div>
		</div>
	);
};
