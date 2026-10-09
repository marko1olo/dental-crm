/**
 * DENTE CRM — Radiology Report Filmstrip Tray (Layer 4)
 * Patient study thumbnails and placement trigger.
 */

import React from "react";
import { Image as ImageIcon } from "lucide-react";
import type { PatientStudyThumbnail } from "./types";

export interface ReportFilmstripTrayProps {
	availableStudies: PatientStudyThumbnail[];
	selectedStudyIndex: number;
	onSelectStudy: (index: number) => void;
	onInsertStudy: (index: number) => void;
}

export const ReportFilmstripTray: React.FC<ReportFilmstripTrayProps> = ({
	availableStudies,
	selectedStudyIndex,
	onSelectStudy,
	onInsertStudy,
}) => {
	return (
		<div className="radiology-filmstrip-tray" data-testid="radiology-bottom-filmstrip">
			<div className="flex items-center justify-between text-xs text-zinc-400">
				<div className="flex items-center gap-2">
					<span className="text-[11px] font-semibold text-zinc-300">Снимки пациента:</span>
					<span className="text-[10px] text-zinc-500">
						Кликните на снимок для вставки в выбранную рамку макета
					</span>
				</div>

				<div className="flex items-center gap-1.5">
					<button
						type="button"
						className="px-1.5 py-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
						title="Предыдущая страница"
					>
						‹
					</button>
					<span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200">
						1 / 1
					</span>
					<button
						type="button"
						className="px-1.5 py-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
						title="Следующая страница"
					>
						›
					</button>
				</div>
			</div>

			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={() => onInsertStudy(selectedStudyIndex)}
					className="radiology-tool-btn !h-16 !px-3 shrink-0 flex flex-col items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700"
					title="Поместить снимок в активную рамку отчета"
					data-testid="btn-filmstrip-insert"
				>
					<ImageIcon className="w-4 h-4 text-emerald-400" />
					<span className="text-[10px] font-semibold">Вставить в макет</span>
				</button>

				<div className="radiology-filmstrip-thumbs">
					{availableStudies.map((study, idx) => {
						const isActive = idx === selectedStudyIndex;
						return (
							<div
								key={study.id}
								onClick={() => onSelectStudy(idx)}
								className={`radiology-thumb-card ${isActive ? "active" : ""}`}
								title={`Зуб #${study.toothFdi} · ${study.capturedAt}`}
								data-testid={`filmstrip-thumb-${idx}`}
							>
								<img
									src={study.imageUrl}
									alt={`Зуб #${study.toothFdi}`}
									onError={(e) => {
										(e.target as HTMLImageElement).src =
											"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='70' viewBox='0 0 100 70'><rect width='100' height='70' fill='%23111'/><text x='50%25' y='50%25' fill='%2310b981' font-family='sans-serif' font-size='10' text-anchor='middle'>RVG #16</text></svg>";
									}}
								/>
								<div className="radiology-thumb-badge">
									#{study.toothFdi} · {study.capturedAt.split(" ")[0]}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};
