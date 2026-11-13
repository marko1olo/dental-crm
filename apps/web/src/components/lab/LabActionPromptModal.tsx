import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export interface LabPromptHeaderProps {
	readonly title: string;
	readonly icon?: React.ReactNode;
	readonly isDanger?: boolean;
	readonly onClose: () => void;
}

export function LabPromptHeader({
	title,
	icon,
	isDanger,
	onClose,
}: LabPromptHeaderProps) {
	return (
		<div
			className={`flex items-center justify-between px-4 py-3 border-b border-[var(--line,#cbd5e1)] ${isDanger ? "bg-rose-500/10" : "bg-[var(--paper-soft,#f8fafc)]"}`}
		>
			<div className="flex items-center gap-2.5 min-w-0">
				{icon && (
					<div
						className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${isDanger ? "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400" : "bg-teal-500/10 border-teal-500/25 text-teal-600 dark:text-teal-400"}`}
					>
						{icon}
					</div>
				)}
				<h3
					id="lab-prompt-modal-title"
					className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] m-0 truncate"
				>
					{title}
				</h3>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="min-h-[32px] min-w-[32px] rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] flex items-center justify-center transition-colors cursor-pointer"
				aria-label="Закрыть"
			>
				<X className="w-4 h-4" />
			</button>
		</div>
	);
}

export interface LabPromptQuickPresetsProps {
	readonly quickPresets: string[];
	readonly value: string;
	readonly onSelect: (preset: string) => void;
}

export function LabPromptQuickPresets({
	quickPresets,
	value,
	onSelect,
}: LabPromptQuickPresetsProps) {
	if (!quickPresets || quickPresets.length === 0) return null;

	return (
		<div className="space-y-1.5 pt-0.5">
			<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">
				Быстрый выбор причины:
			</span>
			<div className="flex flex-wrap gap-1.5">
				{quickPresets.map((preset) => (
					<button
						key={preset}
						type="button"
						onClick={() => onSelect(preset)}
						className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer text-left ${
							value === preset
								? "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 font-bold"
								: "bg-[var(--paper-soft,#f1f5f9)] hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] border-[var(--line,#cbd5e1)]"
						}`}
					>
						{preset}
					</button>
				))}
			</div>
		</div>
	);
}

export interface LabPromptInputProps {
	readonly multiline?: boolean | undefined;
	readonly placeholder?: string | undefined;
	readonly value: string;
	readonly onChange: (val: string) => void;
	readonly onSubmit: () => void;
	readonly onClose: () => void;
	readonly inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}

export function LabPromptInput({
	multiline,
	placeholder,
	value,
	onChange,
	onSubmit,
	onClose,
	inputRef,
}: LabPromptInputProps) {
	return (
		<div className="space-y-1">
			{multiline ? (
				<textarea
					ref={inputRef as React.RefObject<HTMLTextAreaElement>}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
							e.preventDefault();
							onSubmit();
						} else if (e.key === "Escape") {
							e.preventDefault();
							onClose();
						}
					}}
					rows={4}
					placeholder={placeholder}
					className="w-full p-2.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] focus:ring-2 focus:ring-teal-500 focus:outline-none resize-y leading-relaxed"
				/>
			) : (
				<input
					ref={inputRef as React.RefObject<HTMLInputElement>}
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							onSubmit();
						} else if (e.key === "Escape") {
							e.preventDefault();
							onClose();
						}
					}}
					placeholder={placeholder}
					className="w-full h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] focus:ring-2 focus:ring-teal-500 focus:outline-none"
				/>
			)}

			<div className="flex items-center justify-between text-[10px] text-[var(--muted,#64748b)] px-0.5">
				<span>
					{multiline
						? "Нажмите Ctrl+Enter для отправки, Esc для отмены"
						: "Нажмите Enter для отправки, Esc для отмены"}
				</span>
				{value && (
					<button
						type="button"
						onClick={() => {
							onChange("");
							inputRef.current?.focus();
						}}
						className="text-teal-600 hover:text-teal-700 dark:text-teal-400 cursor-pointer font-medium"
					>
						Очистить
					</button>
				)}
			</div>
		</div>
	);
}

export interface LabPromptDialogState {
	title: string;
	description?: string;
	icon?: React.ReactNode;
	initialValue?: string;
	placeholder?: string;
	submitLabel?: string;
	submitVariant?: "teal" | "danger" | "primary";
	multiline?: boolean;
	quickPresets?: string[];
	onSubmit: (value: string) => void;
}

export function LabActionPromptModal({
	state,
	onClose,
}: {
	readonly state: LabPromptDialogState | null;
	readonly onClose: () => void;
}) {
	const [value, setValue] = useState("");
	const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

	useEffect(() => {
		if (state) {
			setValue(state.initialValue || "");
			const timer = setTimeout(() => {
				inputRef.current?.focus();
				inputRef.current?.select?.();
			}, 30);
			return () => clearTimeout(timer);
		}
	}, [state]);

	if (!state) return null;

	const handleFormSubmit = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		state.onSubmit(value);
	};

	const isDanger = state.submitVariant === "danger";

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="lab-prompt-modal-title"
			tabIndex={-1}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			<div className="w-full max-w-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#cbd5e1)] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
				<LabPromptHeader
					title={state.title}
					icon={state.icon}
					isDanger={isDanger}
					onClose={onClose}
				/>
				<form onSubmit={handleFormSubmit} className="flex flex-col m-0">
					<div className="p-4 space-y-3">
						{state.description && (
							<p className="text-xs text-[var(--muted,#64748b)] m-0 leading-relaxed">
								{state.description}
							</p>
						)}
						{state.quickPresets && (
							<LabPromptQuickPresets
								quickPresets={state.quickPresets}
								value={value}
								onSelect={(preset) => {
									setValue(preset);
									inputRef.current?.focus();
								}}
							/>
						)}
						<LabPromptInput
							multiline={state.multiline}
							placeholder={state.placeholder}
							value={value}
							onChange={setValue}
							onSubmit={handleFormSubmit}
							onClose={onClose}
							inputRef={inputRef}
						/>
					</div>

					<div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]">
						<button
							type="button"
							onClick={onClose}
							className="h-8 min-h-[32px] px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] font-medium text-xs transition-colors cursor-pointer"
						>
							Отмена
						</button>
						<button
							type="submit"
							className={`h-8 min-h-[32px] px-3.5 rounded-lg font-bold text-xs text-white shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5 ${isDanger ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800" : "bg-teal-600 hover:bg-teal-700 active:bg-teal-800"}`}
						>
							{state.submitLabel || "Сохранить"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
