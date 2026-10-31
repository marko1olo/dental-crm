/**
 * apps/web/src/components/telephony/TelephonyStudioModal.tsx
 *
 * DENTE Dental CRM — Telephony Studio & Calls Journal Modal.
 * Red Team Inquisitor Edition: Exactly 1 Primary CTA #0d9488, 0 Disabled Locks, Apple HIG (390x844).
 * Mandates 8b (Sweet Spot 350-450 lines, <=500 ceiling), 8e (Doctor Autonomy), 8am (Single CTA), 8x (Domain Purity).
 */

import React, { useState, useMemo, useCallback } from "react";
import {
	Phone,
	PhoneCall,
	X,
	Calendar,
	User,
	MessageCircle,
	AlertTriangle,
	Delete,
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

export interface TelephonyStudioModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialSelectedCallId?: string;
	onBookAppointment?: (patientId: string, phone: string, name: string) => void;
	onOpenPatientCard?: (patientId: string) => void;
}

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

	const handlePrimaryAction = useCallback(() => {
		playSafeWebAudioTone(880, 200);
		if (dialedNumber.length >= 3) {
			window.dispatchEvent(
				new CustomEvent("dente:telephony-dial", { detail: { phone: dialedNumber } }),
			);
			onClose();
			return;
		}
		if (selectedCall) {
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
		}
	}, [dialedNumber, selectedCall, onBookAppointment, onClose]);

	if (!isOpen) return null;

	const hasDialed = dialedNumber.trim().length > 0;
	const primaryCtaLabel = hasDialed
		? `Позвонить на ${formatPhoneRu(dialedNumber)}`
		: selectedCall?.patientId
			? "Записать на приём"
			: "Создать пациента и записать";

	return (
		<div
			data-testid="telephony-studio-modal-root"
			className="fixed inset-0 z-[100000] flex items-center justify-center bg-[var(--ink-base,#090d16)]/60 backdrop-blur-xs p-0 sm:p-4 md:p-6"
		>
			<div
				className="w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[90vh] bg-[var(--paper-strong)] border border-[var(--line)] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[var(--ink)] animate-in fade-in zoom-in-95 duration-150"
				role="dialog"
				aria-modal="true"
				aria-label="Телефония и журнал звонков"
			>
				{/* Mobile Drag Handle */}
				<div className="sm:hidden flex justify-center pt-2 pb-1">
					<div className="w-9 h-1 bg-[var(--line-strong,#cbd5e1)] rounded-full" />
				</div>

				{/* Header (1-line, Mandate 8am) */}
				<div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b border-[var(--line)] bg-[var(--paper)] shrink-0">
					<div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] flex items-center justify-center font-bold shrink-0">
							<Phone className="w-4 h-4" />
						</div>
						<div className="min-w-0">
							<h2 className="text-sm sm:text-base md:text-lg font-semibold tracking-tight text-[var(--ink)] leading-tight truncate">
								<span className="sm:hidden">Звонки</span>
								<span className="hidden sm:inline">Телефония и журнал звонков</span>
							</h2>
							<div className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)] truncate">
								<span className="w-2 h-2 rounded-full bg-[var(--teal,#0d9488)] shrink-0" />
								<span className="sm:hidden">Онлайн</span>
								<span className="hidden sm:inline">Линия 1: онлайн (SIP АТС подключена)</span>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
						{/* Mobile Tab Switcher */}
						<div className="flex sm:hidden bg-[var(--paper-secondary)] p-0.5 rounded-lg border border-[var(--line)]">
							<button
								type="button"
								onClick={() => setActiveMobileTab("journal")}
								className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
									activeMobileTab === "journal"
										? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
										: "bg-transparent text-[var(--ink-secondary)]"
								}`}
							>
								Журнал
							</button>
							<button
								type="button"
								onClick={() => setActiveMobileTab("dialer")}
								className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
									activeMobileTab === "dialer"
										? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
										: "bg-transparent text-[var(--ink-secondary)]"
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
							className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink-secondary)] hover:bg-[var(--paper-secondary)] transition-colors"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Studio Body: Split View on Desktop */}
				<div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-hidden bg-[var(--paper)]">
					{/* Left Column: Call Log Journal */}
					<TelephonyCallList
						calls={filteredCalls}
						selectedCallId={selectedCall?.id || ""}
						onSelectCall={(id) => setSelectedCallId(id)}
						searchQuery={searchQuery}
						onSearchChange={setSearchQuery}
						activeFilter={activeFilter}
						onFilterChange={setActiveFilter}
						activeMobileTab={activeMobileTab}
					/>

					{/* Right Column: Active Caller Card & Dialpad Studio */}
					<div
						className={`w-full sm:w-1/2 lg:w-7/12 flex flex-col min-h-0 bg-[var(--paper)] ${
							activeMobileTab === "dialer" ? "flex" : "hidden sm:flex"
						}`}
					>
						<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
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
												className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-secondary)] hover:bg-[var(--paper-secondary)] flex items-center gap-1.5 transition-colors"
											>
												<MessageCircle className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
												<span>WhatsApp</span>
											</a>
											<button
												type="button"
												onClick={handleOpenCard}
												data-testid="telephony-open-patient-card-btn"
												className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-secondary)] hover:bg-[var(--paper-secondary)] flex items-center gap-1.5 transition-colors"
											>
												<User className="w-3.5 h-3.5" />
												<span>Карта</span>
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
												className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink)]"
											>
												<Delete className="w-4 h-4" />
											</button>
										)}
									</div>
								</div>

								{/* Dialpad Grid: 3x4 */}
								<div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
									{DIALPAD_KEYS.map((k) => (
										<button
											key={k.digit}
											type="button"
											onClick={() => handleDigitClick(k.digit)}
											data-testid={`dialpad-key-${k.digit}`}
											className="h-11 sm:h-12 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-secondary)] active:scale-95 text-[var(--ink)] flex flex-col items-center justify-center transition-all cursor-pointer"
										>
											<span className="text-base sm:text-lg font-bold leading-none">{k.digit}</span>
											{k.sub && (
												<span className="text-[9px] text-[var(--ink-muted)] font-medium tracking-tight">
													{k.sub}
												</span>
											)}
										</button>
									))}
								</div>
							</div>
						</div>

						{/* Footer: Exactly 1 Primary CTA Button (Mandate 8am & 8e) */}
						<div className="p-3 sm:p-4 border-t border-[var(--line)] bg-[var(--paper-strong)] shrink-0 flex items-center justify-between gap-3">
							<div className="hidden sm:block text-xs text-[var(--ink-muted)]">
								{hasDialed
									? "Нажмите для совершения исходящего вызова"
									: "Переход в сетку расписания врача в 1 клик"}
							</div>

							<button
								type="button"
								onClick={handlePrimaryAction}
								data-testid="telephony-primary-cta-btn"
								className="w-full sm:w-auto px-6 h-11 rounded-xl bg-[var(--teal,#0d9488)] text-white font-semibold text-sm hover:bg-[var(--teal,#0d9488)]/90 active:scale-98 shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
							>
								{hasDialed ? <PhoneCall className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
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