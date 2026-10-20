import React from "react";
import { Box, FileText, Layers, Printer, Sparkles, SplitSquareHorizontal } from "lucide-react";

export interface RadiologyHubCardsProps {
	onOpenReferral: () => void;
	onOpenReportStudio: () => void;
	onOpen3dStudio: () => void;
	onOpenDicomViewer: () => void;
	onOpenSensorViewer: () => void;
	onOpenConsultation: () => void;
}

export function RadiologyHubCards({
	onOpenReferral, onOpenReportStudio, onOpen3dStudio,
	onOpenDicomViewer, onOpenSensorViewer, onOpenConsultation,
}: RadiologyHubCardsProps) {
	return (
		<div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{/* Card 1: Referral & Protocols */}
				<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col justify-between">
					<div>
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Направление на исследование</span>
							<FileText className="w-4 h-4 text-[var(--teal)]" />
						</div>
						<h4 className="text-sm font-bold text-[var(--ink)] mb-1">Официальное направление на КЛКТ</h4>
						<p className="text-xs text-[var(--muted)] mb-3 leading-relaxed">
							Оформление за 5 секунд у кресла: выбор FOV (16x10, 10x10, 5x5, ВНЧС), целей сканирования, печать со штрихкодом и QR.
						</p>
					</div>
					<div className="flex flex-col gap-2 mt-2">
						<button type="button" onClick={onOpenReferral} className="w-full h-8 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] hover:bg-[var(--teal)] hover:text-white transition-colors">
							<Printer className="w-3.5 h-3.5" /> <span>Выписать направление</span>
						</button>
						<button type="button" onClick={onOpenReportStudio} className="w-full h-8 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-emerald-600 hover:text-emerald-600 transition-colors" data-testid="btn-hub-report-studio">
							<FileText className="w-3.5 h-3.5 text-emerald-600" /> <span>Конструктор отчетов (Печать)</span>
						</button>
					</div>
				</div>

				{/* Card 2: 3D MPR Studio */}
				<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col justify-between">
					<div>
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">3D Планирование (MPR)</span>
							<Box className="w-4 h-4 text-blue-500" />
						</div>
						<h4 className="text-sm font-bold text-[var(--ink)] mb-1">Томография и имплантация</h4>
						<p className="text-xs text-[var(--muted)] mb-3 leading-relaxed">
							Аксиальные, сагиттальные, корональные срезы, панорамная кривая зубной дуги, мандибулярный нерв и плотность по Мишу (D1–D4).
						</p>
					</div>
					<button type="button" onClick={onOpen3dStudio} className="w-full h-8 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] transition-colors">
						<Box className="w-3.5 h-3.5 text-[var(--teal)]" /> <span>Запустить 3D Студию</span>
					</button>
				</div>

				{/* Card 3: 2D Visio & DICOM */}
				<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col justify-between">
					<div>
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Прицельные снимки & 2D</span>
							<Layers className="w-4 h-4 text-emerald-500" />
						</div>
						<h4 className="text-sm font-bold text-[var(--ink)] mb-1">Прицельные снимки</h4>
						<p className="text-xs text-[var(--muted)] mb-3 leading-relaxed">
							Просмотр снимков за &lt;50мс, аппаратные фильтры контрастности, калиброванная линейка и быстрое внесение рентген-нормы в медицинскую карту.
						</p>
					</div>
					<div className="flex flex-col gap-2 mt-2">
						<button type="button" onClick={onOpenDicomViewer} className="w-full h-8 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] transition-colors">
							<Layers className="w-3.5 h-3.5 text-emerald-600" /> <span>Открыть визиограммы</span>
						</button>
						<button type="button" onClick={onOpenSensorViewer} className="w-full h-8 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] transition-colors" data-testid="btn-open-sensor-study-viewer">
							<Sparkles className="w-3.5 h-3.5 text-teal-600" /> <span>2D Рентген-просмотрщик</span>
						</button>
					</div>
				</div>

				{/* Card 4: Clinical Consultation */}
				<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col justify-between">
					<div>
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Консультация у кресла</span>
							<SplitSquareHorizontal className="w-4 h-4 text-[#00C853]" />
						</div>
						<h4 className="text-sm font-bold text-[var(--ink)] mb-1">Сплит-сравнение и 8 дисциплин</h4>
						<p className="text-xs text-[var(--muted)] mb-3 leading-relaxed">
							Синхронное сопоставление снимков До/После, векторные стрелки и клинический каталог патологий по 8 стоматологическим дисциплинам.
						</p>
					</div>
					<button type="button" onClick={onOpenConsultation} className="w-full h-8 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[#00C853] hover:text-[#00C853] transition-colors" data-testid="btn-launch-consultation-card">
						<SplitSquareHorizontal className="w-3.5 h-3.5 text-[#00C853]" /> <span>Запустить консультацию</span>
					</button>
				</div>
			</div>
		</div>
	);
}
