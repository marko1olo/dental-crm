/**
 * VisiographStudioHeader.tsx — Шапка студии визиографа в строгую 1 строку 44-48px (Мандаты 8b, 8e, 8am).
 */

import React from "react";
import { Activity, FolderOpen, Maximize2, Minimize2, Printer, X, Zap } from "lucide-react";
import {
	CANONICAL_HOTFOLDERS,
	FDI_PERMANENT_TEETH,
	MODALITY_CATALOG,
	type StudyModality,
} from "./visiographCatalogData";

const MODALITY_TAB_LABELS: Record<StudyModality, string> = {
	rvg: "Прицельный",
	opg: "Панорама",
	cbct: "3D КТ",
	photo: "Фото",
};

export interface VisiographStudioHeaderProps {
	patientName: string;
	activeModality: StudyModality;
	setActiveModality: (m: StudyModality) => void;
	activeTooth: string;
	setActiveTooth: (t: string) => void;
	isToothSelectorOpen: boolean;
	setIsToothSelectorOpen: React.Dispatch<React.SetStateAction<boolean>>;
	isHotFolderMenuOpen: boolean;
	setIsHotFolderMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	onOpenHotFolderIntake: () => void;
	onSelectHotfolder: (name: string) => void;
	onPrintA4: () => void;
	isFullscreen: boolean;
	onToggleFullscreen: () => void;
	onClose: () => void;
}

export const VisiographStudioHeader: React.FC<VisiographStudioHeaderProps> = ({
	patientName,
	activeModality,
	setActiveModality,
	activeTooth,
	setActiveTooth,
	isToothSelectorOpen,
	setIsToothSelectorOpen,
	isHotFolderMenuOpen,
	setIsHotFolderMenuOpen,
	onOpenHotFolderIntake,
	onSelectHotfolder,
	onPrintA4,
	isFullscreen,
	onToggleFullscreen,
	onClose,
}) => {
	const modalityMeta = MODALITY_CATALOG[activeModality];

	return (
		<header
			className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-2 overflow-x-clip"
			style={{ minHeight: "44px" }}
		>
			<div className="flex items-center gap-2 sm:gap-3 min-w-0">
				<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/15 border border-[var(--teal,#0d9488)]/30 flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
					<Activity size={18} />
				</div>
				<div className="flex flex-col min-w-0">
					<div className="flex items-center gap-1.5 sm:gap-2">
						<h2
							className="hidden sm:inline-block text-xs sm:text-sm font-bold text-[var(--ink)] truncate max-w-[200px] xl:max-w-xs"
							title={`Визиограф · ${patientName}`}
						>
							Визиограф · {patientName}
						</h2>
						<h2 className="sm:hidden text-xs font-bold text-[var(--ink)] whitespace-nowrap">
							Визиограф
						</h2>
					</div>
					<p className="hidden sm:block text-[11px] text-[var(--muted)] whitespace-nowrap truncate max-w-[200px] xl:max-w-xs">
						{modalityMeta.name} · Доза: {modalityMeta.typicalDoseMsv} мЗв
					</p>
				</div>
			</div>

			{/* Переключатель режимов модальностей */}
			<div className="hidden lg:flex items-center gap-1 p-0.5 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] shrink-0">
				{(["rvg", "opg", "cbct", "photo"] as const).map((mod) => (
					<button
						key={mod}
						type="button"
						onClick={() => setActiveModality(mod)}
						className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
							activeModality === mod
								? "bg-[var(--teal,#0d9488)] text-white shadow-xs font-semibold"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid={`tab-modality-${mod}`}
					>
						{MODALITY_TAB_LABELS[mod]}
					</button>
				))}
			</div>

			{/* Вспомогательные действия и закрытие */}
			<div className="flex items-center gap-1.5 shrink-0">
				{/* Выбор зуба FDI */}
				<div className="relative">
					<button
						type="button"
						onClick={() => setIsToothSelectorOpen((prev) => !prev)}
						className="h-8 min-w-[44px] px-2 rounded-lg text-xs font-mono font-bold bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] flex items-center justify-center gap-1"
						title="Привязать к номеру зуба FDI"
						data-testid="btn-select-tooth-fdi"
					>
						<span>#{activeTooth}</span>
					</button>

					{isToothSelectorOpen && (
						<div
							className="absolute top-full right-0 mt-1 z-50 p-2 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-xl grid grid-cols-8 gap-1 w-64"
							onClick={(e) => e.stopPropagation()}
						>
							{FDI_PERMANENT_TEETH.map((tooth) => (
								<button
									key={tooth}
									type="button"
									onClick={() => {
										setActiveTooth(tooth);
										setIsToothSelectorOpen(false);
									}}
									className={`h-7 rounded text-xs font-mono font-bold flex items-center justify-center border transition-colors ${
										activeTooth === tooth
											? "bg-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)] text-white"
											: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)]"
									}`}
								>
									{tooth}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Сетевой хотфолдер томографов и автозахват */}
				<div className="relative hidden sm:block">
					<button
						type="button"
						onClick={() => setIsHotFolderMenuOpen((prev) => !prev)}
						className="h-8 w-8 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center"
						title="Сетевые папки томографов и автозахват снимков (EzDent-i / Romexis / Sidexis)"
						data-testid="btn-toggle-hotfolders"
					>
						<FolderOpen size={15} />
					</button>

					{isHotFolderMenuOpen && (
						<div
							className="absolute top-full right-0 mt-1 z-50 p-2 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-xl flex flex-col gap-1 w-64 text-xs"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="px-2 py-1 font-bold text-[var(--ink)] border-b border-[var(--line)] flex items-center justify-between">
								<span>Сетевые папки томографов</span>
							</div>
							<button
								type="button"
								onClick={() => {
									setIsHotFolderMenuOpen(false);
									onOpenHotFolderIntake();
								}}
								className="px-2 py-2 rounded-lg text-left text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 font-semibold text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30"
							>
								<Zap size={14} />
								<span>Автозахват снимков (Хотфолдер)</span>
							</button>
							{CANONICAL_HOTFOLDERS.map((hf) => (
								<button
									key={hf.vendor}
									type="button"
									onClick={() => onSelectHotfolder(hf.name)}
									className="px-2 py-1.5 rounded-lg text-left text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-between"
								>
									<span>{hf.name}</span>
									<span className="text-[10px] text-[var(--teal,#0d9488)] font-mono">LAN</span>
								</button>
							))}
						</div>
					)}
				</div>

				{/* Быстрая печать протокола А4 */}
				<button
					type="button"
					onClick={onPrintA4}
					className="secondary-button h-8 px-2 sm:px-2.5 rounded-lg flex items-center gap-1 text-xs font-semibold"
					title="Быстрая печать снимка на А4 с медицинским паспортом"
					data-testid="btn-print-visiograph-a4"
				>
					<Printer size={14} />
					<span className="hidden md:inline">Печать А4</span>
				</button>

				{/* Полноэкранный режим */}
				<button
					type="button"
					onClick={onToggleFullscreen}
					className="hidden sm:flex h-8 w-8 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] items-center justify-center"
					title={isFullscreen ? "Свернуть в окно" : "На весь экран"}
					data-testid="btn-toggle-fullscreen"
				>
					{isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
				</button>

				{/* Закрыть */}
				<button
					type="button"
					onClick={onClose}
					className="h-8 w-8 min-w-[36px] sm:min-w-0 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--muted)] hover:text-white flex items-center justify-center ml-0.5"
					aria-label="Закрыть окно визиографа"
					data-testid="btn-close-visiograph-modal"
				>
					<X size={16} />
				</button>
			</div>
		</header>
	);
};
