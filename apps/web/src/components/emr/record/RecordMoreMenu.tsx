import React, { useRef, useEffect } from "react";
import { Download, Copy, Check, Sparkles, MoreHorizontal } from "lucide-react";

interface RecordMoreMenuProps {
	isOpen: boolean;
	setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
	hasOnSave: boolean;
	copiedToast: boolean;
	onApplyNorm: () => void;
	onSaveForm: () => void;
	onExportXml: () => void;
	onExportJson: () => void;
	onCopyText: () => void;
}

export const RecordMoreMenu: React.FC<RecordMoreMenuProps> = React.memo(function RecordMoreMenu(props) {
	const moreMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!props.isOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) props.setIsOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [props.isOpen, props.setIsOpen]);

	return (
		<div className="relative inline-flex items-center" ref={moreMenuRef}>
			<button type="button" className="emr043-btn emr043-btn-secondary emr043-btn-icon-only" onClick={() => props.setIsOpen((v) => !v)} title="Дополнительные действия" data-testid="btn-043-more-actions">
				<MoreHorizontal className="w-4 h-4" />
			</button>
			{props.isOpen && (
				<div className="absolute right-0 top-full mt-1 w-56 bg-[var(--paper-strong,#ffffff)] dark:bg-slate-900 border border-[var(--glass-border,#cbd5e1)] dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 text-xs text-[var(--ink,#0f172a)] dark:text-slate-100" style={{ minWidth: "210px" }}>
					<button type="button" className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer" onClick={() => { props.onApplyNorm(); props.setIsOpen(false); }} data-testid="btn-043-more-apply-norm">
						<Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" /><span>Физиологическая норма</span>
					</button>
					{props.hasOnSave && (
						<button type="button" className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer" onClick={() => { props.onSaveForm(); props.setIsOpen(false); }} data-testid="btn-043-more-save">
							<Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /><span>Сохранить карту</span>
						</button>
					)}
					<button type="button" className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-800" onClick={() => { props.onExportXml(); props.setIsOpen(false); }} title="Экспорт в XML для электронной медкарты (Госуслуги)">
						<Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" /><span>Электронная медкарта (XML)</span>
					</button>
					<button type="button" className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer" onClick={() => { props.onExportJson(); props.setIsOpen(false); }}>
						<Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" /><span>Экспорт в JSON</span>
					</button>
					<button type="button" className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-800" onClick={() => { props.onCopyText(); props.setIsOpen(false); }}>
						{props.copiedToast ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />}
						<span>{props.copiedToast ? "Скопировано!" : "Копировать текст карты"}</span>
					</button>
				</div>
			)}
		</div>
	);
});
