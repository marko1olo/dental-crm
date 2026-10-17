import React from "react";
import { createPortal } from "react-dom";
import { Activity, FileText, X } from "lucide-react";
import { MISCH_CLINICAL_GUIDES, statPillStyle } from "./dicomRibbonConstants.js";
import { DicomBoneDensitySvgChart } from "./DicomBoneDensitySvgChart.js";
import type { DicomBoneDensityModalProps } from "./types.js";

export const DicomBoneDensityModal: React.FC<DicomBoneDensityModalProps> = ({
	isOpen,
	stats,
	onClose,
	onInsertToProtocol,
}) => {
	if (!isOpen || !stats || typeof document === "undefined") return null;

	const modalContent = (
		<div
			data-testid="dicom-hu-density-modal"
			className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[10003]"
			onClick={onClose}
		>
			<div
				className="w-[560px] max-w-full bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl text-slate-100 flex flex-col gap-3"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
					<div className="flex items-center gap-2">
						<Activity size={18} className="text-sky-400" />
						<div>
							<div className="font-bold text-sm">Профиль плотности кости (Шкала Хаунсфилда HU)</div>
							<div className="text-xs text-slate-400">
								Классификация Misch ({stats.dominantClass}) · {stats.lengthMm} мм
							</div>
						</div>
					</div>
					<button type="button" onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer p-1">
						<X size={18} />
					</button>
				</div>

				<div className="grid grid-cols-4 gap-2">
					<div style={statPillStyle}>
						<span className="text-[11px] text-slate-400">СРЕДНЯЯ</span>
						<strong className="text-xs text-sky-400">{stats.meanHu} HU</strong>
					</div>
					<div style={statPillStyle}>
						<span className="text-[11px] text-slate-400">КЛАСС MISCH</span>
						<strong className="text-xs text-teal-400">{stats.dominantClass}</strong>
					</div>
					<div style={statPillStyle}>
						<span className="text-[11px] text-slate-400">МИНИМУМ</span>
						<strong className="text-xs text-amber-400">{stats.minHu} HU</strong>
					</div>
					<div style={statPillStyle}>
						<span className="text-[11px] text-slate-400">МАКСИМУМ</span>
						<strong className="text-xs text-purple-400">{stats.maxHu} HU</strong>
					</div>
				</div>

				<DicomBoneDensitySvgChart stats={stats} />

				<div className="bg-teal-950/30 border border-teal-500/30 rounded-lg p-2.5 text-xs text-slate-300">
					<div className="font-semibold text-teal-300 mb-1">
						Клинический протокол для плотности {stats.dominantClass}:
					</div>
					<span>{MISCH_CLINICAL_GUIDES[stats.dominantClass] || MISCH_CLINICAL_GUIDES.D2}</span>
				</div>

				<div className="flex gap-2 justify-end pt-1">
					<button
						type="button"
						onClick={onClose}
						className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-3 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors text-xs cursor-pointer"
					>
						Закрыть
					</button>
					<button
						type="button"
						onClick={onInsertToProtocol}
						className="border border-[var(--teal)] bg-[var(--teal)] text-white font-bold rounded-lg px-3 py-1.5 shadow-2xs hover:bg-[var(--teal-strong,var(--teal))] transition-colors text-xs cursor-pointer inline-flex items-center gap-1.5"
					>
						<FileText size={14} />
						<span>Внести в медицинскую карту</span>
					</button>
				</div>
			</div>
		</div>
	);

	return createPortal(modalContent, document.body);
};
