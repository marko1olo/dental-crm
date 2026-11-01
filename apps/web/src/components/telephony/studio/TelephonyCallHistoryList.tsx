/**
 * apps/web/src/components/telephony/studio/TelephonyCallHistoryList.tsx
 *
 * DENTE Dental CRM — Telephony Studio Call History & Active Details Card.
 * Red Team Inquisitor Edition: EBM, Patient Linking, Audio Recording Player, Somatic Alerts.
 * Mandates: 8e (Doctor Autonomy, 0 Locks), 8y (Passive Somatic Alert), 8x (Domain Purity).
 */

import React from "react";
import { User, MessageCircle, AlertTriangle } from "lucide-react";
import { CallAudioPlayer } from "../CallAudioPlayer";
import {
	type TelephonyCatalogCall,
	formatPhoneRu,
	getWhatsAppUrl,
} from "../telephonyCatalogData";

export interface TelephonyCallHistoryListProps {
	selectedCall?: TelephonyCatalogCall;
	callNote: string;
	onCallNoteChange: (note: string) => void;
	onOpenCard: () => void;
}

export const QUICK_NOTE_PRESETS = [
	"Записан на приём",
	"Уточнение стоимости",
	"Острая боль",
	"Перезвонить после 18:00",
] as const;

export const TelephonyCallHistoryList: React.FC<TelephonyCallHistoryListProps> = ({
	selectedCall,
	callNote,
	onCallNoteChange,
	onOpenCard,
}) => {
	if (!selectedCall) {
		return (
			<div className="p-8 text-center text-sm text-[var(--ink-muted)] bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl">
				Выберите звонок из списка для просмотра деталей
			</div>
		);
	}

	return (
		<div className="bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl p-4 shadow-xs space-y-3">
			{/* Patient Header & Primary Actions */}
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
						onClick={onOpenCard}
						data-testid="telephony-open-patient-card-btn"
						className="dnt-telephony-secondary-btn"
						title="Открыть медицинскую карту пациента"
					>
						<User className="w-3.5 h-3.5" />
						<span>{selectedCall.patientId ? "Карта" : "Создать"}</span>
					</button>
				</div>
			</div>

			{/* Clinical Status & Attending Doctor */}
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

			{/* Somatic Warning (Mandate 8y: Passive Banner Only, 0 Locks) */}
			{selectedCall.somaticAlert && (
				<div className="p-2.5 rounded-lg bg-[var(--danger,#ef4444)]/10 border border-[var(--danger,#ef4444)]/25 text-xs text-[var(--danger,#ef4444)] font-medium flex items-center gap-2">
					<AlertTriangle className="w-4 h-4 shrink-0" />
					<span>{selectedCall.somaticAlert}</span>
				</div>
			)}

			{/* Call Audio Player & Recording Transcript */}
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

			{/* Call Notes & Quick Presets */}
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
							onClick={() =>
								onCallNoteChange(callNote ? `${callNote}. ${preset}` : preset)
							}
							className="dnt-telephony-preset-chip"
						>
							+ {preset}
						</button>
					))}
				</div>

				<textarea
					value={callNote}
					onChange={(e) => onCallNoteChange(e.target.value)}
					placeholder="Укажите причину обращения или договорённость..."
					data-testid="telephony-call-note-input"
					className="dnt-telephony-note-textarea"
				/>
			</div>
		</div>
	);
};

// Aliases for seamless semantic integration
export const TelephonyCallHistoryCard = TelephonyCallHistoryList;

export default TelephonyCallHistoryList;
