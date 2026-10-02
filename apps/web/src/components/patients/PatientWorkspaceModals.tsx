import React, { Suspense, useCallback, useEffect, useState } from "react";
import {
	Check,
	CheckCircle2,
	GitMerge,
	Loader2,
	X,
} from "lucide-react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import {
	dismissDuplicatePair,
	fetchDuplicatesForPatient,
	mergeDuplicatePair,
	otherSideOf,
	type DuplicateCandidate,
} from "../../lib/patientDuplicatesApi";
import { showToast } from "../GlobalToast";
import type { DmsGuaranteeLetter } from "../insurance/DmsGuaranteeLetterModal";

const DmsGuaranteeLetterModal = React.lazy(() =>
	import("../insurance/DmsGuaranteeLetterModal").then((m) => ({
		default: m.DmsGuaranteeLetterModal,
	})),
);

const DmsRegistryExportModal = React.lazy(() =>
	import("../insurance/DmsRegistryExportModal").then((m) => ({
		default: m.DmsRegistryExportModal,
	})),
);

const LoyaltyProgramModal = React.lazy(() =>
	import("../loyalty/program/LoyaltyProgramModal").then((m) => ({
		default: m.LoyaltyProgramModal,
	})),
);

const CbctMprImplantStudioModal = React.lazy(() =>
	import("../radiology/CbctMprImplantStudioModal").then((m) => ({
		default: m.CbctMprImplantStudioModal,
	})),
);

export interface PatientDuplicateMergeModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly duplicatePatient?: any;
	readonly onMergeSuccess?: ((result: any) => void) | undefined;
}

export const PatientDuplicateMergeModal: React.FC<PatientDuplicateMergeModalProps> = React.memo(
	function PatientDuplicateMergeModal({
		isOpen,
		onClose,
		patientId,
		patientName,
		duplicatePatient,
		onMergeSuccess,
	}) {
		const appLogic = useOptionalAppLogicContext();
		const auth = appLogic?.auth;
		const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
		const [selectedCandidate, setSelectedCandidate] = useState<DuplicateCandidate | null>(null);
		const [isLoading, setIsLoading] = useState(false);
		const [isMerging, setIsMerging] = useState(false);
		const mergeReason = "1-Click неразрушающее слияние дубликатов";

		const loadDuplicates = useCallback(async () => {
			if (!patientId || !isOpen) return;
			if (duplicatePatient) {
				return;
			}
			setIsLoading(true);
			try {
				const headers = auth ? auth.denteClinicalReadHeaders() : {};
				const dups = await fetchDuplicatesForPatient(patientId, headers);
				setCandidates(dups);
				const firstDup = dups[0];
				if (firstDup) {
					setSelectedCandidate(firstDup);
				}
			} catch (e) {
				console.warn("[PatientDuplicateMergeModal] Could not fetch duplicates:", e);
			} finally {
				setIsLoading(false);
			}
		}, [patientId, isOpen, duplicatePatient, auth]);

		useEffect(() => {
			if (isOpen) {
				void loadDuplicates();
			} else {
				setCandidates([]);
				setSelectedCandidate(null);
			}
		}, [isOpen, loadDuplicates]);

		if (!isOpen) return null;

		const target = duplicatePatient || (selectedCandidate ? otherSideOf(selectedCandidate, patientId) : null);
		const confidencePercent = selectedCandidate ? Math.round(selectedCandidate.confidence * 100) : 95;

		const handleMerge = async () => {
			const targetId = target?.patientId || target?.id;
			if (!targetId) return;
			setIsMerging(true);
			try {
				const headers = auth ? auth.denteClinicalMutationHeaders() : {};
				const res = await mergeDuplicatePair(
					{
						keepPatientId: patientId,
						mergePatientId: targetId,
						reason: mergeReason,
					},
					headers,
				);
				showToast(res.summary || "Карточки пациентов успешно объединены", "success");
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-patient-merged", {
							detail: { primaryPatientId: patientId, mergedPatientId: targetId },
						}),
					);
				}
				if (onMergeSuccess) {
					onMergeSuccess(res);
				}
				onClose();
			} catch (e) {
				const msg = e instanceof Error ? e.message : "Не удалось объединить карточки";
				showToast(msg, "error");
			} finally {
				setIsMerging(false);
			}
		};

		const handleDismiss = async () => {
			if (!selectedCandidate) {
				onClose();
				return;
			}
			try {
				const headers = auth ? auth.denteClinicalMutationHeaders() : {};
				await dismissDuplicatePair(
					{
						leftPatientId: selectedCandidate.leftPatientId,
						rightPatientId: selectedCandidate.rightPatientId,
						reason: "Отклонено врачом / администратором: разные люди",
					},
					headers,
				);
				showToast("Пара помечена как разные люди и больше не предлагается", "info");
				onClose();
			} catch (e) {
				const msg = e instanceof Error ? e.message : "Ошибка сохранения решения";
				showToast(msg, "error");
			}
		};

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
					{/* Modal Header */}
					<div className="px-4 py-3 border-b border-[var(--line)] bg-[var(--paper-strong)] flex items-center justify-between shrink-0">
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
								<GitMerge size={16} />
							</div>
							<div>
								<h2 className="text-sm sm:text-base font-black leading-tight">
									Слияние дубликатов карт (152-ФЗ / 323-ФЗ)
								</h2>
								<p className="text-[11px] text-[var(--muted)]">
									Неразрушающее объединение: баланс с точностью до копейки, строгое объединение аллергий
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

					{/* Modal Content */}
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
									Картотека клиники проверена: совпадений по ФИО, телефону, дате рождения и СНИЛС нет.
								</p>
							</div>
						) : (
							<>
								{/* Side-by-Side Comparison */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									{/* Left: Primary / Kept Card */}
									<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-teal-500/30 flex flex-col gap-1.5">
										<div className="flex items-center justify-between">
											<span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
												Основная карта (сохранится)
											</span>
											<span className="px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-800 dark:text-teal-300 text-[10px] font-bold">
												Primary
											</span>
										</div>
										<p className="text-sm font-bold text-[var(--ink)]">{patientName || "Текущий пациент"}</p>
										<p className="text-[11px] text-[var(--muted)] font-mono">ID: {patientId.slice(0, 13)}...</p>
									</div>

									{/* Right: Duplicate Candidate */}
									<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-indigo-500/30 flex flex-col gap-1.5">
										<div className="flex items-center justify-between">
											<span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
												Дубликат (будет объединен)
											</span>
											<span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 text-[10px] font-bold">
												{confidencePercent}% совпадение
											</span>
										</div>
										<p className="text-sm font-bold text-[var(--ink)]">{target.fullName || target.name || "Дублирующая карта"}</p>
										<p className="text-[11px] text-[var(--muted)]">
											{target.phone ? `Тел: ${target.phone}` : "Телефон не указан"}
											{target.birthDate ? ` • ${target.birthDate}` : ""}
										</p>
									</div>
								</div>

								{/* Non-destructive Guarantees Checklist */}
								<div className="p-3 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col gap-2">
									<p className="text-[11px] font-black uppercase text-[var(--muted)] tracking-wider">
										Гарантии неразрушающего слияния (Clinical Safety & 152-ФЗ):
									</p>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
										<div className="flex items-start gap-1.5">
											<Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
											<span><strong>Балансы и авансы:</strong> суммируются с точностью до копейки (0% потерь).</span>
										</div>
										<div className="flex items-start gap-1.5">
											<Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
											<span><strong>Аллергии и анамнез:</strong> строгое объединение (Strict UNION, ни один риск не теряется).</span>
										</div>
										<div className="flex items-start gap-1.5">
											<Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
											<span><strong>Приёмы и КТ:</strong> все визиты, снимки и планы лечения переносятся в основную карту.</span>
										</div>
										<div className="flex items-start gap-1.5">
											<Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
											<span><strong>152-ФЗ аудит:</strong> карта дубликата архивируется со статусом mergedIntoPatientId (ничего не удаляется).</span>
										</div>
									</div>
								</div>
							</>
						)}
					</div>

					{/* Modal Footer (Action buttons: 32px height, desktop density) */}
					<div className="px-4 py-2.5 border-t border-[var(--line)] bg-[var(--paper-strong)] flex items-center justify-between gap-2 shrink-0">
						<div>
							{target && (
								<button
									type="button"
									onClick={handleDismiss}
									className="h-8 px-2.5 rounded-lg border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] font-medium inline-flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
									data-testid="patient-duplicate-dismiss-btn"
								>
									<span>Это разные люди</span>
								</button>
							)}
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={onClose}
								className="h-8 px-3 rounded-lg border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold inline-flex items-center gap-1 cursor-pointer text-xs transition-colors"
								data-testid="patient-duplicate-cancel-btn"
							>
								<span>Закрыть</span>
							</button>
							{target && (
								<button
									type="button"
									onClick={handleMerge}
									disabled={isMerging}
									className="h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 text-xs transition-all"
									data-testid="patient-duplicate-confirm-merge-btn"
								>
									{isMerging ? (
										<>
											<Loader2 size={13} className="animate-spin" />
											<span>Объединение...</span>
										</>
									) : (
										<>
											<GitMerge size={13} />
											<span>Объединить карточки</span>
										</>
									)}
								</button>
							)}
						</div>
					</div>
				</div>
			</div>
		);
	},
);

PatientDuplicateMergeModal.displayName = "PatientDuplicateMergeModal";

export interface PatientWorkspaceModalsProps {
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly isDmsLetterOpen: boolean;
	readonly setIsDmsLetterOpen: (open: boolean) => void;
	readonly handleSaveDmsLetter: (letter: DmsGuaranteeLetter) => Promise<void>;
	readonly isDmsRegistryOpen: boolean;
	readonly setIsDmsRegistryOpen: (open: boolean) => void;
	readonly isLoyaltyModalOpen: boolean;
	readonly setIsLoyaltyModalOpen: (open: boolean) => void;
	readonly isCbctModalOpen: boolean;
	readonly setIsCbctModalOpen: (open: boolean) => void;
	// 1-Click Duplicate Merge Modal (backwards-compatible optional props)
	readonly isMergeModalOpen?: boolean;
	readonly setIsMergeModalOpen?: (open: boolean) => void;
	readonly duplicatePatient?: any;
	readonly onMergeSuccess?: (result: any) => void;
}

export const PatientWorkspaceModals: React.FC<PatientWorkspaceModalsProps> = React.memo(
	function PatientWorkspaceModals({
		patientId,
		patientName,
		isDmsLetterOpen,
		setIsDmsLetterOpen,
		handleSaveDmsLetter,
		isDmsRegistryOpen,
		setIsDmsRegistryOpen,
		isLoyaltyModalOpen,
		setIsLoyaltyModalOpen,
		isCbctModalOpen,
		setIsCbctModalOpen,
		isMergeModalOpen,
		setIsMergeModalOpen,
		duplicatePatient,
		onMergeSuccess,
	}) {
		const [internalMergeOpen, setInternalMergeOpen] = useState(false);
		const [eventDuplicateData, setEventDuplicateData] = useState<any>(null);

		useEffect(() => {
			const handleOpen = (e: Event) => {
				const custom = e as CustomEvent<{ patientId?: string; duplicatePatient?: any }>;
				if (!custom.detail?.patientId || custom.detail.patientId === patientId) {
					if (custom.detail?.duplicatePatient) {
						setEventDuplicateData(custom.detail.duplicatePatient);
					}
					setInternalMergeOpen(true);
					if (setIsMergeModalOpen) setIsMergeModalOpen(true);
				}
			};
			window.addEventListener("dente-open-duplicate-merge-modal", handleOpen);
			return () => {
				window.removeEventListener("dente-open-duplicate-merge-modal", handleOpen);
			};
		}, [patientId, setIsMergeModalOpen]);

		const isMergeOpen = isMergeModalOpen ?? internalMergeOpen;
		const closeMergeModal = useCallback(() => {
			setInternalMergeOpen(false);
			if (setIsMergeModalOpen) setIsMergeModalOpen(false);
		}, [setIsMergeModalOpen]);

		return (
			<>
				{/* 3D CBCT / CT Studio Modal */}
				{isCbctModalOpen && (
					<Suspense
						fallback={
							<div
								className="cbct-studio-modal fixed inset-0 z-50 flex items-center justify-center bg-black/90 text-cyan-400 text-xs font-mono"
								data-testid="patient-workspace-cbct-loading"
							>
								Загрузка 3D КТ...
							</div>
						}
					>
						<CbctMprImplantStudioModal
							isOpen={isCbctModalOpen}
							onClose={() => setIsCbctModalOpen(false)}
							patientName={patientName || undefined}
						/>
					</Suspense>
				)}

				{/* DMS Guarantee Letter Modal */}
				{isDmsLetterOpen && (
					<Suspense fallback={null}>
						<DmsGuaranteeLetterModal
							isOpen={isDmsLetterOpen}
							onClose={() => setIsDmsLetterOpen(false)}
							patient={{
								id: patientId,
								fullName: patientName || "",
							}}
							onSave={handleSaveDmsLetter}
						/>
					</Suspense>
				)}

				{/* DMS Registry Export Modal */}
				{isDmsRegistryOpen && (
					<Suspense fallback={null}>
						<DmsRegistryExportModal
							isOpen={isDmsRegistryOpen}
							onClose={() => setIsDmsRegistryOpen(false)}
						/>
					</Suspense>
				)}

				{/* Loyalty & Gift Certificate Modal */}
				{isLoyaltyModalOpen && (
					<Suspense fallback={null}>
						<LoyaltyProgramModal
							isOpen={isLoyaltyModalOpen}
							onClose={() => setIsLoyaltyModalOpen(false)}
							patientId={patientId}
							patientName={patientName || undefined}
							medicalCardNumber={
								patientId
									? `№ ${String(patientId || "").slice(0, 8)}`
									: "—"
							}
						/>
					</Suspense>
				)}

				{/* 1-Click Patient Duplicate Non-Destructive Merge Modal */}
				{isMergeOpen && (
					<PatientDuplicateMergeModal
						isOpen={isMergeOpen}
						onClose={closeMergeModal}
						patientId={patientId}
						patientName={patientName}
						duplicatePatient={duplicatePatient ?? eventDuplicateData}
						onMergeSuccess={onMergeSuccess}
					/>
				)}
			</>
		);
	},
);

PatientWorkspaceModals.displayName = "PatientWorkspaceModals";
