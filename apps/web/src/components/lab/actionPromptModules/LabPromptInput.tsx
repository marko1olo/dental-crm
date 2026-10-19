import type React from "react";

export interface LabPromptInputProps {
	readonly multiline?: boolean;
	readonly placeholder?: string;
	readonly value: string;
	readonly onChange: (val: string) => void;
	readonly onSubmit: () => void;
	readonly onClose: () => void;
	readonly inputRef: React.RefObject<
		HTMLInputElement | HTMLTextAreaElement | null
	>;
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
