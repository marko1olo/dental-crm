import React from "react";
import {
	FileText,
	Pill,
	Scan,
	BarChart2,
	ShieldCheck,
	Palette,
} from "lucide-react";

export interface VisitDiaryHeaderMoreMenuProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onOpenSummary: () => void;
	readonly onOpenPrescription: () => void;
	readonly onOpenRadiology: () => void;
	readonly onOpenTier3Perio: () => void;
	readonly onOpenEgisz: () => void;
	readonly onOpenBranding: () => void;
	readonly children?: React.ReactNode;
}

export function VisitDiaryHeaderMoreMenu({
	isOpen,
	onClose,
	onOpenSummary,
	onOpenPrescription,
	onOpenRadiology,
	onOpenTier3Perio,
	onOpenEgisz,
	onOpenBranding,
	children,
}: VisitDiaryHeaderMoreMenuProps) {
	if (!isOpen) return null;

	return (
		<div
			className="absolute right-0 top-full mt-1 z-50 min-w-[210px] p-1 bg-[var(--paper-strong)] border border-[var(--glass-border)] rounded-xl shadow-lg flex flex-col gap-1 text-xs"
			style={{ minWidth: "210px" }}
		>
			{children}
			<button
				type="button"
				data-testid="diary-summary-btn"
				onClick={() => {
					onClose();
					onOpenSummary();
				}}
				className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] text-left cursor-pointer border-none bg-transparent"
			>
				<FileText className="w-4 h-4 text-[var(--teal)] shrink-0" />
				<span>Клиническая сводка</span>
			</button>
			<button
				type="button"
				data-testid="open-prescription-btn"
				onClick={() => {
					onClose();
					onOpenPrescription();
				}}
				className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] text-left cursor-pointer border-none bg-transparent"
			>
				<Pill className="w-4 h-4 text-blue-500 shrink-0" />
				<span>Рецепт на лекарства</span>
			</button>
			<button
				type="button"
				data-testid="open-radiology-referral-btn"
				onClick={() => {
					onClose();
					onOpenRadiology();
				}}
				className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] text-left cursor-pointer border-none bg-transparent"
			>
				<Scan className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
				<span>Направление КЛКТ/ОПТГ</span>
			</button>
			<button
				type="button"
				data-testid="open-tier3-perio-btn"
				onClick={() => {
					onClose();
					onOpenTier3Perio();
				}}
				className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] text-left cursor-pointer border-none bg-transparent"
				title="Пародонтологическая карта (6 точек зондирования, скрининг PSR / CPITN)"
			>
				<BarChart2 className="w-4 h-4 text-teal-500 shrink-0" />
				<span>Пародонтограмма (6 точек)</span>
			</button>
			<button
				type="button"
				data-testid="open-egisz-semd-btn"
				onClick={() => {
					onClose();
					onOpenEgisz();
				}}
				className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] text-left cursor-pointer border-none bg-transparent"
			>
				<ShieldCheck className="w-4 h-4 text-[var(--ok-fg)] shrink-0" />
				<span>Электронная медкарта (Госуслуги)</span>
			</button>
			<button
				type="button"
				data-testid="open-branding-customizer-btn"
				onClick={() => {
					onClose();
					onOpenBranding();
				}}
				className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] text-left cursor-pointer border-none bg-transparent"
			>
				<Palette className="w-4 h-4 text-amber-500 shrink-0" />
				<span>Бланк и стиль</span>
			</button>
		</div>
	);
}
