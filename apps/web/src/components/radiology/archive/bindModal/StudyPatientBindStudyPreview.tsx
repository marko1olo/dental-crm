import React from "react";
import { FileText, UserCheck } from "lucide-react";
import type { ImagingStudy } from "@dental/shared";

export interface PatientSearchCandidate {
	id: string;
	fullName: string;
	birthDate?: string | null;
	phone?: string | null;
	cardNumber?: string | null;
}

export interface StudyPatientBindStudyPreviewProps {
	readonly study: ImagingStudy;
	readonly dicomName: string;
	readonly dicomBirth: string;
	readonly currentPatientName: string;
	readonly selectedPatient: PatientSearchCandidate | null;
	readonly confidence: number;
	readonly isCurrentlyBound: boolean;
}

export const StudyPatientBindStudyPreview: React.FC<StudyPatientBindStudyPreviewProps> = ({
	study,
	dicomName,
	dicomBirth,
	currentPatientName,
	selectedPatient,
	confidence,
	isCurrentlyBound,
}) => {
	return (
		<>
			{/* Исследование информация */}
			<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-1.5">
				<div className="flex items-center justify-between gap-2">
					<span className="font-bold text-[var(--ink)] text-sm">{study.title}</span>
					<span className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]">
						{study.kind}
					</span>
				</div>
				<div className="flex items-center gap-3 text-[var(--muted)] text-xs flex-wrap">
					<span>Серия: {study.seriesDescription || study.sourceName}</span>
					{study.sliceCount && <span>Срезов: {study.sliceCount}</span>}
					<span>Дата: {study.capturedAt ? new Date(study.capturedAt).toLocaleDateString("ru-RU") : "—"}</span>
				</div>
			</div>

			{/* Сравнение: DICOM vs CRM Пациент */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{/* Блок 1: DICOM Заголовок */}
				<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/50 flex flex-col gap-2">
					<div className="flex items-center gap-1.5 text-[var(--muted)] font-semibold text-xs">
						<FileText className="w-3.5 h-3.5 text-blue-400" />
						<span>Данные из томографа (DICOM):</span>
					</div>
					<div>
						<div className="font-bold text-sm text-[var(--ink)]" data-testid="dicom-patient-name">
							{dicomName}
						</div>
						<div className="text-[var(--muted)] text-xs mt-0.5">
							Дата рожд: <span className="font-medium text-[var(--ink)]">{dicomBirth}</span>
						</div>
						{study.dicomPatientId && (
							<div className="text-[var(--muted)] text-xs mt-0.5 truncate">
								ID исследования: {study.dicomPatientId}
							</div>
						)}
					</div>
				</div>

				{/* Блок 2: Сопоставленный пациент клиники */}
				<div className="p-3.5 rounded-xl border border-teal-500/30 bg-teal-500/5 dark:bg-teal-950/20 flex flex-col gap-2">
					<div className="flex items-center justify-between gap-1.5">
						<div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-semibold text-xs">
							<UserCheck className="w-3.5 h-3.5" />
							<span>Пациент в базе клиники:</span>
						</div>
						{confidence > 0 && (
							<span className="px-2 py-0.5 rounded-md text-xs font-bold bg-teal-500/20 text-teal-700 dark:text-teal-300">
								{confidence}%
							</span>
						)}
					</div>
					<div>
						<div className="font-bold text-sm text-[var(--ink)]" data-testid="crm-matched-patient-name">
							{selectedPatient ? selectedPatient.fullName : currentPatientName}
						</div>
						<div className="text-[var(--muted)] text-xs mt-0.5">
							{selectedPatient ? (
								<span className="text-teal-600 dark:text-teal-400 font-medium">
									Выбран для новой привязки • {selectedPatient.cardNumber || selectedPatient.phone || "Без тел."}
								</span>
							) : isCurrentlyBound ? (
								<span>
									Статус:{" "}
									<strong className="text-[var(--ink)]">
										{study.bindingStatus === "manual_bound"
											? "Подтверждено врачом (100%)"
											: "Автопривязка по ФИО"}
									</strong>
								</span>
							) : (
								<span className="text-amber-600 dark:text-amber-400">
									Пациент еще не привязан к исследованию
								</span>
							)}
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
