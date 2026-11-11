import React from "react";
import { Check, ClipboardList } from "lucide-react";
import type { TargetSlotInfo, WaitlistCandidateItem, WaitlistCandidateScoring } from "../waitlistTypes";
import {
	generateWaitlistOfferMessage,
	openWhatsAppChat,
	openTelegramChat,
} from "../waitlistTypes";

export interface WaitlistCandidateCardProps {
	candidate: WaitlistCandidateItem;
	scoring: WaitlistCandidateScoring;
	targetSlot?: TargetSlotInfo | null | undefined;
	clinicName: string;
	copiedId: string | null;
	onCopyOfferMessage: (candidate: WaitlistCandidateItem) => void;
	onBookCandidate: (candidate: WaitlistCandidateItem) => void;
	onAssignCandidate?: ((candidate: WaitlistCandidateItem) => void) | undefined;
}

export function WaitlistCandidateCard({
	candidate,
	scoring,
	targetSlot,
	clinicName,
	copiedId,
	onCopyOfferMessage,
	onBookCandidate,
	onAssignCandidate,
}: WaitlistCandidateCardProps) {
	const offerText = generateWaitlistOfferMessage({
		patientName: candidate.patientName,
		doctorName: targetSlot?.doctorName || candidate.preferredDoctorName,
		startsAt: targetSlot?.startsAt,
		clinicName,
	});

	const isUrgent = scoring.urgency === "acute_pain" || scoring.urgency === "urgent";

	return (
		<div className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:border-[var(--teal,#0d9488)]/40 transition-all shadow-sm space-y-2.5">
			{/* Верхняя строка карточки: Пациент, Срочность и Рейтинг */}
			<div className="flex items-start justify-between gap-2">
				<div>
					<div className="font-semibold text-sm text-[var(--text,#0f172a)]">
						{candidate.patientName}
					</div>
					<div className="text-xs text-[var(--text-muted,#64748b)] flex items-center gap-1.5 mt-0.5">
						<span>{candidate.patientPhone || "Без телефона"}</span>
						{candidate.preferredDoctorName && (
							<span>• Врач: {candidate.preferredDoctorName}</span>
						)}
					</div>
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					<span
						className="px-2 py-0.5 text-[11px] font-medium rounded-full"
						style={{
							backgroundColor: isUrgent ? "rgba(239, 68, 68, 0.12)" : "rgba(100, 116, 139, 0.1)",
							color: isUrgent ? "var(--danger, #ef4444)" : "var(--text-muted, #64748b)",
						}}
					>
						{scoring.urgencyLabel}
					</span>
					{targetSlot && (
						<span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[var(--badge-teal-bg,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)]">
							{scoring.score}%
						</span>
					)}
				</div>
			</div>

			{/* Причины соответствия / теги */}
			{scoring.matchReasons.length > 0 && (
				<div className="flex flex-wrap gap-1 text-[11px]">
					{scoring.matchReasons.map((reason, idx) => (
						<span
							key={idx}
							className="px-2 py-0.5 rounded bg-[var(--paper-subtle,#f1f5f9)] text-[var(--text-muted,#64748b)] inline-flex items-center gap-1"
						>
							<Check size={11} className="shrink-0 text-[var(--teal,#0d9488)]" />
							<span>{reason}</span>
						</span>
					))}
				</div>
			)}

			{candidate.notes && (
				<p className="text-xs text-[var(--text-muted,#64748b)] italic bg-[var(--paper-subtle,#f8fafc)] p-2 rounded-md">
					«{candidate.notes}»
				</p>
			)}

			{/* КНОПКИ ДЕЙСТВИЯ: Мессенджеры + Ровно 1 Primary CTA кнопка (Apple HIG: full width on mobile) */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-2 border-t border-[var(--line-subtle,#f1f5f9)]">
				{/* Мессенджеры и копирование */}
				<div className="flex items-center gap-1.5 flex-wrap">
					{candidate.patientPhone && (
						<>
							<button
								type="button"
								title="Написать в WhatsApp"
								onClick={() => openWhatsAppChat(candidate.patientPhone!, offerText)}
								className="h-9 sm:h-8 px-3 sm:px-2.5 min-h-[36px] rounded-lg border border-[var(--line,#e2e8f0)] hover:bg-[#25D366]/10 text-xs font-medium text-[#128C7E] flex items-center gap-1 transition-colors cursor-pointer"
							>
								<span>WhatsApp</span>
							</button>
							<button
								type="button"
								title="Написать в Telegram"
								onClick={() => openTelegramChat(candidate.patientPhone!, offerText)}
								className="h-9 sm:h-8 px-3 sm:px-2.5 min-h-[36px] rounded-lg border border-[var(--line,#e2e8f0)] hover:bg-[#0088cc]/10 text-xs font-medium text-[#0088cc] flex items-center gap-1 transition-colors cursor-pointer"
							>
								<span>TG</span>
							</button>
						</>
					)}
					<button
						type="button"
						title="Скопировать вежливый текст предложения"
						onClick={() => onCopyOfferMessage(candidate)}
						className="h-9 sm:h-8 px-3 sm:px-2.5 min-h-[36px] rounded-lg border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-subtle,#f1f5f9)] text-xs text-[var(--text-muted,#64748b)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
					>
						{copiedId === candidate.id ? (
							<>
								<Check size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
								<span>Скопировано!</span>
							</>
						) : (
							<>
								<ClipboardList size={14} className="shrink-0" />
								<span>Текст</span>
							</>
						)}
					</button>
				</div>

				{/* ЕДИНСТВЕННЫЙ PRIMARY CTA (Мандат 8am): «Записать в окно» (Apple HIG: >= 44px на мобильных) */}
				{targetSlot ? (
					<button
						type="button"
						onClick={() => onBookCandidate(candidate)}
						className="w-full sm:w-auto h-11 sm:h-9 px-4 rounded-xl sm:rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-hover,#0f766e)] text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
					>
						<span>Записать в окно</span>
						<span>→</span>
					</button>
				) : (
					<button
						type="button"
						onClick={() => onAssignCandidate?.(candidate)}
						className="w-full sm:w-auto h-11 sm:h-8 px-4 sm:px-3 rounded-xl sm:rounded-lg border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] hover:bg-[var(--teal,#0d9488)]/10 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center"
					>
						Назначить
					</button>
				)}
			</div>
		</div>
	);
}
