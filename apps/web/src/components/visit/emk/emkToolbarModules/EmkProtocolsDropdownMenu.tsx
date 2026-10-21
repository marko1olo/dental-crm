import React from "react";
import { createPortal } from "react-dom";
import { Activity, FileText, Pill, Printer, Redo2, ShieldCheck, Sparkles, Undo2 } from "lucide-react";
import { EmkDropdownNormItems } from "./EmkDropdownNormItems";

export interface EmkProtocolsDropdownMenuProps {
	isOpen: boolean;
	dropdownPos: { top: number; left: number } | null;
	menuRef: React.RefObject<HTMLDivElement | null>;
	onClose: () => void;
	onApplyNorm?: (() => void) | undefined;
	onApplyPhysiologicalNorm?: (() => void) | undefined;
	onApplyOrthoNorm?: (() => void) | undefined;
	onApplySurgeryNorm?: (() => void) | undefined;
	onToggleStarProtocols?: (() => void) | undefined;
	onOpenConsent?: (() => void) | undefined;
	onPrint043?: (() => void) | undefined;
	canUndo: boolean; canRedo: boolean;
	handleUndo: () => void; handleRedo: () => void;
}

export function EmkProtocolsDropdownMenu({
	isOpen, dropdownPos, menuRef, onClose, onApplyNorm, onApplyPhysiologicalNorm,
	onApplyOrthoNorm, onApplySurgeryNorm, onToggleStarProtocols, onOpenConsent,
	onPrint043, canUndo, canRedo, handleUndo, handleRedo,
}: EmkProtocolsDropdownMenuProps) {
	if (!isOpen || !dropdownPos || typeof document === "undefined") return null;

	return createPortal(
		<div
			ref={menuRef as any}
			className="fixed z-[9999] flex flex-col gap-0.5 p-1.5 bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl shadow-2xl min-w-[260px] text-xs text-[var(--ink)] animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md"
			style={{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px` }}
			role="menu"
			aria-hidden={!isOpen}
		>
			<EmkDropdownNormItems
				onClose={onClose}
				onApplyNorm={onApplyNorm}
				onApplyPhysiologicalNorm={onApplyPhysiologicalNorm}
				onApplyOrthoNorm={onApplyOrthoNorm}
				onApplySurgeryNorm={onApplySurgeryNorm}
			/>

			<div className="h-px bg-[var(--line)] my-1" />

			<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
				Клинические пространства
			</div>

			<button
				type="button"
				data-testid="btn-open-perio-chart-toolbar"
				onClick={() => {
					window.dispatchEvent(new CustomEvent("dente:open-perio-modal"));
					onClose();
				}}
				className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] flex items-center gap-2 cursor-pointer transition-colors"
			>
				<Activity className="w-3.5 h-3.5 text-rose-500 shrink-0" />
				<span>Пародонтограмма (Florida Probe)</span>
			</button>

			<button
				type="button"
				data-testid="btn-open-prescriptions-toolbar"
				onClick={() => {
					window.dispatchEvent(new CustomEvent("dente:open-prescriptions"));
					onClose();
				}}
				className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] flex items-center gap-2 cursor-pointer transition-colors"
			>
				<Pill className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
				<span>Выписать рецепт на лекарства</span>
			</button>

			<button
				type="button"
				data-testid="btn-open-implant-passport-toolbar"
				onClick={() => {
					window.dispatchEvent(new CustomEvent("dente:open-implant-passport"));
					onClose();
				}}
				className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] flex items-center gap-2 cursor-pointer transition-colors"
			>
				<FileText className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
				<span>Паспорт имплантата</span>
			</button>

			<div className="h-px bg-[var(--line)] my-1" />

			<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
				Справочники и согласие
			</div>

			{onToggleStarProtocols && (
				<button
					type="button"
					data-testid="btn-toggle-star-protocols-toolbar"
					onClick={() => { onToggleStarProtocols(); onClose(); }}
					className="w-full text-left px-2.5 py-1.5 rounded-lg font-semibold text-[var(--teal-ink,var(--teal))] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
				>
					<Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" />
					<span>Клинические протоколы</span>
				</button>
			)}

			{onOpenConsent && (
				<button
					type="button"
					data-testid="btn-open-consent-toolbar"
					onClick={() => { onOpenConsent(); onClose(); }}
					className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] flex items-center gap-2 cursor-pointer transition-colors"
				>
					<ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
					<span>Согласие пациента (ИДС)</span>
				</button>
			)}

			{onPrint043 && (
				<button
					type="button"
					data-testid="btn-print-043u-toolbar"
					onClick={() => { onPrint043(); onClose(); }}
					className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] flex items-center gap-2 cursor-pointer transition-colors"
				>
					<Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
					<span>Печать медицинской карты</span>
				</button>
			)}

			<div className="h-px bg-[var(--line)] my-1" />

			<button
				type="button"
				onClick={() => { handleUndo(); onClose(); }}
				disabled={!canUndo}
				className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] flex items-center justify-between cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
			>
				<span className="flex items-center gap-2">
					<Undo2 size={13} className="shrink-0" />
					<span>Отменить ввод</span>
				</span>
				<kbd className="text-[10px] font-mono text-[var(--muted)]">Ctrl+Z</kbd>
			</button>

			<button
				type="button"
				onClick={() => { handleRedo(); onClose(); }}
				disabled={!canRedo}
				className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] flex items-center justify-between cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
			>
				<span className="flex items-center gap-2">
					<Redo2 size={13} className="shrink-0" />
					<span>Вернуть ввод</span>
				</span>
				<kbd className="text-[10px] font-mono text-[var(--muted)]">Ctrl+Y</kbd>
			</button>
		</div>,
		document.body,
	);
}
