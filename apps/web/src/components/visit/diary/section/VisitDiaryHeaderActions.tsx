import React, { useState, useRef, useEffect } from "react";
import { CheckCircle2, MoreHorizontal, Printer, Sparkles } from "lucide-react";
import { VisitDiaryHeaderMoreMenu } from "../VisitDiaryHeaderMoreMenu";
import { VisitDiaryHeaderLockBadge } from "./VisitDiaryHeaderLockBadge";

export interface VisitDiaryHeaderActionsProps {
	readonly isLocked: boolean;
	readonly isRevising: boolean;
	readonly beginRevise: () => void;
	readonly onApplyNorm: (specialty?: "hygiene" | "therapy" | "surgery" | "pediatric" | "general") => void;
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
		<div className="clinical-diary__header-actions flex items-center gap-1.5">
			<button
				type="button"
				data-testid="open-1click-templates-btn"
				className="border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--line-strong)] transition-colors flex items-center gap-1.5 text-xs"
				onClick={onOpenTemplates}
				title="Открыть каталог клинических протоколов и шаблонов дневника"
			>
				<Sparkles className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
				<span>Клинические протоколы</span>
			</button>
			<button
				type="button"
				id="diary-norm-direct-btn"
				data-testid="diary-norm-direct-btn"
				onClick={onApplyNorm}
				className="border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--line-strong)] font-semibold rounded-lg px-2.5 py-1.5 shadow-2xs transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
				title="Заполнить физиологическую норму: соматически здоров, интактный ряд"
			>
				<CheckCircle2 className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
				<span>Норма (здоров)</span>
			</button>
			<button
				type="button"
				id="diary-print-emr-card-btn"
				data-testid="diary-print-emr-card"
				data-legacy-testid="diary-print-043"
				className="border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--line-strong)] transition-colors flex items-center gap-1.5 text-xs"
				onClick={onOpenPrintPreview}
				title="Предпросмотр и печать медицинской карты приёма"
			>
				<Printer className="w-4 h-4 text-[var(--ink-muted)]" />
				<span className="hidden sm:inline">Печать карты</span>
			</button>
			<div className="relative inline-block" ref={moreRef} style={{ position: "relative" }}>
				<button
					type="button"
					data-testid="diary-more-actions-btn"
					className="border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold rounded-lg px-2 py-1.5 shadow-2xs hover:border-[var(--line-strong)] transition-colors flex items-center justify-center text-xs"
					onClick={() => setIsOpen((v) => !v)}
					title="Дополнительные документы и бланки"
					aria-label="Дополнительные действия дневника"
					aria-expanded={isOpen}
				>
					<MoreHorizontal className="w-4 h-4 text-[var(--ink-muted)]" />
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
						className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-transparent hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-left cursor-pointer transition-colors"
						title="Заполнить физиологическую норму: соматически здоров, интактные зубы"
					>
						<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Норма (профосмотр / гигиена)</span>
					</button>
					<button
						type="button"
						id="diary-1click-norm-therapy-btn"
						data-testid="diary-1click-norm-therapy-btn"
						onClick={() => {
							setIsOpen(false);
							onApplyNorm("therapy");
						}}
						className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-transparent hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-left cursor-pointer transition-colors"
						title="Заполнить терапевтическую норму: зубы интактны, пломбы состоятельны"
					>
						<CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Норма терапии (интактно)</span>
					</button>
					<button
						type="button"
						id="diary-1click-norm-surgery-btn"
						data-testid="diary-1click-norm-surgery-btn"
						onClick={() => {
							setIsOpen(false);
							onApplyNorm("surgery");
						}}
						className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-transparent hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-left cursor-pointer transition-colors"
						title="Заполнить хирургическую норму: лунка под сгустком, заживление без осложнений"
					>
						<CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
						<span>Норма хирургии (без осложнений)</span>
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
