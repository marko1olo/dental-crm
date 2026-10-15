import React, { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Printer, Sparkles } from "lucide-react";
import { VisitDiaryHeaderMoreMenu } from "../VisitDiaryHeaderMoreMenu";
import { VisitDiaryHeaderLockBadge } from "./VisitDiaryHeaderLockBadge";

export interface VisitDiaryHeaderActionsProps {
	readonly isLocked: boolean;
	readonly isRevising: boolean;
	readonly beginRevise: () => void;
	readonly onApplyNorm: () => void;
	readonly onOpenTemplates: () => void;
	readonly onOpenPrintPreview: () => void;
	readonly onOpenSummary: () => void;
	readonly onOpenPrescription: () => void;
	readonly onOpenRadiology: () => void;
	readonly onOpenTier3Perio: () => void;
	readonly onOpenEgisz: () => void;
	readonly onOpenBranding: () => void;
}

export const VisitDiaryHeaderActions: React.FC<VisitDiaryHeaderActionsProps> = (props) => {
	const { isLocked, isRevising, beginRevise, onApplyNorm, onOpenTemplates, onOpenPrintPreview, onOpenSummary, onOpenPrescription, onOpenRadiology, onOpenTier3Perio, onOpenEgisz, onOpenBranding } = props;

	const [isOpen, setIsOpen] = useState(false);
	const moreRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	return (
		<div className="vde-043__header-actions flex items-center gap-1.5">
			<button
				type="button"
				data-testid="open-1click-templates-btn"
				className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors flex items-center gap-1.5 text-xs"
				onClick={onOpenTemplates}
				title="Открыть каталог клинических протоколов и шаблонов дневника"
			>
				<Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
				<span>Клинические протоколы</span>
			</button>
			<button
				type="button"
				id="diary-norm-direct-btn"
				data-testid="diary-norm-direct-btn"
				onClick={onApplyNorm}
				className="sr-only"
				tabIndex={-1}
				aria-hidden="true"
			>
				<span>Норма</span>
			</button>
			<button
				type="button"
				data-testid="diary-print-043"
				className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors flex items-center gap-1.5 text-xs"
				onClick={onOpenPrintPreview}
				title="Предпросмотр и печать медицинской карты"
			>
				<Printer className="w-4 h-4" />
				<span className="hidden sm:inline">Печать карты</span>
			</button>
			<div className="relative inline-block" ref={moreRef} style={{ position: "relative" }}>
				<button
					type="button"
					data-testid="diary-more-actions-btn"
					className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors flex items-center justify-center text-xs"
					onClick={() => setIsOpen((v) => !v)}
					title="Дополнительные документы и бланки"
					aria-label="Дополнительные действия дневника"
					aria-expanded={isOpen}
				>
					<MoreHorizontal className="w-4 h-4" />
				</button>
				<VisitDiaryHeaderMoreMenu
					isOpen={isOpen}
					onClose={() => setIsOpen(false)}
					onOpenSummary={onOpenSummary}
					onOpenPrescription={onOpenPrescription}
					onOpenRadiology={onOpenRadiology}
					onOpenTier3Perio={onOpenTier3Perio}
					onOpenEgisz={onOpenEgisz}
					onOpenBranding={onOpenBranding}
				>
					<button
						type="button"
						id="diary-1click-norm-btn"
						data-testid="diary-1click-norm-btn"
						onClick={() => {
							setIsOpen(false);
							onApplyNorm();
						}}
						className="sr-only"
						tabIndex={-1}
						aria-hidden="true"
					>
						<span>Норма / Здоров</span>
					</button>
				</VisitDiaryHeaderMoreMenu>
			</div>
			<VisitDiaryHeaderLockBadge
				isLocked={isLocked}
				isRevising={isRevising}
				beginRevise={beginRevise}
			/>
		</div>
	);
};
