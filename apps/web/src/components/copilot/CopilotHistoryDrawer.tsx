/**
 * @file CopilotHistoryDrawer.tsx
 * @description Dialog history, date grouping (Сегодня, Вчера, Ранее),
 * message text search, session switcher & pin manager (Mandate 8b <= 300 lines).
 */

import React, { useEffect, useState } from "react";
import {
	Calendar, MessageSquare, Pin, Plus, Search, Trash2, User, X
} from "lucide-react";
import { useCopilotStore, type CopilotThread } from "../../store/copilotStore";
import { fetchRemoteSessions } from "../../store/copilotSessionApi";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { showToast } from "../GlobalToast";

export interface CopilotHistoryDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	onSelectThread: (threadId: string) => void;
}

export function getThreadDateCategory(thread: {
	id?: string | undefined;
	title?: string | undefined;
	pinned?: boolean | undefined;
	createdAt?: string | undefined;
	updatedAt?: string | undefined;
}): "pinned" | "today" | "yesterday" | "earlier" {
	if (thread.pinned) return "pinned";
	const now = new Date();
	const todayStr = now.toISOString().slice(0, 10);
	const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	const yesterdayStr = yesterday.toISOString().slice(0, 10);

	if (thread.createdAt) {
		const threadDateStr = thread.createdAt.slice(0, 10);
		if (threadDateStr === todayStr) return "today";
		if (threadDateStr === yesterdayStr) return "yesterday";
		return "earlier";
	}
	if (thread.updatedAt) {
		const threadDateStr = thread.updatedAt.slice(0, 10);
		if (threadDateStr === todayStr) return "today";
		if (threadDateStr === yesterdayStr) return "yesterday";
		if (/^\d{1,2}:\d{2}/.test(thread.updatedAt)) return "today";
		if (thread.updatedAt.toLowerCase().includes("вчера")) return "yesterday";
	}
	return "earlier";
}

export function CopilotHistoryDrawer({ isOpen, onClose, onSelectThread }: CopilotHistoryDrawerProps) {
	const threads = useCopilotStore((s) => s.threads);
	const threadMessages = useCopilotStore((s) => s.threadMessages);
	const activeThreadId = useCopilotStore((s) => s.activeThreadId);
	const searchQuery = useCopilotStore((s) => s.threadSearchQuery);
	const setSearchQuery = useCopilotStore((s) => s.setThreadSearchQuery);
	const createThread = useCopilotStore((s) => s.createThread);
	const deleteThread = useCopilotStore((s) => s.deleteThread);
	const clearThreads = useCopilotStore((s) => s.clearThreads);
	const togglePinThread = useCopilotStore((s) => s.togglePinThread);

	const [isConfirmingClear, setIsConfirmingClear] = useState(false);
	const [remoteThreads, setRemoteThreads] = useState<CopilotThread[]>([]);

	useEffect(() => {
		const trimmed = searchQuery.trim();
		if (!isOpen || isDemoShowcaseMode() || !trimmed) { setRemoteThreads([]); return; }
		let active = true;
		const timer = setTimeout(() => {
			void fetchRemoteSessions({ q: trimmed }).then((res) => { if (active && Array.isArray(res)) setRemoteThreads(res); });
		}, 250);
		return () => { active = false; clearTimeout(timer); };
	}, [isOpen, searchQuery]);

	useEffect(() => {
		if (!isOpen) return;
		const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const localFiltered = threads.filter((t) => {
		const q = searchQuery.toLowerCase().trim();
		if (!q) return true;
		const inTitle = t.title.toLowerCase().includes(q);
		const inPatient = Boolean(t.patientName && t.patientName.toLowerCase().includes(q));
		const inPreview = Boolean(t.previewText && t.previewText.toLowerCase().includes(q));
		const inMessages = (threadMessages[t.id] || []).some((m) => String(m.text || m.content || "").toLowerCase().includes(q));
		return inTitle || inPatient || inPreview || inMessages;
	});
	const existingIds = new Set(localFiltered.map((t) => t.id));
	const filteredThreads = searchQuery.trim()
		? [...localFiltered, ...remoteThreads.filter((r) => !existingIds.has(r.id))]
		: localFiltered;

	const pinnedThreads = filteredThreads.filter((t) => t.pinned);
	const unpinned = filteredThreads.filter((t) => !t.pinned);
	const todayThreads = unpinned.filter((t) => getThreadDateCategory(t) === "today");
	const yesterdayThreads = unpinned.filter((t) => getThreadDateCategory(t) === "yesterday");
	const earlierThreads = unpinned.filter((t) => getThreadDateCategory(t) === "earlier");

	const handleCreateNew = () => {
		const newId = createThread("Новый пациент", "Клинический диалог");
		onSelectThread(newId);
	};

	const renderThreadCard = (thread: CopilotThread) => {
		const isActive = thread.id === activeThreadId;
		const btnCls =
			"min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-transparent transition-colors cursor-pointer";
		const cardCls = isActive
			? "border-[var(--primary)] bg-[var(--primary-soft)] shadow-xs"
			: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)]";
		return (
			<div key={thread.id} className={`p-3 rounded-xl border text-xs transition-all space-y-1.5 ${cardCls}`}>
				<div className="flex items-center justify-between gap-2">
					<button
						type="button" onClick={() => onSelectThread(thread.id)}
						className="font-bold text-[var(--ink)] truncate min-w-0 flex-1 text-left bg-transparent border-0 p-0 cursor-pointer"
					>{thread.title}</button>
					<div className="flex items-center gap-0.5 shrink-0">
						<button
							type="button" onClick={() => togglePinThread(thread.id)}
							className={`${btnCls} hover:bg-[var(--line)] ${thread.pinned ? "text-[var(--primary)]" : "text-[var(--muted)]"}`}
							title={thread.pinned ? "Открепить" : "Закрепить"}
							aria-label={thread.pinned ? "Открепить" : "Закрепить"}
						>
							<span className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent">
								<Pin size={14} className={thread.pinned ? "fill-current" : ""} />
							</span>
						</button>
						<button
							type="button"
							onClick={() => { deleteThread(thread.id); showToast("Диалог удален из истории", "info"); }}
							className={`${btnCls} hover:bg-[var(--danger-soft)] text-[var(--muted)] hover:text-[var(--danger)]`}
							title="Удалить диалог" aria-label="Удалить диалог"
						>
							<span className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent">
								<Trash2 size={14} />
							</span>
						</button>
					</div>
				</div>
				<button type="button" onClick={() => onSelectThread(thread.id)} className="w-full text-left bg-transparent border-0 p-0 cursor-pointer space-y-1.5">
					{thread.previewText && <p className="text-[11px] text-[var(--muted)] m-0 truncate leading-relaxed">{thread.previewText}</p>}
					<div className="flex items-center justify-between text-[10px] text-[var(--muted)] pt-1 border-t border-[var(--line)]/50">
						{thread.patientName ? (
							<span className="flex items-center gap-1 truncate font-medium">
								<User size={10} className="text-[var(--primary)] shrink-0" />
								<span>{thread.patientName}</span>
							</span>
						) : <span>Общий приём</span>}
						<span>{thread.updatedAt}</span>
					</div>
				</button>
			</div>
		);
	};

	return (
		<div className="fixed inset-0 z-[99995] flex items-center justify-center p-3 max-md:p-0 max-md:items-end" data-testid="copilot-history-drawer">
			<div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
			<div
				className={[
					"relative z-10 w-full max-w-md max-h-[88vh] flex flex-col bg-[var(--paper)] text-[var(--ink)]",
					"rounded-2xl max-md:rounded-b-none max-md:rounded-t-[24px] border border-[var(--line)] shadow-2xl overflow-hidden",
				].join(" ")}
			>
				<div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0"><div className="w-9 h-1.5 touch-none rounded-full bg-[var(--line)]" /></div>
				<header className="px-5 py-3.5 border-b border-[var(--line)] flex items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2 min-w-0">
						<MessageSquare size={16} className="text-[var(--primary)]" />
						<h3 className="text-sm font-bold text-[var(--ink)] m-0">История диалогов</h3>
						<span className="text-[11px] text-[var(--muted)]">({threads.length})</span>
					</div>
					<div className="flex items-center gap-1.5">
						<button
							type="button" onClick={handleCreateNew}
							className={[
								"primary-button text-xs sm:text-sm font-medium h-11 sm:h-9 px-3 rounded-xl sm:rounded-lg",
								"bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-xs flex items-center gap-1.5 cursor-pointer",
							].join(" ")}
						>
							<Plus size={14} /><span>Новый диалог</span>
						</button>
						<button
							type="button" onClick={onClose}
							className={[
								"icon-button min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px]",
								"w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl sm:rounded-lg",
								"border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer",
							].join(" ")}
							aria-label="Закрыть"
						>
							<X size={16} />
						</button>
					</div>
				</header>

				<div className="px-5 py-2.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="relative">
						<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
						<input
							type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск по диалогам, сообщениям и пациентам..."
							style={{ paddingLeft: "38px" }}
							className="w-full h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] pl-10 pr-3 rounded-xl sm:rounded-lg border border-[var(--line)] bg-[var(--paper)] text-sm sm:text-xs text-[var(--ink)]"
						/>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
					{pinnedThreads.length > 0 && (
						<div className="space-y-1.5">
							<div className="text-[10px] font-semibold text-[var(--primary)] flex items-center gap-1"><Pin size={10} /><span>Закрепленные</span></div>
							{pinnedThreads.map(renderThreadCard)}
						</div>
					)}
					{todayThreads.length > 0 && (
						<div className="space-y-1.5">
							<div className="text-[10px] font-semibold text-[var(--muted)] flex items-center gap-1 pt-1"><Calendar size={10} /><span>Сегодня</span></div>
							{todayThreads.map(renderThreadCard)}
						</div>
					)}
					{yesterdayThreads.length > 0 && (
						<div className="space-y-1.5">
							<div className="text-[10px] font-semibold text-[var(--muted)] flex items-center gap-1 pt-1"><Calendar size={10} /><span>Вчера</span></div>
							{yesterdayThreads.map(renderThreadCard)}
						</div>
					)}
					{earlierThreads.length > 0 && (
						<div className="space-y-1.5">
							<div className="text-[10px] font-semibold text-[var(--muted)] flex items-center gap-1 pt-1"><Calendar size={10} /><span>Ранее</span></div>
							{earlierThreads.map(renderThreadCard)}
						</div>
					)}
					{filteredThreads.length === 0 && (
						<div className="p-8 text-center text-[var(--muted)] border border-dashed border-[var(--line)] rounded-xl">
							<p className="m-0">Диалогов не найдено</p>
						</div>
					)}
				</div>

				<footer className="px-5 py-2.5 max-md:pb-[calc(10px+env(safe-area-inset-bottom,0px))] border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between text-xs shrink-0">
					{isConfirmingClear ? (
						<div className="flex items-center justify-between w-full gap-2">
							<span className="text-[var(--danger)] font-semibold text-xs">Очистить все диалоги?</span>
							<div className="flex items-center gap-1.5">
								<button
									type="button" onClick={() => setIsConfirmingClear(false)}
									className="h-11 sm:h-8 min-h-[44px] sm:min-h-[32px] px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-medium cursor-pointer"
								>
									Отмена
								</button>
								<button
									type="button"
									onClick={() => { clearThreads(); setIsConfirmingClear(false); showToast("Вся история диалогов очищена", "info"); }}
									className="h-11 sm:h-8 min-h-[44px] sm:min-h-[32px] px-3 rounded-lg bg-[var(--danger)] text-white font-medium text-xs cursor-pointer"
								>
									Да, очистить
								</button>
							</div>
						</div>
					) : (
						<button
							type="button" onClick={() => setIsConfirmingClear(true)}
							className="min-h-[44px] sm:min-h-[32px] px-2.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--danger)] cursor-pointer bg-transparent border-0 inline-flex items-center"
						>
							Очистить историю
						</button>
					)}
					<span className="text-xs text-[var(--muted)] whitespace-nowrap">Сессий: {threads.length}</span>
				</footer>
			</div>
		</div>
	);
}
