import React, { useState, useRef, useEffect } from "react";
import {
	Box, Camera, ChevronDown, Compass, Filter, FolderDown, FolderInput,
	Layers, Plus, Printer, Scan, ShieldCheck, SplitSquareHorizontal,
} from "lucide-react";

export interface RadiologyModuleToolbarProps {
	patientName: string;
	cardNum: string;
	activeView: "archive" | "hub";
	setActiveView: (view: "archive" | "hub") => void;
	onOpenTactileSearch: () => void;
	onOpenReferral: () => void;
	onOpen3dStudio: () => void;
	onOpenCtSelector: () => void;
	onOpenDicomViewer: () => void;
	onOpenConsultation: () => void;
	onOpenReportStudio: () => void;
	onOpenRvgCapture: () => void;
	onOpenDoseSheet: () => void;
	onOpenHotFolder: () => void;
	onOpenImplant: () => void;
	onClose?: (() => void) | undefined;
}

export function RadiologyModuleToolbar({
	patientName, cardNum, activeView, setActiveView,
	onOpenTactileSearch, onOpenReferral, onOpen3dStudio, onOpenCtSelector,
	onOpenDicomViewer, onOpenConsultation, onOpenReportStudio, onOpenRvgCapture,
	onOpenDoseSheet, onOpenHotFolder, onOpenImplant, onClose,
}: RadiologyModuleToolbarProps) {
	const [isToolsOpen, setIsToolsOpen] = useState(false);
	const toolsMenuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!isToolsOpen) return;
		const handleOutside = (e: MouseEvent) => {
			if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
				setIsToolsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleOutside);
		return () => document.removeEventListener("mousedown", handleOutside);
	}, [isToolsOpen]);

	return (
		<div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
			<div className="flex items-center gap-3">
				<div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)]">
					<Scan className="w-5 h-5" />
				</div>
				<div>
					<h3 className="text-sm font-bold text-[var(--ink)]">Цифровая рентгенология и КЛКТ</h3>
					<p className="text-xs text-[var(--muted)]">Пациент: <strong className="text-[var(--ink)]">{patientName}</strong> · Медкарта: {cardNum}</p>
				</div>
			</div>

			<div className="dente-segmented-bar shrink-0">
				<button type="button" onClick={() => setActiveView("archive")} className={`dente-segmented-item ${activeView === "archive" ? "active" : ""}`} data-testid="tab-radiology-archive">
					<Layers className="w-3.5 h-3.5" /> <span>Архив всех КТ и снимков</span>
				</button>
				<button type="button" onClick={() => setActiveView("hub")} className={`dente-segmented-item ${activeView === "hub" ? "active" : ""}`} data-testid="tab-radiology-hub">
					<Scan className="w-3.5 h-3.5" /> <span>Инструменты и протоколы</span>
				</button>
			</div>

			<div className="flex items-center gap-2">
				<button type="button" onClick={onOpen3dStudio} className="primary-button h-9 min-h-[36px] px-3.5 text-xs font-medium rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white shadow-xs inline-flex items-center gap-1.5 transition shrink-0" data-testid="btn-open-3d-cbct-studio" title="Открыть 3D MPR КЛКТ">
					<Box className="w-3.5 h-3.5" /> <span>3D КЛКТ Студия</span>
				</button>
				<button type="button" onClick={onOpenReferral} className="secondary-button h-9 min-h-[36px] px-3 text-xs font-medium rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs inline-flex items-center gap-1.5 transition shrink-0" data-testid="btn-open-referral-modal" title="Сформировать направление на КЛКТ">
					<Plus className="w-3.5 h-3.5 text-[var(--muted)]" /> <span>Направление</span>
				</button>
				<button type="button" onClick={onOpenTactileSearch} className="secondary-button h-9 min-h-[36px] px-3 text-xs font-medium rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs inline-flex items-center gap-1.5 transition shrink-0" data-testid="btn-open-tactile-matrix-modal" title="Тактильная матрица поиска снимков">
					<Filter className="w-3.5 h-3.5 text-[var(--muted)]" /> <span>Матрица поиска</span>
				</button>

				<div className="relative shrink-0" ref={toolsMenuRef}>
					<button
						type="button"
						onClick={() => setIsToolsOpen((prev) => !prev)}
						className="secondary-button h-9 min-h-[36px] px-2.5 text-xs font-medium rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs inline-flex items-center gap-1 transition"
						data-testid="btn-radiology-tools-menu"
						title="Дополнительные инструменты"
					>
						<span>Инструменты</span>
						<ChevronDown className={`w-3.5 h-3.5 text-[var(--muted)] transition-transform duration-150 ${isToolsOpen ? "rotate-180" : ""}`} />
					</button>

					<div
						className={
							isToolsOpen
								? "absolute right-0 top-full mt-1.5 p-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl z-50 flex flex-col gap-0.5 min-w-[210px] animate-in fade-in zoom-in-95 duration-100"
								: "hidden"
						}
					>
						<button type="button" onClick={() => { onOpenCtSelector(); setIsToolsOpen(false); }} className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2 transition" data-testid="btn-open-radiology-ct-selector">
							<FolderDown className="w-3.5 h-3.5 text-[var(--muted)]" /> <span>Селектор КТ</span>
						</button>
						<button type="button" onClick={() => { onOpenDicomViewer(); setIsToolsOpen(false); }} className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2 transition" data-testid="btn-open-dicom-viewer">
							<Layers className="w-3.5 h-3.5 text-[var(--muted)]" /> <span>Визиограф & DICOM</span>
						</button>
						<button type="button" onClick={() => { onOpenConsultation(); setIsToolsOpen(false); }} className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2 transition" data-testid="btn-open-consultation-split">
							<SplitSquareHorizontal className="w-3.5 h-3.5 text-[var(--muted)]" /> <span>Консультация (Сплит)</span>
						</button>
						<button type="button" onClick={() => { onOpenReportStudio(); setIsToolsOpen(false); }} className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2 transition" data-testid="btn-open-report-studio">
							<Printer className="w-3.5 h-3.5 text-[var(--muted)]" /> <span>Отчет и печать</span>
						</button>
						<button type="button" onClick={() => { onOpenRvgCapture(); setIsToolsOpen(false); }} className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2 transition" data-testid="btn-open-rvg-capture">
							<Camera className="w-3.5 h-3.5 text-[var(--muted)]" /> <span>Снимок с датчика</span>
						</button>
						<button type="button" onClick={() => { onOpenDoseSheet(); setIsToolsOpen(false); }} className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2 transition" data-testid="btn-open-dose-sheet">
							<ShieldCheck className="w-3.5 h-3.5 text-[var(--muted)]" /> <span>Архив доз</span>
						</button>
						<button type="button" onClick={() => { onOpenHotFolder(); setIsToolsOpen(false); }} className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2 transition" data-testid="btn-open-hot-folder">
							<FolderInput className="w-3.5 h-3.5 text-[var(--muted)]" /> <span>Hot Folder</span>
						</button>
						<button type="button" onClick={() => { onOpenImplant(); setIsToolsOpen(false); }} className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-2 transition" data-testid="btn-open-implant-modal">
							<Compass className="w-3.5 h-3.5 text-[var(--muted)]" /> <span>Имплантаты</span>
						</button>
					</div>
				</div>

				{onClose && <button type="button" onClick={onClose} className="secondary-button h-9 min-h-[36px] px-3 text-xs font-medium rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs transition ml-auto shrink-0">Закрыть</button>}
			</div>
		</div>
	);
}
