import React from "react";
import {
	Box, Camera, Compass, Filter, FolderDown, FolderInput,
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

			<div className="flex flex-wrap items-center gap-2">
				<button type="button" onClick={onOpenTactileSearch} className="secondary-button" data-testid="btn-open-tactile-matrix-modal" title="Тактильная матрица поиска снимков">
					<Filter className="w-3.5 h-3.5" /> <span>Матрица поиска</span>
				</button>
				<button type="button" onClick={onOpenReferral} className="primary-button" data-testid="btn-open-referral-modal" title="Сформировать направление на КЛКТ">
					<Plus className="w-3.5 h-3.5" /> <span>Направление на КЛКТ</span>
				</button>
				<button type="button" onClick={onOpen3dStudio} className="secondary-button" data-testid="btn-open-3d-cbct-studio" title="Открыть 3D MPR КЛКТ">
					<Box className="w-3.5 h-3.5 text-[var(--teal)]" /> <span>3D КЛКТ Студия</span>
				</button>
				<button type="button" onClick={onOpenCtSelector} className="secondary-button" data-testid="btn-open-radiology-ct-selector" title="Селектор КТ">
					<FolderDown className="w-3.5 h-3.5 text-blue-500" /> <span>Селектор КТ</span>
				</button>
				<button type="button" onClick={onOpenDicomViewer} className="secondary-button" data-testid="btn-open-dicom-viewer" title="Визиограф & DICOM">
					<Layers className="w-3.5 h-3.5 text-blue-500" /> <span>Визиограф & DICOM</span>
				</button>
				<button type="button" onClick={onOpenConsultation} className="secondary-button" data-testid="btn-open-consultation-split" title="Консультация (Сплит)">
					<SplitSquareHorizontal className="w-3.5 h-3.5 text-emerald-600" /> <span>Консультация (Сплит)</span>
				</button>
				<button type="button" onClick={onOpenReportStudio} className="secondary-button" data-testid="btn-open-report-studio" title="Отчет и печать">
					<Printer className="w-3.5 h-3.5 text-emerald-600" /> <span>Отчет и печать</span>
				</button>
				<button type="button" onClick={onOpenRvgCapture} className="secondary-button" data-testid="btn-open-rvg-capture" title="Снимок с датчика">
					<Camera className="w-3.5 h-3.5" /> <span>Снимок с датчика</span>
				</button>
				<button type="button" onClick={onOpenDoseSheet} className="secondary-button" data-testid="btn-open-dose-sheet" title="Архив доз">
					<ShieldCheck className="w-3.5 h-3.5 text-[var(--muted)]" /> <span>Архив доз</span>
				</button>
				<button type="button" onClick={onOpenHotFolder} className="secondary-button" data-testid="btn-open-hot-folder" title="Hot Folder">
					<FolderInput className="w-3.5 h-3.5" /> <span>Hot Folder</span>
				</button>
				<button type="button" onClick={onOpenImplant} className="secondary-button" data-testid="btn-open-implant-modal" title="Имплантаты">
					<Compass className="w-3.5 h-3.5 text-teal-600" /> <span>Имплантаты</span>
				</button>
				{onClose && <button type="button" onClick={onClose} className="secondary-button ml-auto">Закрыть</button>}
			</div>
		</div>
	);
}
