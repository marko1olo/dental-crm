import type React from "react";
import {
	AlertCircle,
	Archive,
	Box,
	Check,
	Eye,
	Layers,
	Scan,
	Settings,
	Sparkles,
	User,
} from "lucide-react";
import type { ImagingStudy } from "@dental/shared";

export interface RadiologyStudyRowProps {
	readonly study: ImagingStudy;
	readonly onOpenStudio?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenViewer?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenSensorViewer?: ((study: ImagingStudy) => void) | undefined;
	readonly onControlBinding: (study: ImagingStudy) => void;
}

export const RadiologyStudyRow: React.FC<RadiologyStudyRowProps> = ({
	study,
	onOpenStudio,
	onOpenViewer,
	onOpenSensorViewer,
	onControlBinding,
}) => {
	const isCbct = study.kind === "cbct" || (study.sliceCount != null && study.sliceCount > 1);

	return (
		<div
			className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] hover:border-teal-500/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs"
			data-testid={`study-row-${study.id}`}
		>
			{/* Левая колонка: Иконка модальности + Описание */}
			<div className="flex items-start gap-3 min-w-0 flex-1">
				<div
					className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
						isCbct
							? "bg-blue-500/15 text-blue-500 border-blue-500/30"
							: study.kind === "opg"
								? "bg-purple-500/15 text-purple-500 border-purple-500/30"
								: "bg-teal-500/15 text-teal-500 border-teal-500/30"
					}`}
				>
					{isCbct ? (
						<Box className="w-5 h-5" />
					) : study.kind === "opg" ? (
						<Scan className="w-5 h-5" />
					) : (
						<Layers className="w-5 h-5" />
					)}
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 flex-wrap">
						<h4 className="text-xs font-bold text-[var(--ink)] truncate">
							{study.title}
						</h4>
						{study.toothCode && (
							<span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
								Зуб #{study.toothCode}
							</span>
						)}
					</div>

					<div className="flex items-center gap-3 text-xs text-[var(--muted)] mt-1 flex-wrap">
						<span>
							Дата:{" "}
							<strong className="text-[var(--ink)]">
								{study.capturedAt
									? new Date(study.capturedAt).toLocaleDateString("ru-RU", {
											day: "2-digit",
											month: "2-digit",
											year: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})
									: study.studyDate || "—"}
							</strong>
						</span>
						<span>Серия: {study.seriesDescription || study.sourceName}</span>
						{study.sliceCount && (
							<span className="font-semibold text-blue-600 dark:text-blue-400">
								{study.sliceCount} срез. ({study.voxelSpacing || "0.2mm"})
							</span>
						)}
					</div>

					{/* Блок привязки пациента */}
					<div className="flex items-center gap-2 mt-1.5 flex-wrap">
						<div className="inline-flex items-center gap-1 text-xs font-medium text-[var(--ink)]">
							<User className="w-3.5 h-3.5 text-[var(--muted)]" />
							<span>
								Пациент:{" "}
								<strong
									className={
										study.patientFullName ? "text-[var(--ink)]" : "text-amber-500"
									}
								>
									{study.patientFullName || "Не привязан к базе"}
								</strong>
							</span>
						</div>

						{study.dicomPatientName && (
							<span className="text-xs text-[var(--muted)] font-mono">
								(DICOM: {study.dicomPatientName})
							</span>
						)}

						{/* Бейдж статуса */}
						{study.bindingStatus === "manual_bound" ? (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
								<Check className="w-3 h-3" />
								<span>Подтверждено врачом</span>
							</span>
						) : study.bindingStatus === "auto_bound" ? (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
								<Sparkles className="w-3 h-3" />
								<span>Привязано по ФИО ({study.bindingConfidence || 95}%)</span>
							</span>
						) : study.bindingStatus === "pending_review" ? (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40">
								<AlertCircle className="w-3 h-3" />
								<span>Ожидает контроля ({study.bindingConfidence || 75}%)</span>
							</span>
						) : (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30">
								<span>Не привязано</span>
							</span>
						)}

						{study.archivePath && (
							<span
								className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
								title={`Архив-источник КТ: ${study.archivePath}`}
								data-testid={`badge-archive-${study.id}`}
							>
								<Archive className="w-3 h-3" />
								<span>Архив КТ</span>
							</span>
						)}
					</div>
				</div>
			</div>

			{/* Правая колонка: Кнопки действий */}
			<div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
				{/* Контроль сопоставления */}
				<button
					type="button"
					onClick={() => onControlBinding(study)}
					className="h-8 px-3 text-[13px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
					data-testid={`btn-control-binding-${study.id}`}
					title="Контроль привязки к пациенту / смена / отвязка"
				>
					<Settings className="w-3.5 h-3.5 text-[var(--muted)]" />
					<span>Контроль</span>
				</button>

				{/* Запуск 3D Студии */}
				{isCbct && onOpenStudio && (
					<button
						type="button"
						onClick={() => onOpenStudio(study)}
						className="h-8 px-3.5 text-[13px] font-semibold rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:opacity-95 active:scale-95"
						data-testid={`btn-open-studio-${study.id}`}
						title="Запустить 3D КЛКТ Студию планирования имплантации"
					>
						<Box className="w-3.5 h-3.5" />
						<span>3D Студия</span>
					</button>
				)}

				{/* Запуск в 2D Рентген-просмотрщике */}
				{onOpenSensorViewer && !isCbct && (
					<button
						type="button"
						onClick={() => onOpenSensorViewer(study)}
						className="h-8 px-3 text-[13px] font-medium rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
						data-testid={`btn-open-sensor-${study.id}`}
						title="Открыть снимок в 2D Рентген-просмотрщике с калибровкой и фильтрами"
					>
						<Sparkles className="w-3.5 h-3.5 text-emerald-500" />
						<span>2D Сенсор</span>
					</button>
				)}

				{/* Просмотр снимка */}
				{onOpenViewer && (
					<button
						type="button"
						onClick={() => onOpenViewer(study)}
						className="h-8 px-3 text-[13px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-teal-500 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
						data-testid={`btn-open-viewer-${study.id}`}
						title="Открыть снимок в просмотрщике"
					>
						<Eye className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
						<span>Просмотр</span>
					</button>
				)}
			</div>
		</div>
	);
};
