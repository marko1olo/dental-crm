/**
 * ImagingHeaderMoreMenu.tsx — Выпадающее меню дополнительных клинических модулей (Мандат 8b <= 120 строк).
 */

import React from "react";
import { Columns2, Download, ExternalLink, Layers, Scan, Sparkles } from "lucide-react";

interface Props {
	isOpen: boolean;
	onClose: () => void;
	onOpenRvgCapture?: (() => void) | undefined;
	onOpenCtSelector?: (() => void) | undefined;
	onOpenPopoutStudio?: (() => void) | undefined;
	onOpenPanoramic: () => void;
	onOpenRadiologyModule: () => void;
	onOpenComparison?: (() => void) | undefined;
	onOpenExport?: (() => void) | undefined;
}

export const ImagingHeaderMoreMenu: React.FC<Props> = ({
	isOpen, onClose, onOpenRvgCapture, onOpenCtSelector, onOpenPopoutStudio,
	onOpenPanoramic, onOpenRadiologyModule, onOpenComparison, onOpenExport,
}) => {
	if (!isOpen) return null;

	const act = (fn?: () => void) => {
		onClose();
		fn?.();
	};

	return (
		<div
			className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150"
			role="menu"
			aria-label="Дополнительные модули снимков"
		>
			{onOpenRvgCapture && (
				<button className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2.5 cursor-pointer transition-colors" type="button" role="menuitem" data-testid="btn-open-rvg-capture" onClick={() => act(onOpenRvgCapture)}>
					<Scan aria-hidden="true" size={16} className="text-[var(--primary)] shrink-0" />
					<div className="flex flex-col">
						<span>Захват RVG (Визиограф)</span>
						<span className="text-[10px] text-[var(--ink-muted)] font-normal">Прямой захват / Hot Folder</span>
					</div>
				</button>
			)}
			{onOpenCtSelector && (
				<button className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2.5 cursor-pointer transition-colors" type="button" role="menuitem" data-testid="btn-open-ct-selector" onClick={() => act(onOpenCtSelector)}>
					<Scan aria-hidden="true" size={16} className="text-[var(--primary)] shrink-0" />
					<div className="flex flex-col">
						<span>КТ / Снимки</span>
						<span className="text-[10px] text-[var(--ink-muted)] font-normal">Выбор томографа и архивов</span>
					</div>
				</button>
			)}
			{onOpenPopoutStudio && (
				<button className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2.5 cursor-pointer transition-colors" type="button" role="menuitem" data-testid="ct-popout-open-btn" onClick={() => act(onOpenPopoutStudio)}>
					<ExternalLink aria-hidden="true" size={16} className="text-[var(--primary)] shrink-0" />
					<div className="flex flex-col">
						<span>В отдельное окно</span>
						<span className="text-[10px] text-[var(--ink-muted)] font-normal">Для второго монитора</span>
					</div>
				</button>
			)}
			<button className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2.5 cursor-pointer transition-colors" type="button" role="menuitem" data-testid="imaging-open-panoramic" onClick={() => act(onOpenPanoramic)}>
				<Sparkles aria-hidden="true" size={16} className="text-[var(--primary)] shrink-0" />
				<div className="flex flex-col">
					<span>Панорама (ОПТГ)</span>
					<span className="text-[10px] text-[var(--ink-muted)] font-normal">Ортопантомограмма</span>
				</div>
			</button>
			<button className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2.5 cursor-pointer transition-colors" type="button" role="menuitem" data-testid="imaging-open-radiology-module" onClick={() => act(onOpenRadiologyModule)}>
				<Layers aria-hidden="true" size={16} className="text-[var(--primary)] shrink-0" />
				<div className="flex flex-col">
					<span>Рентген-кабинет</span>
					<span className="text-[10px] text-[var(--ink-muted)] font-normal">Направления и дозиметрия</span>
				</div>
			</button>
			{onOpenComparison && (
				<button className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2.5 cursor-pointer transition-colors" type="button" role="menuitem" data-testid="imaging-open-comparison-btn" onClick={() => act(onOpenComparison)}>
					<Columns2 aria-hidden="true" size={16} className="text-[var(--primary)] shrink-0" />
					<div className="flex flex-col">
						<span>Сравнение «До / После»</span>
						<span className="text-[10px] text-[var(--ink-muted)] font-normal">Сплит-визиограф</span>
					</div>
				</button>
			)}
			{onOpenExport && (
				<button className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2.5 cursor-pointer transition-colors border-t border-[var(--line-subtle)] mt-1 pt-2" type="button" role="menuitem" data-testid="imaging-open-export-btn" onClick={() => act(onOpenExport)}>
					<Download aria-hidden="true" size={16} className="text-[var(--primary)] shrink-0" />
					<div className="flex flex-col">
						<span>Экспорт снимков</span>
						<span className="text-[10px] text-[var(--ink-muted)] font-normal">Флешка / Telegram / Архив</span>
					</div>
				</button>
			)}
		</div>
	);
};
