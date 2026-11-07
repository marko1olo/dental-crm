/**
 * apps/web/src/components/telephony/TelephonyStudioModal.tsx
 *
 * DENTE Dental CRM — Telephony Studio & Calls Journal SSOT Modal.
 * Red Team Inquisitor Edition: Exactly 1 Primary CTA #0d9488, 0 Disabled Locks, Apple HIG (390x844).
 * Mandates: 8b (Sweet Spot 350-430 lines), 8e (Doctor Autonomy), 8am (Single CTA), 8x (Domain Purity).
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
	Phone, PhoneCall, X, Delete, User, MessageCircle, AlertTriangle, Calendar, Check,
} from "lucide-react";
import {
	type TelephonyCatalogCall, type TelephonyFilterType, TELEPHONY_CATALOG_DATA,
	TELEPHONY_CALL_TYPES, DIALPAD_KEYS, formatPhoneRu, getWhatsAppUrl, playSafeWebAudioTone,
	triggerOpenPatientCard, triggerBookAppointment, triggerCreatePatient,
} from "./telephonyCatalogData";
import { TelephonyCallList } from "./TelephonyCallList";
import { CallAudioPlayer } from "./CallAudioPlayer";
import { useTelephonyStore } from "../../store/telephonyStore";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
if (typeof document !== "undefined") {
	import("./styles/telephonyStudio.css");
}

export const QUICK_NOTE_PRESETS = [
	"Записан на приём", "Уточнение стоимости", "Острая боль", "Перезвонить после 18:00",
] as const;

export interface TelephonyStudioHeaderProps {
	activeLineId?: string | number | null;
	activeMobileTab: "journal" | "dialer";
	onTabChange: (tab: "journal" | "dialer") => void;
	onClose: () => void;
}

export const TelephonyStudioHeader: React.FC<TelephonyStudioHeaderProps> = ({
	activeLineId, activeMobileTab, onTabChange, onClose,
}) => (
	<>
		<div className="sm:hidden flex justify-center pt-2 pb-1">
			<div className="dnt-telephony-mobile-drag-handle" />
		</div>
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
						<span className="hidden sm:inline">{`Линия ${activeLineId || "1"}: онлайн (SIP АТС подключена)`}</span>
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<div className="flex sm:hidden bg-[var(--paper-secondary,#f1f5f9)] p-0.5 rounded-lg border border-[var(--line)]">
					<button
						type="button"
						onClick={() => onTabChange("journal")}
						className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
							activeMobileTab === "journal"
								? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
								: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] border border-transparent"
						}`}
					>
						Журнал
					</button>
					<button
						type="button"
						onClick={() => onTabChange("dialer")}
						className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
							activeMobileTab === "dialer"
								? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
								: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] border border-transparent"
						}`}
					>
						Набор
					</button>
				</div>
				<button
					type="button"
					onClick={onClose}
					data-testid="telephony-studio-close-btn"
					aria-label="Закрыть студию телефонии"
					className="w-8 h-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-secondary)] text-[var(--ink-muted)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
				>
					<X className="w-4 h-4" />
				</button>
			</div>
		</div>
	</>
);

export interface TelephonySoftphoneDialpadProps {
	dialedNumber: string;
	onDigitClick: (digit: string) => void;
	onBackspace: () => void;
}

export const TelephonySoftphoneDialpad: React.FC<TelephonySoftphoneDialpadProps> = ({
	dialedNumber, onDigitClick, onBackspace,
}) => {
	const handlePress = useCallback((digit: string) => {
		playSafeWebAudioTone(600, 100);
		onDigitClick(digit);
	}, [onDigitClick]);

	return (
		<div className="bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl p-2.5 sm:p-3 shadow-xs">
			<div className="flex items-center justify-between mb-2 px-1">
				<span className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider">Быстрый набор</span>
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
						<button type="button" onClick={onBackspace} aria-label="Стереть" className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer">
							<Delete className="w-4 h-4" />
						</button>
					)}
				</div>
			</div>
			<div className="grid grid-cols-3 gap-1.5 max-w-[280px] mx-auto">
				{DIALPAD_KEYS.map((keyDef) => (
					<button key={keyDef.digit} type="button" onClick={() => handlePress(keyDef.digit)} data-testid={`dialpad-key-${keyDef.digit}`} className="dnt-telephony-dialpad-btn">
						<span className="dnt-telephony-dialpad-digit">{keyDef.digit}</span>
						{keyDef.sub && <span className="dnt-telephony-dialpad-sub">{keyDef.sub}</span>}
					</button>
				))}
			</div>
		</div>
	);
};

export interface TelephonyCallHistoryListProps {
	selectedCall?: TelephonyCatalogCall;
	callNote: string;
	onCallNoteChange: (note: string) => void;
	onOpenCard: () => void;
}

export const TelephonyCallHistoryList: React.FC<TelephonyCallHistoryListProps> = ({
	selectedCall, callNote, onCallNoteChange, onOpenCard,
}) => {
	if (!selectedCall) {
		return (
			<div className="p-8 text-center text-sm text-[var(--ink-muted)] bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl">
				Выберите звонок из списка для просмотра деталей
			</div>
		);
	}

	return (
		<div className="bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl p-3 sm:p-3.5 shadow-xs space-y-2.5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<div className="flex items-center gap-2 mb-1">
						<span className="text-xs px-2 py-0.5 rounded-md bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] font-semibold border border-[var(--teal,#0d9488)]/20">
							{selectedCall.patientCategory}
						</span>
						{selectedCall.balanceRub !== 0 && (
							<span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${selectedCall.balanceRub < 0 ? "bg-[var(--danger,#ef4444)]/10 text-[var(--danger,#ef4444)] border-[var(--danger,#ef4444)]/20" : "bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]/20"}`}>
								{selectedCall.balanceRub < 0 ? `Долг: ${Math.abs(selectedCall.balanceRub)} ₽` : `Баланс: +${selectedCall.balanceRub} ₽`}
							</span>
						)}
					</div>
					<h3 className="text-base font-bold text-[var(--ink)] leading-tight">{selectedCall.callerName}</h3>
					<div className="text-sm font-mono text-[var(--ink-muted)]">{formatPhoneRu(selectedCall.phone)}</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<a href={getWhatsAppUrl(selectedCall.phone)} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-[var(--paper-secondary,#f1f5f9)] hover:bg-[var(--line)] text-[var(--ink-muted)] hover:text-emerald-600 transition-colors cursor-pointer" title="Написать в WhatsApp">
						<MessageCircle className="w-4 h-4" />
					</a>
					<button type="button" onClick={onOpenCard} data-testid="telephony-open-patient-card-btn" className="px-3 py-1.5 rounded-lg bg-[var(--paper-secondary,#f1f5f9)] hover:bg-[var(--line)] text-[var(--ink)] text-xs font-semibold flex items-center gap-1.5 border border-[var(--line)] transition-all cursor-pointer">
						<User className="w-3.5 h-3.5" />
						<span>{selectedCall.patientId ? "Карта" : "Создать"}</span>
					</button>
				</div>
			</div>

			{selectedCall.somaticAlert && (
				<div className="p-2.5 rounded-lg bg-[var(--danger-soft,#ef44441a)] border border-[var(--danger,#ef4444)]/20 flex items-center gap-2 text-xs text-[var(--danger,#ef4444)] font-medium">
					<AlertTriangle className="w-4 h-4 shrink-0" />
					<span>Соматический стоп-фактор: {selectedCall.somaticAlert}</span>
				</div>
			)}
			{selectedCall.clinicalNote && (
				<div className="text-xs text-[var(--ink-secondary,#475569)] bg-[var(--paper-secondary,#f1f5f9)] p-2.5 rounded-lg border border-[var(--line-subtle,#e2e8f0)]">
					<span className="font-semibold text-[var(--ink)]">Анамнез / приём: </span>
					{selectedCall.clinicalNote}
				</div>
			)}
			{selectedCall.hasRecording && selectedCall.recordingUrl && (
				<div className="pt-1"><CallAudioPlayer audioUrl={selectedCall.recordingUrl} /></div>
			)}
			<div className="space-y-1.5 pt-1">
				<label className="text-xs font-semibold text-[var(--ink-muted)]">Заметка к звонку:</label>
				<input
					type="text"
					value={callNote}
					onChange={(e) => onCallNoteChange(e.target.value)}
					placeholder="Зафиксировать итог переговоров..."
					data-testid="telephony-call-note-input"
					className="w-full px-3 py-2 text-xs bg-[var(--paper-secondary,#f1f5f9)] border border-[var(--line)] rounded-lg text-[var(--ink)] placeholder-[var(--ink-muted)] outline-hidden focus:border-[var(--teal,#0d9488)] transition-colors"
				/>
				<div className="flex flex-wrap gap-1.5 pt-1">
					{QUICK_NOTE_PRESETS.map((preset) => (
						<button key={preset} type="button" onClick={() => onCallNoteChange(preset)} className="px-2 py-0.5 text-[11px] rounded-md bg-[var(--paper-secondary,#f1f5f9)] hover:bg-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--line)] transition-colors cursor-pointer">
							{preset}
						</button>
					))}
				</div>
			</div>
		</div>
	);
};

export const TelephonyCallHistoryCard = TelephonyCallHistoryList;

export interface TelephonyStudioFooterProps {
	hasDialed: boolean;
	dialedNumber: string;
	isNoteSaved: boolean;
	onBookAction: () => void;
	onPrimaryAction: () => void;
}

export const TelephonyStudioFooter: React.FC<TelephonyStudioFooterProps> = ({
	hasDialed, dialedNumber, isNoteSaved, onBookAction, onPrimaryAction,
}) => {
	const primaryCtaLabel = hasDialed
		? `Позвонить на ${formatPhoneRu(dialedNumber)}`
		: isNoteSaved ? "✓ Заметка сохранена" : "✓ Сохранить заметку звонка";

	return (
		<div className="p-3 sm:p-4 border-t border-[var(--line)] bg-[var(--paper-strong)] shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
			<div className="flex items-center gap-2 w-full sm:w-auto">
				<button type="button" onClick={onBookAction} data-testid="telephony-secondary-book-btn" className="dnt-telephony-secondary-btn flex-1 sm:flex-initial cursor-pointer">
					<Calendar className="w-3.5 h-3.5" />
					<span>Записать на приём</span>
				</button>
			</div>
			<button type="button" onClick={onPrimaryAction} data-testid="telephony-primary-cta-btn" className="dnt-telephony-primary-cta w-full sm:w-auto cursor-pointer">
				{hasDialed ? <PhoneCall className="w-4 h-4" /> : isNoteSaved ? <Check className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
				<span>{primaryCtaLabel}</span>
			</button>
		</div>
	);
};

export interface TelephonyStudioModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialSelectedCallId?: string;
	onBookAppointment?: (patientId: string, phone: string, name: string) => void;
	onOpenPatientCard?: (patientId: string) => void;
}

export const TelephonyStudioModal: React.FC<TelephonyStudioModalProps> = ({
	isOpen, onClose, initialSelectedCallId, onBookAppointment, onOpenPatientCard,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeFilter, setActiveFilter] = useState<TelephonyFilterType>("all");
	const [dbCalls, setDbCalls] = useState<TelephonyCatalogCall[]>([]);
	const [selectedCallId, setSelectedCallId] = useState<string>(initialSelectedCallId || "");
	const [dialedNumber, setDialedNumber] = useState("");
	const [activeMobileTab, setActiveMobileTab] = useState<"journal" | "dialer">("journal");
	const [callNote, setCallNote] = useState("");
	const [isNoteSaved, setIsNoteSaved] = useState(false);

	const activeLineId = useTelephonyStore((s) => s.activeLineId);

	useEffect(() => {
		if (!isOpen) return;
		if (isDemoShowcaseMode()) {
			setDbCalls(TELEPHONY_CATALOG_DATA);
			if (!selectedCallId && TELEPHONY_CATALOG_DATA[0]) {
				setSelectedCallId(TELEPHONY_CATALOG_DATA[0].id);
			}
			return;
		}

		let isMounted = true;
		const staffToken = readDenteStaffToken();
		const clinicToken = readDenteClinicToken();

		fetch("/api/telephony/calls", {
			headers: {
				...(staffToken ? { "x-dente-staff-token": staffToken } : {}),
				...(clinicToken ? { "x-dente-clinic-token": clinicToken } : {}),
			},
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((data: { success?: boolean; calls?: any[] } | null) => {
				if (!isMounted) return;
				if (data?.calls && Array.isArray(data.calls)) {
					const mapped: TelephonyCatalogCall[] = data.calls.map((c) => {
						const isIncoming = c.direction === "inbound";
						const isMissed = c.status === "needs_call" || (c.durationSeconds === 0 && isIncoming);
						const callType: TelephonyCallType = isIncoming
							? isMissed ? "incoming_missed" : "incoming_answered"
							: isMissed ? "outgoing_missed" : "outgoing_success";
						const phone = c.patientPhone || c.callerPhone || "";
						const callerName = c.patientName || (phone ? `Абонент ${formatPhoneRu(phone)}` : "Неизвестный номер");
						const dateObj = c.createdAt ? new Date(c.createdAt) : new Date();
						const timestampText = dateObj.toLocaleDateString("ru-RU", {
							day: "numeric",
							month: "short",
							hour: "2-digit",
							minute: "2-digit",
						});

						return {
							id: String(c.id),
							callType,
							phone,
							callerName,
							patientId: c.patientId ? String(c.patientId) : null,
							patientCategory: c.patientId ? "Постоянный" : "Первичный",
							balanceRub: 0,
							lastVisitDate: null,
							attendingDoctor: null,
							clinicalNote: c.message || undefined,
							somaticAlert: null,
							durationSeconds: c.durationSeconds || 0,
							timestampText,
							hasRecording: Boolean(c.recordingUrl),
							recordingUrl: c.recordingUrl || undefined,
							transcriptSnippet: undefined,
						};
					});
					setDbCalls(mapped);
					if (!selectedCallId && mapped[0]) {
						setSelectedCallId(mapped[0].id);
					}
				} else {
					setDbCalls([]);
				}
			})
			.catch(() => {
				if (isMounted) setDbCalls([]);
			});

		return () => {
			isMounted = false;
		};
	}, [isOpen, selectedCallId]);

	const isDemo = isDemoShowcaseMode() || typeof window === "undefined";

	const baseCalls = useMemo(() => {
		if (dbCalls.length > 0) return dbCalls;
		return isDemo ? TELEPHONY_CATALOG_DATA : [];
	}, [dbCalls, isDemo]);

	const filteredCalls = useMemo(() => {
		return baseCalls.filter((call) => {
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
	}, [baseCalls, activeFilter, searchQuery]);

	const selectedCall: TelephonyCatalogCall | undefined = useMemo(() => {
		return baseCalls.find((c) => c.id === selectedCallId) || filteredCalls[0];
	}, [baseCalls, selectedCallId, filteredCalls]);

	useEffect(() => {
		setIsNoteSaved(false);
		setCallNote("");
	}, [selectedCallId]);

	const handleDigitClick = useCallback((digit: string) => setDialedNumber((prev) => prev + digit), []);
	const handleBackspace = useCallback(() => setDialedNumber((prev) => prev.slice(0, -1)), []);

	const handleOpenCard = useCallback(() => {
		if (!selectedCall) return;
		if (onOpenPatientCard && selectedCall.patientId) onOpenPatientCard(selectedCall.patientId);
		else if (selectedCall.patientId) triggerOpenPatientCard(selectedCall.patientId);
		else triggerCreatePatient(selectedCall.phone);
		onClose();
	}, [selectedCall, onOpenPatientCard, onClose]);

	const handleBookAction = useCallback(() => {
		if (!selectedCall) return;
		if (onBookAppointment && selectedCall.patientId) {
			onBookAppointment(selectedCall.patientId, selectedCall.phone, selectedCall.callerName);
		} else {
			triggerBookAppointment(selectedCall.patientId || undefined, selectedCall.phone, selectedCall.callerName);
		}
		onClose();
	}, [selectedCall, onBookAppointment, onClose]);

	const handlePrimaryAction = useCallback(() => {
		playSafeWebAudioTone(880, 200);
		if (dialedNumber.length >= 3) {
			window.dispatchEvent(new CustomEvent("dente:telephony-dial", { detail: { phone: dialedNumber } }));
			onClose();
			return;
		}

		setIsNoteSaved(true);
		window.dispatchEvent(
			new CustomEvent("dente:telephony-note-saved", {
				detail: {
					callId: selectedCall?.id, patientId: selectedCall?.patientId,
					note: callNote.trim() || "Заметка звонка зафиксирована без комментариев",
					timestamp: new Date().toISOString(),
				},
			}),
		);
		setTimeout(() => setIsNoteSaved(false), 2500);
	}, [dialedNumber, selectedCall, callNote, onClose]);

	if (!isOpen) return null;

	const hasDialed = dialedNumber.trim().length > 0;

	return (
		<div data-testid="telephony-studio-modal-root" className="dnt-telephony-studio-overlay">
			<div className="dnt-telephony-studio-window animate-in fade-in zoom-in-95 duration-150" role="dialog" aria-modal="true" aria-label="Телефония и журнал звонков">
				<TelephonyStudioHeader activeLineId={activeLineId} activeMobileTab={activeMobileTab} onTabChange={setActiveMobileTab} onClose={onClose} />
				<div className="dnt-telephony-split">
					<TelephonyCallList
						calls={filteredCalls} selectedCallId={selectedCall?.id || ""}
						onSelectCall={(id) => { setSelectedCallId(id); setActiveMobileTab("dialer"); }}
						searchQuery={searchQuery} onSearchChange={setSearchQuery}
						activeFilter={activeFilter} onFilterChange={setActiveFilter} activeMobileTab={activeMobileTab}
					/>
					<div className={`dnt-telephony-details-pane ${activeMobileTab === "dialer" ? "" : "is-mobile-hidden"}`}>
						<div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-2.5 space-y-2">
							<TelephonyCallHistoryList selectedCall={selectedCall} callNote={callNote} onCallNoteChange={setCallNote} onOpenCard={handleOpenCard} />
							<TelephonySoftphoneDialpad dialedNumber={dialedNumber} onDigitClick={handleDigitClick} onBackspace={handleBackspace} />
						</div>
						<TelephonyStudioFooter hasDialed={hasDialed} dialedNumber={dialedNumber} isNoteSaved={isNoteSaved} onBookAction={handleBookAction} onPrimaryAction={handlePrimaryAction} />
					</div>
				</div>
			</div>
		</div>
	);
};

export default TelephonyStudioModal;
