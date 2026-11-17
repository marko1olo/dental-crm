import React, { useState, useRef, useEffect } from "react";
import { CalendarCheck, ChevronRight, Eye, Lightbulb, MessageCircle, MoreHorizontal, Phone, Send } from "lucide-react";
import type { PatientRecallRecord, RecallContactStatus } from "./patientRecallEngine";

export interface RecallPatientRowCardActionsProps {
	readonly candidate: PatientRecallRecord;
	readonly isScriptActive?: boolean | undefined;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onToggleScript: (candidate: PatientRecallRecord) => void;
	readonly onTogglePreview?: ((candidate: PatientRecallRecord) => void) | undefined;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onTelegram: (candidate: PatientRecallRecord) => void;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
}

export const RecallPatientRowCardActions: React.FC<RecallPatientRowCardActionsProps> = ({
	candidate,
	isScriptActive = false,
	onBook,
	onToggleScript,
	onTogglePreview,
	onWhatsApp,
	onTelegram,
	onCopySms,
}) => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isMenuOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setIsMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isMenuOpen]);

	const btnSecondary =
		"recall-action-btn border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-medium rounded-lg px-3.5 h-9 text-sm gap-2 inline-flex items-center justify-center shrink-0 shadow-2xs transition-colors";
	const btnPrimary =
		"recall-action-btn recall-action-btn--book bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] font-medium rounded-lg px-3.5 h-9 text-sm gap-2 inline-flex items-center justify-center shrink-0 shadow-xs transition-colors border-0";

	return (
		<div className="recall-patient-card__actions flex items-center gap-2 relative" role="group" aria-label="Действия вызова">
			{/* ЕДИНЫЙ PRIMARY CTA (Мандат 8am) */}
			<button
				type="button"
				className={btnPrimary}
				onClick={() => onBook(candidate)}
				data-testid={`recall-book-btn-${candidate.id}`}
				title="Запланировать осмотр"
			>
				<CalendarCheck size={16} className="shrink-0" />
				<span>Запланировать осмотр</span>
				<ChevronRight size={14} className="shrink-0" />
			</button>

			{/* SECONDARY ACTION: ПОЗВОНИТЬ */}
			{candidate.phone && (
				<a
					href={`tel:${candidate.phone.replace(/[^+\d]/g, "")}`}
					className={`${btnSecondary} recall-action-btn--phone`}
					data-testid={`recall-phone-btn-${candidate.id}`}
					title={`Позвонить: ${candidate.phone}`}
					style={{ textDecoration: "none" }}
				>
					<Phone size={15} className="shrink-0" />
					<span>Позвонить</span>
				</a>
			)}

			{/* КОМПАКТНОЕ МЕНЮ ДЕЙСТВИЙ (Снос частокола кнопок) */}
			<div className="relative inline-flex shrink-0" ref={menuRef}>
				<button
					type="button"
					className={`${btnSecondary} px-2 w-9 h-9 flex items-center justify-center ${isScriptActive ? "border-[var(--primary)] text-[var(--primary)]" : ""}`}
					onClick={() => setIsMenuOpen((prev) => !prev)}
					data-testid={`recall-more-actions-btn-${candidate.id}`}
					title="Дополнительные каналы связи и действия"
					aria-label="Дополнительные каналы связи и действия"
					aria-expanded={isMenuOpen}
				>
					<MoreHorizontal size={16} />
				</button>

				<div
					className={`absolute right-0 bottom-full mb-1.5 z-50 min-w-[210px] rounded-xl border border-[var(--line)] bg-[var(--paper)] p-1.5 shadow-lg flex-col gap-1 text-sm animate-in fade-in zoom-in-95 duration-100 ${
						isMenuOpen ? "flex" : "hidden"
					}`}
					role="menu"
				>
					<button
						type="button"
						className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors w-full border-0 bg-transparent cursor-pointer font-normal"
						onClick={() => {
							setIsMenuOpen(false);
							onWhatsApp(candidate);
						}}
						data-testid={`recall-whatsapp-btn-${candidate.id}`}
					>
						<MessageCircle size={15} className="text-[var(--success-ink,#10b981)] shrink-0" />
						<span>WhatsApp сообщение</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors w-full border-0 bg-transparent cursor-pointer font-normal"
						onClick={() => {
							setIsMenuOpen(false);
							onTelegram(candidate);
						}}
						data-testid={`recall-telegram-btn-${candidate.id}`}
					>
						<Send size={15} className="text-[var(--info-ink,#0284c7)] shrink-0" />
						<span>Telegram сообщение</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors w-full border-0 bg-transparent cursor-pointer font-normal"
						onClick={() => {
							setIsMenuOpen(false);
							onCopySms(candidate);
						}}
						data-testid={`recall-sms-btn-${candidate.id}`}
					>
						<Send size={15} className="text-[var(--ink-muted)] shrink-0" />
						<span>Скопировать СМС</span>
					</button>

					<div className="h-px bg-[var(--line)] my-0.5" />

					<button
						type="button"
						className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors w-full border-0 bg-transparent cursor-pointer font-normal"
						onClick={() => {
							setIsMenuOpen(false);
							onToggleScript(candidate);
						}}
						data-testid={`recall-script-btn-${candidate.id}`}
					>
						<Lightbulb size={15} className="text-[var(--warning-ink,#f59e0b)] shrink-0" />
						<span>{isScriptActive ? "Скрыть скрипт" : "Речевой скрипт"}</span>
					</button>

					{onTogglePreview && (
						<button
							type="button"
							className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors w-full border-0 bg-transparent cursor-pointer font-normal"
							onClick={() => {
								setIsMenuOpen(false);
								onTogglePreview(candidate);
							}}
							data-testid={`recall-quick-preview-btn-${candidate.id}`}
						>
							<Eye size={15} className="text-[var(--ink-muted)] shrink-0" />
							<span>Быстрый просмотр</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);
};
