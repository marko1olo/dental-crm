import type React from "react";
import { useEffect, useRef, useState } from "react";
import { LabPromptHeader } from "./actionPromptModules/LabPromptHeader";
import { LabPromptInput } from "./actionPromptModules/LabPromptInput";
import { LabPromptQuickPresets } from "./actionPromptModules/LabPromptQuickPresets";

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
