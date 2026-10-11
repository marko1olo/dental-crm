/**
 * DENTE CRM — Consultation Notes Side Panel (Layer 4)
 * Directed Acyclic Graph (DAG): Layer 4 (Presentation Subcomponent)
 * Displays consilium discussion notes, multidisciplinary treatment recommendations,
 * and quick addition of Form 043/u clinical notes.
 */

import React, { useState } from "react";
import { MessageSquare, Plus, CheckCircle2, X } from "lucide-react";
import type { ConsultationNoteItem } from "./types.js";
import { CONSULTATION_ROLE_COLORS, CONSULTATION_ROLE_LABELS } from "./consultationConstants.js";

export interface ConsultationNotesSidePanelProps {
	readonly isOpen: boolean;
	readonly notes: readonly ConsultationNoteItem[];
	readonly activeToothFdi?: string | number | undefined;
	readonly onClose: () => void;
	readonly onAddNote: (text: string) => void;
}

export const ConsultationNotesSidePanel: React.FC<ConsultationNotesSidePanelProps> = ({
	isOpen,
	notes,
	activeToothFdi,
	onClose,
	onAddNote,
}) => {
	const [inputText, setInputText] = useState("");

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!inputText.trim()) return;
		onAddNote(inputText);
		setInputText("");
	};

	return (
		<aside
			data-testid="consultation-notes-side-panel"
			className="w-80 border-l border-slate-800 bg-slate-950/95 flex flex-col z-20 shadow-2xl backdrop-blur-md animate-in slide-in-from-right duration-200"
		>
			{/* Header */}
			<div className="h-10 px-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
				<div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
					<MessageSquare className="w-3.5 h-3.5 text-teal-400" />
					<span>Консилиум: Заключение</span>
					{activeToothFdi && (
						<span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-teal-950/80 text-teal-300 border border-teal-800/60">
							№{activeToothFdi}
						</span>
					)}
				</div>
				<button
					type="button"
					onClick={onClose}
					className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
					title="Закрыть панель"
				>
					<X className="w-3.5 h-3.5" />
				</button>
			</div>

			{/* Notes list */}
			<div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
				{notes.map((note) => {
					const roleColor = CONSULTATION_ROLE_COLORS[note.authorRole] || "#06b6d4";
					const roleLabel = CONSULTATION_ROLE_LABELS[note.authorRole] || "Врач";

					return (
						<div
							key={note.id}
							className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-900/50 hover:border-slate-700 transition-colors"
						>
							<div className="flex items-center justify-between mb-1">
								<div className="flex items-center gap-1.5">
									<span
										className="w-2 h-2 rounded-full flex-shrink-0"
										style={{ backgroundColor: roleColor }}
									/>
									<span className="font-semibold text-slate-200 truncate max-w-[130px]">
										{note.authorName}
									</span>
								</div>
								<span className="text-[10px] font-mono text-slate-400">{note.timestamp}</span>
							</div>

							<div className="text-[10px] font-medium text-slate-400 mb-1.5">{roleLabel}</div>

							<p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap">
								{note.text}
							</p>

							{note.targetTooth && (
								<div className="mt-2 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
									<span>Зуб: FDI #{note.targetTooth}</span>
									<span className="flex items-center gap-1 text-emerald-400">
										<CheckCircle2 className="w-3 h-3" /> Согласовано
									</span>
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Input form */}
			<form onSubmit={handleSubmit} className="p-2.5 border-t border-slate-800 bg-slate-900/60">
				<textarea
					value={inputText}
					onChange={(e) => setInputText(e.target.value)}
					placeholder="Добавить врачебное заключение..."
					className="w-full h-16 p-2 rounded-md bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs resize-none focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
				/>
				<div className="mt-1.5 flex items-center justify-end">
					<button
						type="submit"
						className="px-3 py-1 rounded text-xs font-medium bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
					>
						<Plus className="w-3 h-3" />
						<span>Добавить</span>
					</button>
				</div>
			</form>
		</aside>
	);
};
