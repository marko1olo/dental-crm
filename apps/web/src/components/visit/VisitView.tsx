import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
	Syringe,
	Plus,
	AlertCircle,
	Clock,
	Check,
	X,
	Pause,
	Play,
	UserCheck,
	Calendar,
	ArrowRightLeft,
} from "lucide-react";
import { DentalChairUnit } from "../icons/DentalIcons";
import {
	type DoctorChairSession,
	type ChairSessionStatus,
	type ChairTimerMetrics,
	createDoctorChairSession,
	switchDoctorChair,
	calculateChairTimerMetrics,
	markAnesthesiaAdministered,
	updateChairSessionStatus,
	abortOrRescheduleVisit,
	getDoctorChairSessionsStorageKey,
} from "./clinicalVisitWorkflow";
import { showToast } from "../GlobalToast";
import { VisitView as BaseVisitView } from "../../VisitView";
import type { VisitViewProps } from "../../VisitView";

// Re-export all standard exports from Root VisitView
export * from "../../VisitView";

export interface ChairSwitcherBarProps {
	readonly sessions: readonly DoctorChairSession[];
	readonly activeChairId: string;
	readonly onSwitchChair: (chairId: string) => void;
	readonly onAdministerAnesthesia?: ((chairId: string, drugName?: string, minutes?: number) => void) | undefined;
	readonly onAbortOrReschedule?: ((chairId: string, mode: "aborted" | "rescheduled", reason: string, rescheduledDate?: string) => void) | undefined;
	readonly onAddNewChair?: (() => void) | undefined;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ChairSwitcherBar — панель быстрого переключения кресел для соло-врача
 * ═══════════════════════════════════════════════════════════════════════════
 * Врач в 1 клик переключается между параллельными визитами (Кресло 1 / Кресло 2):
 * - Кресло 1: анестезия введена, таймер экспозиции (8 мин)
 * - Кресло 2: активное препарирование
 * Переключение происходит без перезагрузки страницы и без потери фокуса/данных.
 */
export function ChairSwitcherBar({
	sessions,
	activeChairId,
	onSwitchChair,
	onAdministerAnesthesia,
	onAbortOrReschedule,
	onAddNewChair,
}: ChairSwitcherBarProps) {
	const [nowTick, setNowTick] = useState<number>(Date.now());
	const [isAnesthesiaModalOpen, setIsAnesthesiaModalOpen] = useState(false);
	const [selectedDrug, setSelectedDrug] = useState("Ультракаин Д-С (Артикаин 1:200000)");
	const [anesthesiaMinutes, setAnesthesiaMinutes] = useState(8);

	const [isAbortModalOpen, setIsAbortModalOpen] = useState(false);
	const [abortMode, setAbortMode] = useState<"aborted" | "rescheduled">("aborted");
	const [abortReason, setAbortReason] = useState("");
	const [rescheduleDate, setRescheduleDate] = useState("");

	useEffect(() => {
		const interval = setInterval(() => {
			setNowTick(Date.now());
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	const activeSession = useMemo(
		() => sessions.find((s) => s.chairId === activeChairId) || sessions[0],
		[sessions, activeChairId],
	);

	const handleConfirmAnesthesia = useCallback(() => {
		if (activeSession && onAdministerAnesthesia) {
			onAdministerAnesthesia(activeSession.chairId, selectedDrug, anesthesiaMinutes);
			showToast(`Анестезия введена на ${activeSession.chairName} (ожидание ${anesthesiaMinutes} мин)`, "success");
		}
		setIsAnesthesiaModalOpen(false);
	}, [activeSession, onAdministerAnesthesia, selectedDrug, anesthesiaMinutes]);

	const handleConfirmAbort = useCallback(() => {
		if (activeSession && onAbortOrReschedule) {
			const reasonText = abortReason.trim() || (abortMode === "aborted" ? "По клиническим показаниям" : "По согласованию с пациентом");
			onAbortOrReschedule(activeSession.chairId, abortMode, reasonText, rescheduleDate);
			showToast(
				abortMode === "aborted"
					? `Приём на ${activeSession.chairName} прерван (${reasonText})`
					: `Приём на ${activeSession.chairName} перенесен`,
				"info",
			);
		}
		setIsAbortModalOpen(false);
		setAbortReason("");
	}, [activeSession, onAbortOrReschedule, abortMode, abortReason, rescheduleDate]);

	if (!sessions || sessions.length === 0) return null;

	return (
		<div
			className="chair-switcher-bar bg-[var(--paper-soft)] border border-[var(--glass-border)] rounded-xl p-1.5 mb-2 shadow-xs flex items-center justify-between gap-2 flex-wrap"
			data-testid="chair-switcher-bar"
			role="navigation"
			aria-label="Переключение кресел врача"
		>
			{/* Вкладки параллельных кресел врача */}
			<div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap shrink-0 [scrollbar-width:none]">
				<div className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold text-[var(--muted)] shrink-0">
					<DentalChairUnit size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="hidden md:inline">Кресла:</span>
				</div>

				{sessions.map((session) => {
					const isActive = session.chairId === activeChairId;
					const metrics: ChairTimerMetrics = calculateChairTimerMetrics(session);

					let statusBadgeStyle = "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-400/30";
					let statusIcon = <Clock size={12} className="shrink-0" />;

					if (session.isDoctorPresent) {
						statusBadgeStyle = "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40 font-bold";
						statusIcon = <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />;
					} else if (session.status === "waiting_anesthesia" || (session.anesthesiaStartedAt && !metrics.isAnesthesiaReady)) {
						statusBadgeStyle = "bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-500/40 animate-pulse font-semibold";
						statusIcon = <Syringe size={12} className="text-purple-600 dark:text-purple-400 shrink-0" />;
					} else if (session.status === "paused") {
						statusBadgeStyle = "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40";
						statusIcon = <Pause size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />;
					} else if (session.status === "aborted") {
						statusBadgeStyle = "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/40";
						statusIcon = <AlertCircle size={12} className="text-rose-600 dark:text-rose-400 shrink-0" />;
					} else if (session.status === "rescheduled") {
						statusBadgeStyle = "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/40";
						statusIcon = <Calendar size={12} className="text-sky-600 dark:text-sky-400 shrink-0" />;
					}

					return (
						<button
							key={session.chairId}
							type="button"
							data-testid={`chair-tab-${session.chairId}`}
							onClick={() => onSwitchChair(session.chairId)}
							className={`chair-tab-btn min-h-[32px] h-8 px-2.5 py-0.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 whitespace-nowrap ${
								isActive
									? "bg-[var(--paper-strong)] border-teal-600 text-[var(--ink)] shadow-xs font-bold"
									: "bg-transparent border-transparent text-[var(--muted)] hover:bg-[var(--paper-strong)]/60 hover:text-[var(--ink)]"
							}`}
							title={`Переключиться на ${session.chairName}: ${session.patientName} (${metrics.statusBadge})`}
						>
							<span className="font-bold text-[var(--ink)]">{session.chairName}:</span>
							<span className="truncate max-w-[120px] sm:max-w-[160px]">{session.patientName}</span>
							<span
								className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] shrink-0 tabular-nums ${statusBadgeStyle}`}
							>
								{statusIcon}
								<span>{metrics.statusBadge}</span>
							</span>
						</button>
					);
				})}

				{onAddNewChair && (
					<button
						type="button"
						onClick={onAddNewChair}
						data-testid="btn-add-chair-session"
						className="secondary-button min-h-[28px] h-7 px-2 py-0 text-xs text-[var(--muted)] hover:text-[var(--ink)] flex items-center gap-1 rounded-lg shrink-0 cursor-pointer"
						title="Добавить параллельное кресло / визит"
					>
						<Plus size={13} className="shrink-0" />
						<span className="hidden sm:inline">Кресло</span>
					</button>
				)}
			</div>

			{/* Быстрые действия у активного кресла: анестезия, прерывание, пауза */}
			<div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
				{/* 1-клик ввод анестезии и запуск ожидания */}
				<button
					type="button"
					onClick={() => setIsAnesthesiaModalOpen(true)}
					data-testid="btn-chair-administer-anesthesia"
					className="secondary-button min-h-[28px] h-7 px-2 sm:px-2.5 py-0 text-xs font-semibold text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/10 rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
					title="Ввести анестезию и запустить таймер ожидания (врач может перейти ко 2-му креслу)"
				>
					<Syringe size={13} className="text-purple-600 dark:text-purple-400 shrink-0" />
					<span className="hidden sm:inline">Анестезия (8 мин)</span>
					<span className="sm:hidden">Анестезия</span>
				</button>

				{/* 1-клик прервать / перенести визит (без обязательных полей) */}
				<button
					type="button"
					onClick={() => setIsAbortModalOpen(true)}
					data-testid="btn-chair-abort-visit"
					className="secondary-button min-h-[28px] h-7 px-2 py-0 text-xs font-semibold text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/10 rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
					title="Прервать или перенести приём без обязательного заполнения протокола"
				>
					<AlertCircle size={13} className="text-rose-600 dark:text-rose-400 shrink-0" />
					<span className="hidden lg:inline">Прервать / Перенести</span>
					<span className="lg:hidden">Прервать</span>
				</button>
			</div>

			{/* Модалка ввода анестезии */}
			{isAnesthesiaModalOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
					data-testid="anesthesia-quick-modal"
				>
					<div className="bg-[var(--paper-strong)] border border-[var(--glass-border)] rounded-2xl p-4 sm:p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-100">
						<div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)] mb-3">
							<div className="flex items-center gap-2">
								<Syringe className="text-purple-600 dark:text-purple-400" size={18} />
								<h3 className="font-bold text-sm text-[var(--ink)]">
									Ввести анестезию: {activeSession?.chairName}
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setIsAnesthesiaModalOpen(false)}
								className="text-[var(--muted)] hover:text-[var(--ink)] p-1 rounded-lg cursor-pointer"
							>
								<X size={16} />
							</button>
						</div>

						<p className="text-xs text-[var(--muted)] mb-3">
							Пациент: <span className="font-semibold text-[var(--ink)]">{activeSession?.patientName}</span>.
							Таймер начнет отсчет времени наступления анестезии, а вы сможете перейти к другому креслу.
						</p>

						<div className="space-y-3 mb-4">
							<div>
								<label className="block text-xs font-semibold text-[var(--ink)] mb-1">
									Анестетик:
								</label>
								<select
									value={selectedDrug}
									onChange={(e) => setSelectedDrug(e.target.value)}
									className="w-full text-xs p-2 rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] text-[var(--ink)]"
								>
									<option value="Ультракаин Д-С (Артикаин 1:200000)">Ультракаин Д-С (Артикаин 1:200000)</option>
									<option value="Ультракаин Д-С Форте (Артикаин 1:100000)">Ультракаин Д-С Форте (Артикаин 1:100000)</option>
									<option value="Скандонест 3% (Мепивакаин без адреналина)">Скандонест 3% (Мепивакаин без адреналина)</option>
									<option value="Септанест 1:100000">Септанест 1:100000</option>
								</select>
							</div>

							<div>
								<label className="block text-xs font-semibold text-[var(--ink)] mb-1">
									Время экспозиции: {anesthesiaMinutes} мин
								</label>
								<div className="flex items-center gap-2">
									{[5, 8, 10, 15].map((m) => (
										<button
											key={m}
											type="button"
											onClick={() => setAnesthesiaMinutes(m)}
											className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
												anesthesiaMinutes === m
													? "bg-purple-600 text-white border-purple-600"
													: "bg-[var(--paper)] text-[var(--ink)] border-[var(--glass-border)]"
											}`}
										>
											{m} мин
										</button>
									))}
								</div>
							</div>
						</div>

						<div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--glass-border)]">
							<button
								type="button"
								onClick={() => setIsAnesthesiaModalOpen(false)}
								className="secondary-button text-xs px-3 py-1.5 rounded-lg cursor-pointer"
							>
								Отмена
							</button>
							<button
								type="button"
								onClick={handleConfirmAnesthesia}
								data-testid="btn-confirm-anesthesia"
								className="primary-button bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
							>
								<Check size={14} />
								<span>Зафиксировать анестезию</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Модалка прерывания / переноса приёма */}
			{isAbortModalOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
					data-testid="abort-visit-modal"
				>
					<div className="bg-[var(--paper-strong)] border border-[var(--glass-border)] rounded-2xl p-4 sm:p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-100">
						<div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)] mb-3">
							<div className="flex items-center gap-2">
								<AlertCircle className="text-rose-600 dark:text-rose-400" size={18} />
								<h3 className="font-bold text-sm text-[var(--ink)]">
									Прервать / Перенести визит ({activeSession?.chairName})
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setIsAbortModalOpen(false)}
								className="text-[var(--muted)] hover:text-[var(--ink)] p-1 rounded-lg cursor-pointer"
							>
								<X size={16} />
							</button>
						</div>

						<p className="text-xs text-[var(--muted)] mb-3">
							Закрытие визита без принудительного заполнения всех полей дневника.
							Все уже введенные данные сохранятся в карте как черновик.
						</p>

						<div className="space-y-3 mb-4">
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setAbortMode("aborted")}
									className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
										abortMode === "aborted"
											? "bg-rose-600 text-white border-rose-600"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--glass-border)]"
									}`}
								>
									Прервать приём
								</button>
								<button
									type="button"
									onClick={() => setAbortMode("rescheduled")}
									className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
										abortMode === "rescheduled"
											? "bg-sky-600 text-white border-sky-600"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--glass-border)]"
									}`}
								>
									Перенести визит
								</button>
							</div>

							<div>
								<label className="block text-xs font-semibold text-[var(--ink)] mb-1">
									Причина (неотложное состояние / согласование):
								</label>
								<input
									type="text"
									placeholder={
										abortMode === "aborted"
											? "Например: Аллергическая реакция, гипертонический криз, отказ пациента"
											: "Например: Требуется дообследование КТ, согласован перенос"
									}
									value={abortReason}
									onChange={(e) => setAbortReason(e.target.value)}
									className="w-full text-xs p-2 rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] text-[var(--ink)]"
								/>
							</div>

							{abortMode === "rescheduled" && (
								<div>
									<label className="block text-xs font-semibold text-[var(--ink)] mb-1">
										Новая дата визита:
									</label>
									<input
										type="date"
										value={rescheduleDate}
										onChange={(e) => setRescheduleDate(e.target.value)}
										className="w-full text-xs p-2 rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] text-[var(--ink)]"
									/>
								</div>
							)}
						</div>

						<div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--glass-border)]">
							<button
								type="button"
								onClick={() => setIsAbortModalOpen(false)}
								className="secondary-button text-xs px-3 py-1.5 rounded-lg cursor-pointer"
							>
								Отмена
							</button>
							<button
								type="button"
								onClick={handleConfirmAbort}
								data-testid="btn-confirm-abort-visit"
								className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer text-white ${
									abortMode === "aborted" ? "bg-rose-600 hover:bg-rose-700" : "bg-sky-600 hover:bg-sky-700"
								}`}
							>
								<Check size={14} />
								<span>{abortMode === "aborted" ? "Прервать приём" : "Перенести визит"}</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Enhanced VisitView with Multi-Chair Solo Doctor Support
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function VisitView(rawProps?: Partial<VisitViewProps>) {
	const props = rawProps || {};
	const activeDoctor = props.activeDoctor;
	const activePatient = props.activePatient;
	const activeAppointment = props.activeAppointment;

	// Initial default chair sessions for solo doctor
	const defaultSessions = useMemo<DoctorChairSession[]>(() => {
		const docName = activeDoctor?.fullName || activeDoctor?.name || "Д-р Смирнова А.С.";
		const currentPatName = activePatient?.fullName || activePatient?.name || "Сидоров А.В.";
		const currentPatId = activePatient?.id || "pat-chair-1";
		const currentVisitId = activeAppointment?.id || "vis-chair-1";

		return [
			createDoctorChairSession({
				chairId: "chair-1",
				chairName: "Кресло 1",
				visitId: currentVisitId,
				patientId: currentPatId,
				patientName: currentPatName,
				doctorName: docName,
				isDoctorPresent: true,
			}),
			createDoctorChairSession({
				chairId: "chair-2",
				chairName: "Кресло 2",
				visitId: "vis-chair-2",
				patientId: "pat-chair-2",
				patientName: "Петров В.С.",
				doctorName: docName,
				isDoctorPresent: false,
			}),
		];
	}, [activeDoctor, activePatient, activeAppointment]);

	const [chairSessions, setChairSessions] = useState<DoctorChairSession[]>(() => {
		if (typeof localStorage !== "undefined") {
			try {
				const storageKey = getDoctorChairSessionsStorageKey(activeDoctor?.id);
				const saved = localStorage.getItem(storageKey);
				if (saved) {
					const parsed = JSON.parse(saved);
					if (Array.isArray(parsed) && parsed.length > 0) {
						return parsed;
					}
				}
			} catch {
				// Fallback
			}
		}
		return defaultSessions;
	});

	const [activeChairId, setActiveChairId] = useState<string>(() => {
		return chairSessions[0]?.chairId || "chair-1";
	});

	// Save sessions to storage on change
	useEffect(() => {
		if (typeof localStorage !== "undefined") {
			try {
				const storageKey = getDoctorChairSessionsStorageKey(activeDoctor?.id);
				localStorage.setItem(storageKey, JSON.stringify(chairSessions));
			} catch {
				// Ignore quota error
			}
		}
	}, [chairSessions, activeDoctor?.id]);

	// 1-Click switch active chair without reload
	const handleSwitchChair = useCallback((targetChairId: string) => {
		setChairSessions((prev) => {
			const { updatedSessions, activeSession } = switchDoctorChair(prev, targetChairId);
			if (activeSession) {
				setActiveChairId(activeSession.chairId);
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-switch-chair", {
							detail: {
								chairId: activeSession.chairId,
								visitId: activeSession.visitId,
								patientId: activeSession.patientId,
								patientName: activeSession.patientName,
							},
						}),
					);
				}
			}
			return updatedSessions;
		});
	}, []);

	// Handle administer anesthesia
	const handleAdministerAnesthesia = useCallback((chairId: string, drugName?: string, minutes?: number) => {
		setChairSessions((prev) => markAnesthesiaAdministered(prev, chairId, { drugName, durationMinutes: minutes }));
	}, []);

	// Handle abort or reschedule
	const handleAbortOrReschedule = useCallback(
		(chairId: string, mode: "aborted" | "rescheduled", reason: string, rescheduledDate?: string) => {
			setChairSessions((prev) => {
				const target = prev.find((s) => s.chairId === chairId);
				if (target) {
					abortOrRescheduleVisit({
						visitId: target.visitId,
						patientId: target.patientId,
						patientName: target.patientName,
						doctorName: target.doctorName,
						mode,
						reason,
						rescheduledDateIso: rescheduledDate,
					});
				}
				return updateChairSessionStatus(prev, chairId, mode);
			});
		},
		[],
	);

	// Add chair session
	const handleAddNewChair = useCallback(() => {
		setChairSessions((prev) => {
			const chairNum = prev.length + 1;
			const newChair = createDoctorChairSession({
				chairId: `chair-${chairNum}`,
				chairName: `Кресло ${chairNum}`,
				visitId: `vis-chair-${chairNum}`,
				patientId: `pat-chair-${chairNum}`,
				patientName: `Пациент ${chairNum}`,
				doctorName: activeDoctor?.fullName || activeDoctor?.name || "Врач",
				isDoctorPresent: false,
			});
			return [...prev, newChair];
		});
		showToast("Новое кресло добавлено в рабочую смену", "success");
	}, [activeDoctor]);

	// Listen to external toggle doctor presence
	useEffect(() => {
		const handlePresenceToggle = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (detail?.chairId) {
				setChairSessions((prev) =>
					prev.map((s) =>
						s.chairId === detail.chairId
							? { ...s, isDoctorPresent: Boolean(detail.isDoctorPresent) }
							: s,
					),
				);
			}
		};
		window.addEventListener("dente-toggle-doctor-presence", handlePresenceToggle);
		return () => window.removeEventListener("dente-toggle-doctor-presence", handlePresenceToggle);
	}, []);

	return (
		<div className="multi-chair-visit-wrapper" data-testid="multi-chair-visit-container">
			<ChairSwitcherBar
				sessions={chairSessions}
				activeChairId={activeChairId}
				onSwitchChair={handleSwitchChair}
				onAdministerAnesthesia={handleAdministerAnesthesia}
				onAbortOrReschedule={handleAbortOrReschedule}
				onAddNewChair={handleAddNewChair}
			/>
			<BaseVisitView {...props} />
		</div>
	);
}

export default VisitView;
