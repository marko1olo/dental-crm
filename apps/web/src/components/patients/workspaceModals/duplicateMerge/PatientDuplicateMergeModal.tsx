import { CheckCircle2, GitMerge, Loader2, X } from "lucide-react";
import React from "react";
import { DuplicateComparisonCard } from "./DuplicateComparisonCard";
import { DuplicateMergeFooter } from "./DuplicateMergeFooter";
import { DuplicateSafetyChecklist } from "./DuplicateSafetyChecklist";
import type { PatientDuplicateMergeModalProps } from "./types";
import { useDuplicateMergeLogic } from "./useDuplicateMergeLogic";

export const PatientDuplicateMergeModal: React.FC<PatientDuplicateMergeModalProps> =
	React.memo(function PatientDuplicateMergeModal(props) {
		const { isOpen, onClose, patientId, patientName } = props;
		const {
			isLoading,
			isMerging,
			target,
			confidencePercent,
			handleMerge,
			handleDismiss,
		} = useDuplicateMergeLogic(props);

		if (!isOpen) return null;

		return (
			<div
				className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
				role="dialog"
				aria-modal="true"
				data-testid="patient-duplicate-merge-modal"
			>
				<div
					className="w-full max-w-2xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="px-4 py-3 border-b border-[var(--line)] bg-[var(--paper-strong)] flex items-center justify-between shrink-0">
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
								<GitMerge size={16} />
							</div>
							<div>
								<h2 className="text-sm sm:text-base font-black leading-tight">
									Слияние дубликатов медицинских карт
								</h2>
								<p className="text-[11px] text-[var(--muted)]">
									Неразрушающее объединение: баланс с точностью до копейки,
									строгое объединение аллергий
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="w-7 h-7 rounded-lg hover:bg-[var(--paper-soft)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
							aria-label="Закрыть модальное окно"
							data-testid="patient-duplicate-merge-close-btn"
						>
							<X size={15} />
						</button>
					</div>

					<div className="p-4 overflow-y-auto flex flex-col gap-4 text-xs">
						{isLoading ? (
							<div className="py-12 flex flex-col items-center justify-center gap-2 text-[var(--muted)]">
								<Loader2 size={24} className="animate-spin text-teal-600" />
								<span>Поиск дубликатов в базе данных...</span>
							</div>
						) : !target ? (
							<div className="py-8 text-center flex flex-col items-center gap-2 text-[var(--muted)]">
								<CheckCircle2 size={32} className="text-emerald-500" />
								<p className="font-semibold text-[var(--ink)]">
									Потенциальных дубликатов для данного пациента не найдено.
								</p>
								<p className="text-[11px]">
									Картотека клиники проверена: совпадений по ФИО, телефону, дате
									рождения и СНИЛС нет.
								</p>
							</div>
						) : (
							<>
								<DuplicateComparisonCard
									patientName={patientName}
									patientId={patientId}
									target={target}
									confidencePercent={confidencePercent}
								/>
								<DuplicateSafetyChecklist />
							</>
						)}
					</div>

					<DuplicateMergeFooter
						target={target}
						isMerging={isMerging}
						onDismiss={handleDismiss}
						onClose={onClose}
						onMerge={handleMerge}
					/>
				</div>
			</div>
		);
	});

PatientDuplicateMergeModal.displayName = "PatientDuplicateMergeModal";
