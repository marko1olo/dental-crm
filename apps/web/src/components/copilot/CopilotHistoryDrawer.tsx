/**
 * @file CopilotHistoryDrawer.tsx
 * @description Dialog history, session switcher, search & pin manager for Copilot (Mandate 8b <= 220 lines).
 */

import React from "react";
import {
	Check, MessageSquare, Pin, Plus, Search, Trash2, User, X
} from "lucide-react";
import { useCopilotStore, type CopilotThread } from "../../store/copilotStore";
import { showToast } from "../GlobalToast";

export interface CopilotHistoryDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	onSelectThread: (threadId: string) => void;
}

export function CopilotHistoryDrawer({ isOpen, onClose, onSelectThread }: CopilotHistoryDrawerProps) {
	const threads = useCopilotStore((s) => s.threads);
	const activeThreadId = useCopilotStore((s) => s.activeThreadId);
	const searchQuery = useCopilotStore((s) => s.threadSearchQuery);
	const setSearchQuery = useCopilotStore((s) => s.setThreadSearchQuery);
	const createThread = useCopilotStore((s) => s.createThread);
	const deleteThread = useCopilotStore((s) => s.deleteThread);
	const togglePinThread = useCopilotStore((s) => s.togglePinThread);

	React.useEffect(() => {
		if (!isOpen) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const filteredThreads = threads.filter((t) => {
		const q = searchQuery.toLowerCase().trim();
		if (!q) return true;
		return (
			t.title.toLowerCase().includes(q) ||
			(t.patientName && t.patientName.toLowerCase().includes(q)) ||
			(t.previewText && t.previewText.toLowerCase().includes(q))
		);
	});

	const pinnedThreads = filteredThreads.filter((t) => t.pinned);
	const otherThreads = filteredThreads.filter((t) => !t.pinned);

	const handleCreateNew = () => {
		const newId = createThread("Новый пациент", "Клинический диалог");
		onSelectThread(newId);
		showToast("Создан новый диалог с ассистентом", "success");
	};

	const renderThreadCard = (thread: CopilotThread) => {
		const isActive = thread.id === activeThreadId;
		return (
			<div
				key={thread.id}
				onClick={() => onSelectThread(thread.id)}
				className={`p-3 rounded-xl border text-xs cursor-pointer transition-all space-y-1.5 ${
					isActive
						? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.1))] shadow-xs"
						: "border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft,#f8fafc)]"
				}`}
			>
				<div className="flex items-center justify-between gap-2">
					<span className="font-bold text-[var(--ink)] truncate min-w-0">{thread.title}</span>
					<div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
						<button
							type="button"
							onClick={() => togglePinThread(thread.id)}
							className={`w-7 h-7 flex items-center justify-center rounded-lg bg-transparent hover:bg-[var(--line)] transition-colors cursor-pointer ${
								thread.pinned ? "text-[var(--teal,#0d9488)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							title={thread.pinned ? "Открепить" : "Закрепить"}
						>
							<Pin size={13} className={thread.pinned ? "fill-current" : ""} />
						</button>
						<button
							type="button"
							onClick={() => {
								deleteThread(thread.id);
								showToast("Диалог удален из истории", "info");
							}}
							className="w-7 h-7 flex items-center justify-center rounded-lg bg-transparent hover:bg-rose-500/10 text-[var(--muted)] hover:text-rose-500 transition-colors cursor-pointer"
							title="Удалить диалог"
						>
							<Trash2 size={13} />
						</button>
					</div>
				</div>

				{thread.previewText && (
					<p className="text-[11px] text-[var(--muted)] m-0 truncate leading-relaxed">
						{thread.previewText}
					</p>
				)}

				<div className="flex items-center justify-between text-[10px] text-[var(--muted)] pt-1 border-t border-[var(--line)]/50">
					{thread.patientName ? (
						<span className="flex items-center gap-1 truncate font-medium">
							<User size={10} className="text-[var(--teal,#0d9488)]" />
							<span>{thread.patientName}</span>
						</span>
					) : (
						<span>Общий приём</span>
					)}
					<span>{thread.updatedAt}</span>
				</div>
			</div>
		);
	};

	return (
		<div className="fixed inset-0 z-[99995] flex items-center justify-center p-3 max-md:p-0 max-md:items-end">
			<div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
			<div className="relative z-10 w-full max-w-md max-h-[88vh] flex flex-col bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-2xl max-md:rounded-b-none border border-[var(--line)] shadow-2xl overflow-hidden">
				{/* Шапка истории */}
				<header className="px-5 py-3.5 border-b border-[var(--line)] flex items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2 min-w-0">
						<MessageSquare size={16} className="text-[var(--teal,#0d9488)]" />
						<h3 className="text-sm font-bold text-[var(--ink)] m-0">История диалогов</h3>
						<span className="text-[11px] text-[var(--muted)]">({threads.length})</span>
					</div>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={handleCreateNew}
							className="primary-button text-[11px] font-bold h-8 px-2.5 rounded-lg bg-[var(--teal,#0d9488)] text-white hover:opacity-95 shadow-xs flex items-center gap-1 cursor-pointer"
						>
							<Plus size={13} />
							<span>Новый диалог</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="icon-button w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--line)] hover:bg-[var(--line)] cursor-pointer"
							aria-label="Закрыть"
						>
							<X size={15} />
						</button>
					</div>
				</header>

				{/* Поиск по диалогам */}
				<div className="px-5 py-2.5 border-b border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] shrink-0">
					<div className="relative">
						<Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по диалогам и пациентам..."
							className="w-full h-8 pl-8 pr-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[11px] text-[var(--ink)] focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
						/>
					</div>
				</div>

				{/* Список диалогов */}
				<div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
					{pinnedThreads.length > 0 && (
						<div className="space-y-1.5">
							<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--teal,#0d9488)] flex items-center gap-1">
								<Pin size={10} />
								<span>Закрепленные</span>
							</div>
							{pinnedThreads.map(renderThreadCard)}
						</div>
					)}

					<div className="space-y-1.5">
						{pinnedThreads.length > 0 && otherThreads.length > 0 && (
							<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] pt-1">
								<span>Все сессии</span>
							</div>
						)}
						{otherThreads.length === 0 && pinnedThreads.length === 0 ? (
							<div className="p-8 text-center text-[var(--muted)] border border-dashed border-[var(--line)] rounded-xl">
								<p className="m-0">Диалогов не найдено</p>
							</div>
						) : (
							otherThreads.map(renderThreadCard)
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
