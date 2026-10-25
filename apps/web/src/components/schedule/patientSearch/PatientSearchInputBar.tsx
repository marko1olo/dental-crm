import React from "react";
import { Search, X } from "lucide-react";

interface Props {
	rawQuery: string;
	setRawQuery: (q: string) => void;
	inputRef: React.RefObject<HTMLInputElement | null>;
	onClose: () => void;
}

export const PatientSearchInputBar: React.FC<Props> = ({
	rawQuery,
	setRawQuery,
	inputRef,
	onClose,
}) => {
	return (
		<div className="p-3 border-b border-[var(--line)] flex items-center gap-3 bg-[var(--paper-soft)]">
			<Search className="w-5 h-5 text-[var(--teal,var(--brand-primary))] shrink-0 ml-1" />
			<input
				ref={inputRef as React.RefObject<HTMLInputElement>}
				type="text"
				value={rawQuery}
				onChange={(e) => setRawQuery(e.target.value)}
				placeholder="Поиск по телефону (916, +7 925), фамилии (Иван, Смир) или карте..."
				className="flex-1 bg-transparent text-[var(--ink)] text-sm font-semibold placeholder:text-[var(--muted)] outline-none border-none"
				data-testid="patient-search-input"
			/>
			{rawQuery && (
				<button
					type="button"
					onClick={() => setRawQuery("")}
					className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 text-[var(--muted)] hover:text-[var(--ink)] rounded-xl hover:bg-[var(--paper)] transition-colors cursor-pointer shrink-0"
					title="Очистить"
					aria-label="Очистить поиск"
				>
					<X className="w-4 h-4" />
				</button>
			)}
			<button
				type="button"
				onClick={onClose}
				className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 py-2 text-xs font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all cursor-pointer shadow-2xs shrink-0"
				aria-label="Закрыть окно поиска (Esc)"
				title="Закрыть (Esc)"
			>
				Esc
			</button>
		</div>
	);
};
