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
		<div
			className="radiology-filmstrip-tray px-4 py-2.5 border-t border-[var(--line)] bg-[var(--paper-strong)] flex flex-col gap-2 shrink-0"
			data-testid="radiology-bottom-filmstrip"
		>
			<div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold text-[var(--ink)]">Снимки пациента:</span>
					<span className="text-xs text-[var(--ink-muted)]">
						Кликните на снимок для вставки в выбранную рамку макета
					</span>
				</div>
			</div>

			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={() => onInsertStudy(selectedStudyIndex)}
					className="h-9 px-3.5 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 shrink-0 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
					title="Поместить снимок в активную рамку отчета"
					data-testid="btn-filmstrip-insert"
				>
					<ImageIcon className="w-4 h-4 shrink-0" />
					<span>Вставить в макет</span>
				</button>

				<div className="radiology-filmstrip-thumbs flex items-center gap-2 overflow-x-auto min-w-0">
					{availableStudies.map((study, idx) => {
						const isActive = idx === selectedStudyIndex;
						return (
							<div
								key={study.id}
								onClick={() => onSelectStudy(idx)}
								className={`radiology-thumb-card ${isActive ? "active border-[var(--primary)]" : "border-[var(--line)]"} shrink-0 rounded-lg border bg-[var(--paper)] overflow-hidden cursor-pointer transition-colors`}
								title={`Зуб #${study.toothFdi} · ${study.capturedAt}`}
								data-testid={`filmstrip-thumb-${idx}`}
							>
								<img
									src={study.imageUrl}
									alt={`Зуб #${study.toothFdi}`}
									className="h-12 w-16 object-cover block"
									onError={(e) => {
										const label = study.toothFdi ? `RVG #${study.toothFdi}` : "RVG";
										(e.target as HTMLImageElement).src =
											`data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='70' viewBox='0 0 100 70'><rect width='100' height='70' fill='%23111'/><text x='50%25' y='50%25' fill='%2310b981' font-family='sans-serif' font-size='10' text-anchor='middle'>${label}</text></svg>`;
									}}
								/>
								<div className="radiology-thumb-badge px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink-muted)] truncate">
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
