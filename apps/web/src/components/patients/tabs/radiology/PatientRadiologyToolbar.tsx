import React from "react";
import { Filter, Plus, RefreshCw, Scan } from "lucide-react";
import { DicomAutoDetectStatusBadge } from "../../../imaging/DicomAutoDetectStatusBadge";

interface PatientRadiologyToolbarProps {
	isLoading: boolean;
	onStudyBound: () => void;
	onOpenTactileSearch: () => void;
	onOpenCtSelector: () => void;
	onOpenHotFolder: () => void;
	onRefresh: () => void;
}

export const PatientRadiologyToolbar: React.FC<PatientRadiologyToolbarProps> = ({
	isLoading,
	onStudyBound,
	onOpenTactileSearch,
	onOpenCtSelector,
	onOpenHotFolder,
	onRefresh,
}) => {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 flex items-center justify-center shrink-0">
					<Scan className="w-4 h-4" />
				</div>
				<div>
					<h3 className="text-xs font-bold text-[var(--ink)] leading-tight">
						Рентгенологические исследования пациента
					</h3>
					<p className="text-[11px] text-[var(--muted)]">
						Компьютерные томограммы (КЛКТ), ортопантомограммы и прицельные снимки
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<DicomAutoDetectStatusBadge onStudyBound={onStudyBound} />

				<button
					type="button"
					onClick={onOpenTactileSearch}
					className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] shadow-2xs transition-all active:scale-95 cursor-pointer"
					data-testid="btn-patient-tactile-search"
					title="Тактильная матрица поиска исследований по датам и аппаратам"
				>
					<Filter className="w-3.5 h-3.5" />
					<span>Матрица поиска</span>
				</button>

				<button
					type="button"
					onClick={onOpenCtSelector}
					className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] shadow-2xs transition-all active:scale-95 cursor-pointer"
					data-testid="btn-patient-open-ct-selector"
					title="Клинический КТ-селектор"
				>
					<Scan className="w-3.5 h-3.5" />
					<span>КТ-селектор</span>
				</button>

				<button
					type="button"
					onClick={onOpenHotFolder}
					className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-xs transition-all active:scale-95 cursor-pointer"
					data-testid="btn-patient-upload-ct"
					title="Импорт снимка из горячей папки томографа или загрузка файла"
				>
					<Plus className="w-3.5 h-3.5" />
					<span>Загрузить КТ</span>
				</button>

				<button
					type="button"
					onClick={onRefresh}
					disabled={isLoading}
					className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
					title="Обновить список исследований"
					data-testid="btn-refresh-patient-radiology"
				>
					<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
				</button>
			</div>
		</div>
	);
};
