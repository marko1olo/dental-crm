import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Link2, Unlink, X } from "lucide-react";
import type { ImagingStudy } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import {
	type PatientSearchCandidate,
	StudyPatientBindStudyPreview,
} from "./bindModal/StudyPatientBindStudyPreview";
import {
	DEMO_FALLBACK_PATIENTS,
	StudyPatientBindSearchSection,
} from "./bindModal/StudyPatientBindSearchSection";

export type { PatientSearchCandidate };

export interface StudyPatientBindControlModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly study: ImagingStudy;
	readonly onStudyUpdated?: ((updatedStudy: ImagingStudy) => void) | undefined;
}

/**
 * StudyPatientBindControlModal — Контроль врачом автопривязки КТ/рентгена к пациенту.
 *
 * МАНДАТЫ ВРАЧЕБНОЙ АВТОНОМИИ И ЭРГОНОМИКИ:
 * 1. Врач видит исходные данные из DICOM хедера (ФИО, дата рождения, ID исследования).
 * 2. Врач видит автоматическое сопоставление с пациентом клиники и процент уверенности (например 95%).
 * 3. 1-клик действия: [✓ Подтвердить привязку], [🔍 Сменить пациента (поиск)], [✕ Отвязать].
 * 4. Плотная эргономика десктопа (кнопки 32–36px) и адаптивность под тач (44x44px хитбоксы).
 * 5. Строго 0 эмодзи — векторные иконки Lucide. Ровно 1 Primary CTA кнопка (var(--teal)).
 * 6. Мандат 8e: кнопка действия никогда не блокируется (zero disabled).
 */
export const StudyPatientBindControlModal: React.FC<StudyPatientBindControlModalProps> = ({
	isOpen,
	onClose,
	study,
	onStudyUpdated,
}) => {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [searchResults, setSearchResults] = useState<PatientSearchCandidate[]>([]);
	const [selectedPatient, setSelectedPatient] = useState<PatientSearchCandidate | null>(null);
	const [showSearchBox, setShowSearchBox] = useState(false);

	const searchAbortRef = useRef<AbortController | null>(null);
	const searchSeqRef = useRef<number>(0);

	const dicomName = study.dicomPatientName || "Не указано в DICOM";
	const dicomBirth = study.dicomBirthDate || "Не указана";
	const currentPatientName = study.patientFullName || (study.patientId ? "Пациент привязан" : "Не привязано");
	const confidence = study.bindingConfidence ?? 0;
	const isCurrentlyBound = Boolean(study.patientId);

	// Очистка при открытии/смене исследования и сброс активных запросов
	useEffect(() => {
		setSelectedPatient(null);
		setSearchQuery("");
		setShowSearchBox(false);
		setSearchResults([]);
		if (searchAbortRef.current) {
			searchAbortRef.current.abort();
			searchAbortRef.current = null;
		}
	}, [study.id]);

	// Поиск пациентов в базе клиники с защитой от race conditions
	const handleSearchPatients = useCallback(async (query: string) => {
		setSearchQuery(query);
		const trimmed = query.trim().toLowerCase();

		if (searchAbortRef.current) {
			searchAbortRef.current.abort();
			searchAbortRef.current = null;
		}

		if (trimmed.length < 2) {
			setSearchResults([]);
			setIsSearching(false);
			return;
		}

		const controller = new AbortController();
		searchAbortRef.current = controller;
		const seq = ++searchSeqRef.current;

		setIsSearching(true);
		try {
			const res = await fetch(`/api/patients?search=${encodeURIComponent(trimmed)}`, {
				signal: controller.signal,
			});
			if (seq !== searchSeqRef.current) return;

			if (res.ok) {
				const data = await res.json();
				if (seq !== searchSeqRef.current) return;
				const items: PatientSearchCandidate[] = Array.isArray(data)
					? data
					: Array.isArray(data?.items)
						? data.items
						: [];
				if (items.length > 0 || !isDemoShowcaseMode()) {
					setSearchResults(items);
				} else {
					setSearchResults(
						DEMO_FALLBACK_PATIENTS.filter(
							(p) => p.fullName.toLowerCase().includes(trimmed) || (p.phone && p.phone.includes(trimmed)),
						),
					);
				}
			} else {
				if (isDemoShowcaseMode()) {
					setSearchResults(
						DEMO_FALLBACK_PATIENTS.filter(
							(p) => p.fullName.toLowerCase().includes(trimmed) || (p.phone && p.phone.includes(trimmed)),
						),
					);
				} else {
					setSearchResults([]);
				}
			}
		} catch (err: any) {
			if (err?.name === "AbortError") return;
			if (seq !== searchSeqRef.current) return;
			if (isDemoShowcaseMode()) {
				setSearchResults(
					DEMO_FALLBACK_PATIENTS.filter(
						(p) => p.fullName.toLowerCase().includes(trimmed) || (p.phone && p.phone.includes(trimmed)),
					),
				);
			} else {
				setSearchResults([]);
			}
		} finally {
			if (seq === searchSeqRef.current) {
				setIsSearching(false);
			}
		}
	}, []);

	// Подтверждение привязки (текущей или к выбранному пациенту)
	const handleConfirmBinding = useCallback(async () => {
		const targetPatientId = selectedPatient?.id || study.patientId;
		if (!targetPatientId) {
			showToast("Выберите пациента для привязки исследования", "warning");
			setShowSearchBox(true);
			return;
		}

		setIsSubmitting(true);
		try {
			const res = await fetch(`/api/imaging/studies/${encodeURIComponent(study.id)}/bind-patient`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ patientId: targetPatientId }),
			});

			if (res.ok) {
				const updated = await res.json();
				showToast(`Исследование успешно привязано: ${selectedPatient?.fullName || currentPatientName}`, "success");
				if (onStudyUpdated) onStudyUpdated(updated);
				onClose();
			} else {
				const errData = await res.json().catch(() => ({}));
				showToast(errData.message || "Ошибка при привязке исследования", "error");
			}
		} catch {
			if (!isDemoShowcaseMode()) {
				showToast("Ошибка сети при сохранении привязки исследования", "error");
				return;
			}
			const fallbackUpdated: ImagingStudy = {
				...study,
				patientId: targetPatientId,
				patientFullName: selectedPatient?.fullName || currentPatientName,
				bindingStatus: "manual_bound",
				bindingConfidence: 100,
			};
			showToast(`[Демо] Исследование подтверждено врачом: ${fallbackUpdated.patientFullName}`, "success");
			if (onStudyUpdated) onStudyUpdated(fallbackUpdated);
			onClose();
		} finally {
			setIsSubmitting(false);
		}
	}, [selectedPatient, study, currentPatientName, onStudyUpdated, onClose]);

	// Отвязка от пациента
	const handleUnbind = useCallback(async () => {
		setIsSubmitting(true);
		try {
			const res = await fetch(`/api/imaging/studies/${encodeURIComponent(study.id)}/unbind-patient`, {
				method: "POST",
			});

			if (res.ok) {
				const updated = await res.json();
				showToast("Исследование отвязано от пациента", "info");
				if (onStudyUpdated) onStudyUpdated(updated);
				onClose();
			} else {
				const errData = await res.json().catch(() => ({}));
				showToast(errData.message || "Ошибка при отвязке исследования", "error");
			}
		} catch {
			if (!isDemoShowcaseMode()) {
				showToast("Ошибка сети при отвязке исследования", "error");
				return;
			}
			const fallbackUpdated: ImagingStudy = {
				...study,
				patientId: null,
				patientFullName: null,
				bindingStatus: "unassigned",
				bindingConfidence: 0,
			};
			showToast("[Демо] Исследование отвязано от пациента", "info");
			if (onStudyUpdated) onStudyUpdated(fallbackUpdated);
			onClose();
		} finally {
			setIsSubmitting(false);
		}
	}, [study, onStudyUpdated, onClose]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs text-[var(--ink)]"
			role="dialog"
			aria-modal="true"
			aria-labelledby="bind-control-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="w-full max-w-xl bg-[var(--paper-strong)] border border-[var(--line)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
				onClick={(e) => e.stopPropagation()}
				data-testid="study-bind-control-modal"
			>
				{/* Header */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
							<Link2 className="w-4 h-4" />
						</div>
						<div className="min-w-0">
							<h3 id="bind-control-title" className="text-sm font-bold text-[var(--ink)] truncate">
								Контроль сопоставления КТ / рентгена
							</h3>
							<p className="text-xs text-[var(--muted)] truncate">
								Проверка автопривязки по ФИО и DICOM метаданным
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer"
						aria-label="Закрыть"
						data-testid="btn-close-bind-modal"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Body */}
				<div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-4 text-xs">
					<StudyPatientBindStudyPreview
						study={study}
						dicomName={dicomName}
						dicomBirth={dicomBirth}
						currentPatientName={currentPatientName}
						selectedPatient={selectedPatient}
						confidence={confidence}
						isCurrentlyBound={isCurrentlyBound}
					/>

					<StudyPatientBindSearchSection
						showSearchBox={showSearchBox}
						setShowSearchBox={setShowSearchBox}
						searchQuery={searchQuery}
						isSearching={isSearching}
						searchResults={searchResults}
						handleSearchPatients={handleSearchPatients}
						onSelectPatient={(p) => {
							setSelectedPatient(p);
							setShowSearchBox(false);
						}}
					/>
				</div>

				{/* Footer Actions — Mandate 8e: Zero disabled, exactly 1 Primary CTA */}
				<div className="flex items-center justify-between p-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] flex-wrap gap-2 shrink-0">
					<div className="flex items-center gap-2">
						{isCurrentlyBound && (
							<button
								type="button"
								onClick={handleUnbind}
								disabled={isSubmitting}
								className="h-8 px-3 text-[13px] font-medium rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
								data-testid="btn-unbind-patient"
								title="Отвязать исследование от текущего пациента"
							>
								<Unlink className="w-3.5 h-3.5" />
								<span>Отвязать</span>
							</button>
						)}
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="h-8 px-3.5 text-[13px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer shadow-2xs"
						>
							Отмена
						</button>

						<button
							type="button"
							onClick={handleConfirmBinding}
							className="h-8 px-4 text-[13px] font-semibold rounded-lg bg-[var(--teal,#0d9488)] hover:opacity-95 text-[var(--on-teal,#ffffff)] shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
							data-testid="btn-confirm-binding"
						>
							<Check className="w-3.5 h-3.5" />
							<span>
								{selectedPatient
									? "Привязать к выбранному"
									: isCurrentlyBound
										? "Подтвердить привязку"
										: "Выбрать и привязать"}
							</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default StudyPatientBindControlModal;
