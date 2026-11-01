/**
 * apps/web/src/components/telephony/TelephonyStudioModal.tsx
 *
 * DENTE Dental CRM — Telephony Studio & Calls Journal SSOT Modal.
 * Red Team Inquisitor Edition: Exactly 1 Primary CTA #0d9488, 0 Disabled Locks, Apple HIG (390x844).
 * Mandates 8b (Sweet Spot 400-480 lines), 8e (Doctor Autonomy), 8am (Single CTA), 8x (Domain Purity).
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
	Phone,
	PhoneCall,
	X,
	Calendar,
	User,
	MessageCircle,
	AlertTriangle,
	Delete,
	Check,
} from "lucide-react";
import { CallAudioPlayer } from "./CallAudioPlayer";
import {
	type TelephonyCatalogCall,
	type TelephonyFilterType,
	TELEPHONY_CATALOG_DATA,
	TELEPHONY_CALL_TYPES,
	DIALPAD_KEYS,
	formatPhoneRu,
	playSafeWebAudioTone,
	triggerOpenPatientCard,
	triggerBookAppointment,
	triggerCreatePatient,
	getWhatsAppUrl,
} from "./telephonyCatalogData";
import { TelephonyCallList } from "./TelephonyCallList";
import { useTelephonyStore } from "../../store/telephonyStore";
import "./styles/telephonyStudio.css";

export interface TelephonyStudioModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialSelectedCallId?: string;
	onBookAppointment?: (patientId: string, phone: string, name: string) => void;
	onOpenPatientCard?: (patientId: string) => void;
}

const QUICK_NOTE_PRESETS = [
	"Записан на приём",
	"Уточнение стоимости",
	"Острая боль",
	"Перезвонить после 18:00",
] as const;

export const TelephonyStudioModal: React.FC<TelephonyStudioModalProps> = ({
	isOpen,
	onClose,
	initialSelectedCallId,
	onBookAppointment,
	onOpenPatientCard,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeFilter, setActiveFilter] = useState<TelephonyFilterType>("all");
	const [selectedCallId, setSelectedCallId] = useState<string>(
		initialSelectedCallId || TELEPHONY_CATALOG_DATA[0]?.id || "",
	);
	const [dialedNumber, setDialedNumber] = useState("");
	const [activeMobileTab, setActiveMobileTab] = useState<"journal" | "dialer">("journal");
	const [callNote, setCallNote] = useState("");
	const [isNoteSaved, setIsNoteSaved] = useState(false);

	// Reactive integration with live telephony store
	const activeLineId = useTelephonyStore((s) => s.activeLineId);

	// Filter call list
	const filteredCalls = useMemo(() => {
		return TELEPHONY_CATALOG_DATA.filter((call) => {
			if (activeFilter === "missed" && !TELEPHONY_CALL_TYPES[call.callType].isMissed) return false;
			if (activeFilter === "recorded" && !call.hasRecording) return false;
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				call.callerName.toLowerCase().includes(q) ||
				call.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
				(call.attendingDoctor && call.attendingDoctor.toLowerCase().includes(q))
			);
		});
	}, [activeFilter, searchQuery]);

	const selectedCall: TelephonyCatalogCall | undefined = useMemo(() => {
		return TELEPHONY_CATALOG_DATA.find((c) => c.id === selectedCallId) || filteredCalls[0];
	}, [selectedCallId, filteredCalls]);

	// Reset note saved indicator when switching call
	useEffect(() => {
		setIsNoteSaved(false);
		setCallNote("");
	}, [selectedCallId]);

	const handleDigitClick = useCallback((digit: string) => {
		playSafeWebAudioTone(600, 100);
		setDialedNumber((prev) => prev + digit);
	}, []);

	const handleBackspace = useCallback(() => {
		setDialedNumber((prev) => prev.slice(0, -1));
	}, []);

	const handleOpenCard = useCallback(() => {
		if (!selectedCall) return;
		if (onOpenPatientCard && selectedCall.patientId) {
			onOpenPatientCard(selectedCall.patientId);
		} else if (selectedCall.patientId) {
			triggerOpenPatientCard(selectedCall.patientId);
		} else {
			triggerCreatePatient(selectedCall.phone);
		}
		onClose();
	}, [selectedCall, onOpenPatientCard, onClose]);

	const handleBookAction = useCallback(() => {
		if (!selectedCall) return;
		if (onBookAppointment && selectedCall.patientId) {
			onBookAppointment(selectedCall.patientId, selectedCall.phone, selectedCall.callerName);
		} else {
			triggerBookAppointment(
				selectedCall.patientId || undefined,
				selectedCall.phone,
				selectedCall.callerName,
			);
		}
		onClose();
	}, [selectedCall, onBookAppointment, onClose]);

	// Single Primary CTA handler: saves note or makes dialer call
	const handlePrimaryAction = useCallback(() => {
		playSafeWebAudioTone(880, 200);
		if (dialedNumber.length >= 3) {
			window.dispatchEvent(
				new CustomEvent("dente:telephony-dial", { detail: { phone: dialedNumber } }),
			);
			onClose();
			return;
		}

		// Save call note (0-disabled, Doctor Autonomy Mandate 8e)
		setIsNoteSaved(true);
		window.dispatchEvent(
			new CustomEvent("dente:telephony-note-saved", {
				detail: {
					callId: selectedCall?.id,
					patientId: selectedCall?.patientId,
					note: callNote.trim() || "Заметка звонка зафиксирована без комментариев",
					timestamp: new Date().toISOString(),
				},
			}),
		);
		setTimeout(() => setIsNoteSaved(false), 2500);
	}, [dialedNumber, selectedCall, callNote, onClose]);

	if (!isOpen) return null;

	const hasDialed = dialedNumber.trim().length > 0;
	const primaryCtaLabel = hasDialed
		? `Позвонить на ${formatPhoneRu(dialedNumber)}`
		: isNoteSaved
			? "✓ Заметка сохранена"
			: "✓ Сохранить заметку звонка";

	return (
		<div
			data-testid="telephony-studio-modal-root"
			className="dnt-telephony-studio-overlay"
		>
			<div
				className="dnt-telephony-studio-window animate-in fade-in zoom-in-95 duration-150"
				role="dialog"
				aria-modal="true"
				aria-label="Телефония и журнал звонков"
			>
				{/* Mobile Drag Handle (Apple HIG, Mandate 8am) */}
				<div className="sm:hidden flex justify-center pt-2 pb-1">
					<div className="dnt-telephony-mobile-drag-handle" />
				</div>

				{/* Header (1-line, Mandate 8am) */}
				<div className="dnt-telephony-header">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] flex items-center justify-center font-bold shrink-0">
							<Phone className="w-4 h-4" />
						</div>
						<div className="min-w-0">
							<h2 className="dnt-telephony-header-title truncate">
								<span className="sm:hidden">Звонки</span>
								<span className="hidden sm:inline">Телефония и журнал звонков</span>
							</h2>
							<div className="dnt-telephony-header-status truncate">
								<span className="dnt-telephony-status-dot" />
								<span className="sm:hidden">Онлайн</span>
								<span className="hidden sm:inline">Линия {activeLineId}: онлайн (SIP АТС подключена)</span>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						{/* Mobile Tab Switcher */}
						<div className="flex sm:hidden bg-[var(--paper-secondary,#f1f5f9)] p-0.5 rounded-lg border border-[var(--line)]">
							<button
								type="button"
								onClick={() => setActiveMobileTab("journal")}
								className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
									activeMobileTab === "journal"
										? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
										: "bg-transparent text-[var(--ink-secondary)] hover:text-[var(--ink)]"
								}`}
							>
								Журнал
							</button>
							<button
								type="button"
								onClick={() => setActiveMobileTab("dialer")}
								className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
									activeMobileTab === "dialer"
										? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
										: "bg-transparent text-[var(--ink-secondary)] hover:text-[var(--ink)]"
								}`}
							>
								Набор
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							data-testid="telephony-studio-close-btn"
							aria-label="Закрыть"
							className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink-secondary)] hover:bg-[var(--paper-secondary)] transition-colors cursor-pointer"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Studio Body: Split View on Desktop */}
				<div className="dnt-telephony-split">
					{/* Left Column: Call Log Journal */}
					<TelephonyCallList
						calls={filteredCalls}
						selectedCallId={selectedCall?.id || ""}
						onSelectCall={(id) => {
							setSelectedCallId(id);
							setActiveMobileTab("dialer");
						}}
						searchQuery={searchQuery}
						onSearchChange={setSearchQuery}
						activeFilter={activeFilter}
						onFilterChange={setActiveFilter}
						activeMobileTab={activeMobileTab}
					/>

					{/* Right Column: Active Caller Card & Dialpad Studio */}
					<div
						className={`dnt-telephony-details-pane ${
							activeMobileTab === "dialer" ? "" : "is-mobile-hidden"
						}`}
					>
						<div className="flex-1 overflow-y-auto p-4 pb-6 space-y-4">
							{/* Patient Card View (Mandate 8e: Doctor Autonomy) */}
							{selectedCall && (
								<div className="bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl p-4 shadow-xs space-y-3">
									<div className="flex items-start justify-between gap-3">
										<div>
											<div className="flex items-center gap-2 mb-1">
												<span className="text-xs px-2 py-0.5 rounded-md bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] font-semibold border border-[var(--teal,#0d9488)]/20">
													{selectedCall.patientCategory}
												</span>
												{selectedCall.balanceRub !== 0 && (
													<span
														className={`text-xs px-2 py-0.5 rounded-md font-medium border ${
															selectedCall.balanceRub < 0
																? "bg-[var(--danger,#ef4444)]/10 text-[var(--danger,#ef4444)] border-[var(--danger,#ef4444)]/20"
																: "bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]/20"
														}`}
													>
														Баланс: {selectedCall.balanceRub.toLocaleString("ru-RU")} ₽
													</span>
												)}
											</div>
											<h3 className="text-base sm:text-lg font-bold text-[var(--ink)]">
												{selectedCall.callerName}
											</h3>
											<p className="text-xs sm:text-sm text-[var(--ink-secondary)] font-mono">
												{formatPhoneRu(selectedCall.phone)}
											</p>
										</div>

										<div className="flex items-center gap-2">
											<a
												href={getWhatsAppUrl(selectedCall.phone)}
												target="_blank"
												rel="noreferrer"
												className="dnt-telephony-secondary-btn"
												title="Открыть диалог WhatsApp"
											>
												<MessageCircle className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
												<span className="hidden sm:inline">WhatsApp</span>
											</a>
											<button
												type="button"
												onClick={handleOpenCard}
												data-testid="telephony-open-patient-card-btn"
												className="dnt-telephony-secondary-btn"
												title="Открыть медицинскую карту пациента"
											>
												<User className="w-3.5 h-3.5" />
												<span>{selectedCall.patientId ? "Карта" : "Создать"}</span>
											</button>
										</div>
									</div>

									{/* Clinical Details */}
									{selectedCall.clinicalNote && (
										<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-xs text-[var(--ink-secondary)] leading-relaxed">
											<span className="font-semibold text-[var(--ink)]">Клинический статус: </span>
											{selectedCall.clinicalNote}
											{selectedCall.attendingDoctor && (
												<span className="block mt-1 text-[var(--ink-muted)]">
													Лечащий врач: {selectedCall.attendingDoctor}
												</span>
											)}
										</div>
									)}

									{/* Somatic Alert (Mandate 8y: Passive Warning Only, No Locks) */}
									{selectedCall.somaticAlert && (
										<div className="p-2.5 rounded-lg bg-[var(--danger,#ef4444)]/10 border border-[var(--danger,#ef4444)]/25 text-xs text-[var(--danger,#ef4444)] font-medium flex items-center gap-2">
											<AlertTriangle className="w-4 h-4 shrink-0" />
											<span>{selectedCall.somaticAlert}</span>
										</div>
									)}

									{/* Audio Player for Recorded Calls: Canonical CallAudioPlayer SSOT */}
									{selectedCall.hasRecording && (
										<div className="pt-1">
											<CallAudioPlayer
												recordingUrl={
													selectedCall.recordingUrl ||
													`https://dente.local/api/telephony/recordings/${selectedCall.id}.mp3`
												}
												durationSeconds={selectedCall.durationSeconds || 0}
												seed={selectedCall.id}
												transcript={
													selectedCall.transcriptSnippet
														? [
																{
																	speaker: "operator",
																	startTimeSeconds: 0,
																	endTimeSeconds: 4,
																	text: "Стоматология DENTE, администратор слушает вас.",
																	confidence: 0.98,
																	sentiment: "positive",
																},
																{
																	speaker: "patient",
																	startTimeSeconds: 5,
																	endTimeSeconds: Math.max(
																		8,
																		selectedCall.durationSeconds || 8,
																	),
																	text: selectedCall.transcriptSnippet,
																	confidence: 0.96,
																	sentiment: "neutral",
																},
															]
														: undefined
												}
											/>
										</div>
									)}

									{/* Call Note & Express Summary */}
									<div className="pt-2 border-t border-[var(--line)] space-y-2">
										<div className="flex items-center justify-between">
											<span className="text-xs font-semibold text-[var(--ink-secondary)]">
												Заметка по звонку
											</span>
											<span className="text-[10px] text-[var(--ink-muted)]">
												Автосохранение в историю
											</span>
										</div>

										<div className="flex flex-wrap gap-1.5">
											{QUICK_NOTE_PRESETS.map((preset) => (
												<button
													key={preset}
													type="button"
													onClick={() => setCallNote((prev) => (prev ? `${prev}. ${preset}` : preset))}
													className="dnt-telephony-preset-chip"
												>
													+ {preset}
												</button>
											))}
										</div>

										<textarea
											value={callNote}
											onChange={(e) => setCallNote(e.target.value)}
											placeholder="Укажите причину обращения или договорённость..."
											data-testid="telephony-call-note-input"
											className="dnt-telephony-note-textarea"
										/>
									</div>
								</div>
							)}

							{/* Dialpad Section (Apple HIG >= 44x44px Touch Targets) */}
							<div className="bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl p-3 sm:p-4 shadow-xs">
								<div className="flex items-center justify-between mb-3 px-1">
									<span className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
										Быстрый набор
									</span>
									<div className="flex items-center gap-2">
										<input
											type="text"
											readOnly
											value={dialedNumber ? formatPhoneRu(dialedNumber) : ""}
											placeholder="Номер абонента..."
											data-testid="telephony-dialed-display"
											className="text-right font-mono text-sm sm:text-base font-semibold bg-transparent text-[var(--ink)] outline-hidden w-44"
										/>
										{dialedNumber && (
											<button
												type="button"
												onClick={handleBackspace}
												aria-label="Стереть"
												className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
											>
												<Delete className="w-4 h-4" />
											</button>
										)}
									</div>
								</div>

								{/* Dialpad Grid: 3x4 */}
								<div className="dnt-telephony-dialpad-grid">
									{DIALPAD_KEYS.map((k) => (
										<button
											key={k.digit}
											type="button"
											onClick={() => handleDigitClick(k.digit)}
											data-testid={`dialpad-key-${k.digit}`}
											className="dnt-telephony-dialpad-btn"
										>
											<span className="dnt-telephony-dialpad-digit">{k.digit}</span>
											{k.sub && (
												<span className="dnt-telephony-dialpad-sub">
													{k.sub}
												</span>
											)}
										</button>
									))}
								</div>
							</div>
						</div>

						{/* Footer: Exactly 1 Primary CTA Button (Mandates 8am, 8e & 8x) */}
						<div className="p-3 sm:p-4 border-t border-[var(--line)] bg-[var(--paper-strong)] shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
							<div className="flex items-center gap-2 w-full sm:w-auto">
								<button
									type="button"
									onClick={handleBookAction}
									data-testid="telephony-secondary-book-btn"
									className="dnt-telephony-secondary-btn flex-1 sm:flex-initial"
								>
									<Calendar className="w-3.5 h-3.5" />
									<span>Записать на приём</span>
								</button>
							</div>

							<button
								type="button"
								onClick={handlePrimaryAction}
								data-testid="telephony-primary-cta-btn"
								className="dnt-telephony-primary-cta w-full sm:w-auto"
							>
								{hasDialed ? (
									<PhoneCall className="w-4 h-4" />
								) : isNoteSaved ? (
									<Check className="w-4 h-4" />
								) : (
									<Phone className="w-4 h-4" />
								)}
								<span>{primaryCtaLabel}</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TelephonyStudioModal;
