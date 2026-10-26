/**
 * CtStudyHeader.tsx — Шапка карточки исследования КТ с кнопками запуска просмотрщика
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { AlertCircle, Box, Calendar, CheckCircle, Eye, Grid3X3, Settings } from "lucide-react";

interface Props {
	studyId: string;
	title: string;
	patientName?: string | null | undefined;
	modality?: string | null | undefined;
	isAutoBound: boolean;
	bindingConfidence?: number | null | undefined;
	formattedDate: string;
	onOpenControl?: ((studyId: string) => void) | undefined;
	onOpenStudio?: ((studyId: string) => void) | undefined;
	onLaunchStudioModal: () => void;
	onOpenSectioning: () => void;
	onOpen2d: () => void;
}

export const CtStudyHeader: React.FC<Props> = ({
	studyId,
	title,
	patientName,
	modality,
	isAutoBound,
	bindingConfidence,
	formattedDate,
	onOpenControl,
	onOpenStudio,
	onLaunchStudioModal,
	onOpenSectioning,
	onOpen2d,
}) => {
	return (
		<div className="flex items-start justify-between gap-3">
			<div className="space-y-1">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
						{modality || "КЛКТ 3D"}
					</span>
					{isAutoBound ? (
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
							<CheckCircle className="w-3.5 h-3.5" />
							Автопривязано ({bindingConfidence}%)
						</span>
					) : (
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40">
							<AlertCircle className="w-3.5 h-3.5" />
							{bindingConfidence}% соответствие
						</span>
					)}
					<span className="text-xs text-[var(--muted)] flex items-center gap-1">
						<Calendar className="w-3.5 h-3.5" />
						{formattedDate}
					</span>
				</div>
				<h3 className="font-bold text-sm leading-tight tracking-tight text-[var(--ink)]">{title}</h3>
				{patientName && (
					<p className="text-xs text-[var(--muted)]">
						Пациент: <strong className="font-semibold text-[var(--ink)]">{patientName}</strong>
					</p>
				)}
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				{onOpenControl && (
					<button
						type="button"
						data-testid={`btn-patient-study-control-${studyId}`}
						onClick={() => onOpenControl(studyId)}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer shadow-2xs"
						title="Проверить сопоставление с DICOM"
					>
						<Settings className="w-3.5 h-3.5 text-[var(--muted)]" />
						<span>Контроль</span>
					</button>
				)}
				<button
					type="button"
					data-testid={`btn-launch-3d-studio-${studyId}`}
					onClick={() => { if (onOpenStudio) onOpenStudio(studyId); else onLaunchStudioModal(); }}
					className="inline-flex items-center gap-1.5 h-8 px-3.5 text-[13px] font-semibold rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer"
				>
					<Box className="w-3.5 h-3.5" />
					<span>3D КЛКТ Студия</span>
				</button>
				<button
					type="button"
					data-testid="btn-ct-sectioning-open"
					onClick={onOpenSectioning}
					className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer shadow-2xs"
				>
					<Grid3X3 className="w-3.5 h-3.5 text-[var(--muted)]" />
					<span>Раздел (Кросс-секции)</span>
				</button>
				<button
					type="button"
					data-testid="btn-ct-2d-open"
					onClick={onOpen2d}
					className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer shadow-2xs"
				>
					<Eye className="w-3.5 h-3.5 text-[var(--muted)]" />
					<span>2D Срез</span>
				</button>
			</div>
		</div>
	);
};
