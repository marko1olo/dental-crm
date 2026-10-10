import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	AlertTriangle,
	Check,
	CheckCircle2,
	Clock,
	FileText,
	Layers,
	Link2,
	RefreshCw,
	Search,
	ShieldCheck,
	Unlink,
	User,
	UserCheck,
	X,
} from "lucide-react";
import type { ImagingStudy } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { isDemoShowcaseMode } from "../../../lib/demoMode";

export interface StudyPatientBindControlModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly study: ImagingStudy;
	readonly onStudyUpdated?: ((updatedStudy: ImagingStudy) => void) | undefined;
}

interface PatientSearchCandidate {
	id: string;
	fullName: string;
	birthDate?: string | null;
	phone?: string | null;
	cardNumber?: string | null;
}

const DEMO_FALLBACK_PATIENTS: PatientSearchCandidate[] = [
	{
		id: "01a00000-0000-0000-0000-000000000001",
		fullName: "Захаров Иван Дмитриевич",
		birthDate: "1985-04-12",
		phone: "+7 (916) 123-45-67",
		cardNumber: "МК-043/у-01",
	},
	{
		id: "01a00000-0000-0000-0000-000000000002",
		fullName: "Иванов Алексей Сергеевич",
		birthDate: "1992-08-24",
		phone: "+7 (926) 987-65-43",
		cardNumber: "МК-043/у-02",
	},
	{
		id: "01a00000-0000-0000-0000-000000000003",
		fullName: "Смирнова Елена Александровна",
		birthDate: "1988-11-03",
		phone: "+7 (903) 555-12-34",
		cardNumber: "МК-043/у-03",
	},
	{
		id: "01a00000-0000-0000-0000-000000000004",
		fullName: "Кузнецов Дмитрий Павлович",
		birthDate: "1979-02-17",
		phone: "+7 (915) 333-88-99",
		cardNumber: "МК-043/у-04",
	},
];

/**
 * StudyPatientBindControlModal — Контроль врачом автопривязки КТ/рентгена к пациенту.
 *
 * МАНДАТЫ ВРАЧЕБНОЙ АВТОНОМИИ И ЭРГОНОМИКИ:
 * 1. Врач видит исходные данные из DICOM хедера (ФИО, дата рождения, ID исследования).
 * 2. Врач видит автоматическое сопоставление с пациентом клиники и процент уверенности (например 95%).
 * 3. 1-клик действия: [✓ Подтвердить привязку], [🔍 Сменить пациента (поиск)], [✕ Отвязать].
 * 4. Плотная эргономика десктопа (кнопки 32–36px) и адаптивность под тач (44x44px хитбоксы).
 * 5. Строго 0 эмодзи — векторные иконки Lucide.
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

	// Поиск пациентов в базе клиники с защитой от race conditions (AbortController & sequence counter)
	const handleSearchPatients = useCallback(async (query: string) => {
		setSearchQuery(query);
		const trimmed = query.trim().toLowerCase();

		// Отменяем предыдущий активный запрос поиска
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
						DEMO_FALLBACK_PATIENTS.filter(p =>
							p.fullName.toLowerCase().includes(trimmed) || (p.phone && p.phone.includes(trimmed))
						)
					);
				}
			} else {
				if (isDemoShowcaseMode()) {
					setSearchResults(
						DEMO_FALLBACK_PATIENTS.filter(p =>
							p.fullName.toLowerCase().includes(trimmed) || (p.phone && p.phone.includes(trimmed))
						)
					);
				} else {
					setSearchResults([]);
				}
			}
		} catch (err: any) {
			if (err?.name === "AbortError") {
				return;
			}
			if (seq !== searchSeqRef.current) return;
			if (isDemoShowcaseMode()) {
				setSearchResults(
					DEMO_FALLBACK_PATIENTS.filter(p =>
						p.fullName.toLowerCase().includes(trimmed) || (p.phone && p.phone.includes(trimmed))
					)
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
			// Fallback для демонстрационного режима
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

					{/* Поиск и смена пациента */}
					{showSearchBox ? (
						<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2">
							<div className="flex items-center justify-between gap-2">
								<span className="font-bold text-[var(--ink)]">Поиск пациента по базе:</span>
								<button
									type="button"
									onClick={() => setShowSearchBox(false)}
									className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
								>
									Отмена
								</button>
							</div>

							<div className="dente-search-wrap w-full">
								<Search className="dente-search-icon" />
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => handleSearchPatients(e.target.value)}
									placeholder="Введите ФИО, телефон или номер карты..."
									className="dente-search-input"
									autoFocus
								/>
								{searchQuery && (
									<button
										type="button"
										onClick={() => handleSearchPatients("")}
										className="dente-search-clear"
										aria-label="Очистить поиск"
									>
										✕
									</button>
								)}
							</div>

							{isSearching && (
								<div className="text-xs text-[var(--muted)] flex items-center gap-1.5 py-1">
									<RefreshCw className="w-3.5 h-3.5 animate-spin" />
									<span>Поиск в реестре пациентов...</span>
								</div>
							)}

							{searchResults.length > 0 && (
								<div className="flex flex-col gap-1 max-h-36 overflow-y-auto mt-1">
									{searchResults.map((p) => (
										<button
											key={p.id}
											type="button"
											onClick={() => {
												setSelectedPatient(p);
												setShowSearchBox(false);
											}}
											className="w-full text-left p-2 rounded-lg hover:bg-[var(--paper-soft)] flex items-center justify-between text-xs transition-colors cursor-pointer border border-transparent hover:border-[var(--line)]"
										>
											<div className="min-w-0">
												<div className="font-bold text-[var(--ink)] truncate">{p.fullName}</div>
												<div className="text-xs text-[var(--muted)]">
													{p.birthDate ? `${p.birthDate} • ` : ""}
													{p.phone || p.cardNumber || "Без контактов"}
												</div>
											</div>
											<span className="text-xs font-semibold text-teal-600 dark:text-teal-400 shrink-0">
												Выбрать
											</span>
										</button>
									))}
								</div>
							)}
						</div>
					) : (
						<button
							type="button"
							onClick={() => setShowSearchBox(true)}
							className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-teal-500 transition-colors text-[13px] font-medium cursor-pointer shadow-2xs"
							data-testid="btn-open-patient-search"
						>
							<Search className="w-3.5 h-3.5" />
							<span>Сменить пациента (поиск по картотеке)</span>
						</button>
					)}
				</div>

				{/* Footer Actions */}
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
							disabled={isSubmitting || (!isCurrentlyBound && !selectedPatient)}
							className="h-8 px-4 text-[13px] font-semibold rounded-lg bg-[var(--teal)] hover:opacity-95 text-[var(--on-teal,#ffffff)] shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
							data-testid="btn-confirm-binding"
						>
							<Check className="w-3.5 h-3.5" />
							<span>
								{selectedPatient
									? "Привязать к выбранному"
									: isCurrentlyBound
										? "Подтвердить привязку"
										: "Выберите пациента"}
							</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default StudyPatientBindControlModal;
