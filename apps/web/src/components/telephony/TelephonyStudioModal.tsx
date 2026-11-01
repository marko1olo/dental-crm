/**
 * apps/web/src/components/telephony/TelephonyStudioModal.tsx
 *
 * DENTE Dental CRM — Telephony Studio & Calls Journal SSOT Modal.
 * Red Team Inquisitor Edition: Exactly 1 Primary CTA #0d9488, 0 Disabled Locks, Apple HIG (390x844).
 * Mandates: 8b (Sweet Spot 200-280 lines), 8e (Doctor Autonomy), 8am (Single CTA), 8x (Domain Purity).
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
	type TelephonyCatalogCall,
	type TelephonyFilterType,
	TELEPHONY_CATALOG_DATA,
	TELEPHONY_CALL_TYPES,
	playSafeWebAudioTone,
	triggerOpenPatientCard,
	triggerBookAppointment,
	triggerCreatePatient,
} from "./telephonyCatalogData";
import { TelephonyCallList } from "./TelephonyCallList";
import { useTelephonyStore } from "../../store/telephonyStore";
import {
	TelephonyStudioHeader,
	TelephonySoftphoneDialpad,
	TelephonyCallHistoryList,
	TelephonyStudioFooter,
} from "./studio";
import "./styles/telephonyStudio.css";

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
				{/* Studio Header (Apple HIG, 1-line, Status, Close) */}
				<TelephonyStudioHeader
					activeLineId={activeLineId}
					activeMobileTab={activeMobileTab}
					onTabChange={setActiveMobileTab}
					onClose={onClose}
				/>

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
							{/* Patient Card View & Call History Details (Mandates 8e & 8y) */}
							<TelephonyCallHistoryList
								selectedCall={selectedCall}
								callNote={callNote}
								onCallNoteChange={setCallNote}
								onOpenCard={handleOpenCard}
							/>

							{/* Dialpad Section (Apple HIG >= 48px Touch Targets) */}
							<TelephonySoftphoneDialpad
								dialedNumber={dialedNumber}
								onDigitClick={handleDigitClick}
								onBackspace={handleBackspace}
							/>
						</div>

						{/* Footer: Exactly 1 Primary CTA Button (Mandates 8am, 8e & 8x) */}
						<TelephonyStudioFooter
							hasDialed={hasDialed}
							dialedNumber={dialedNumber}
							isNoteSaved={isNoteSaved}
							onBookAction={handleBookAction}
							onPrimaryAction={handlePrimaryAction}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TelephonyStudioModal;
