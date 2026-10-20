import React, { useState, useRef, useEffect } from "react";
import { Calendar, MessageSquare, MoreHorizontal, Stethoscope } from "lucide-react";
import { openWhatsAppChat } from "../../../store/telephonyStore";
import { PatientTopHeaderMenu } from "./PatientTopHeaderMenu";

export interface PatientTopHeaderActionsProps {
	readonly phone: string;
	readonly fullName: string;
	readonly onBookAppointment: () => void;
	readonly onOpenVisit: () => void;
	readonly onSavePatientCore: () => void;
	readonly onOpenPatientCardModal: () => void;
	readonly onOpenLoyaltyModal: () => void;
	readonly onExecuteSomaticNorm: () => void;
	readonly isDirty: boolean;
	readonly saveState: string;
	readonly selectedPatient: any;
	readonly savePillNode?: React.ReactNode;
}

export function PatientTopHeaderActions({
	phone,
	fullName,
	onBookAppointment,
	onOpenVisit,
	onSavePatientCore,
	onOpenPatientCardModal,
	onOpenLoyaltyModal,
	onExecuteSomaticNorm,
	isDirty,
	saveState,
	selectedPatient,
	savePillNode,
}: PatientTopHeaderActionsProps) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	const handleWhatsApp = () => {
		if (phone) {
			openWhatsAppChat(phone, `Здравствуйте, ${fullName}! Вас приветствует стоматологическая клиника.`);
		}
	};

	return (
		<div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
			<button
				type="button"
				onClick={onBookAppointment}
				className="min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors cursor-pointer shrink-0"
				title="Записать пациента в расписание приёма"
				data-testid="patient-card-book-appointment-btn"
			>
				<Calendar size={13} className="text-[var(--teal)] shrink-0" />
				<span>Записать на приём</span>
			</button>

			<button
				type="button"
				onClick={onOpenVisit}
				className="min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-3 rounded-lg border border-[var(--teal)] bg-[var(--teal)] text-[var(--on-teal,#ffffff)] font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs hover:opacity-95 transition-all cursor-pointer shrink-0"
				title="Начать амбулаторный приём пациента"
				data-testid="patient-card-open-visit-btn"
			>
				<Stethoscope size={13} className="shrink-0" />
				<span>Начать приём</span>
			</button>

			<button
				type="button"
				onClick={handleWhatsApp}
				className="min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors cursor-pointer shrink-0"
				title="Открыть чат WhatsApp с пациентом"
				data-testid="patient-card-whatsapp-btn"
			>
				<MessageSquare size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
				<span>WhatsApp</span>
			</button>

			<div className="relative inline-block" ref={menuRef}>
				<button
					type="button"
					onClick={() => setIsMenuOpen((v) => !v)}
					className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-0 sm:h-8.5 sm:w-8.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold inline-flex items-center justify-center shadow-2xs hover:border-[var(--teal)] transition-colors cursor-pointer shrink-0"
					title="Дополнительные действия"
					aria-label="Дополнительные действия"
					aria-expanded={isMenuOpen}
					data-testid="header-actions-menu-btn"
				>
					<MoreHorizontal size={15} />
				</button>

				{isMenuOpen && (
					<PatientTopHeaderMenu
						selectedPatient={selectedPatient}
						onClose={() => setIsMenuOpen(false)}
						onSave={onSavePatientCore}
						onOpenCard={onOpenPatientCardModal}
						onOpenLoyalty={onOpenLoyaltyModal}
						onSomaticNorm={onExecuteSomaticNorm}
					/>
				)}
			</div>

			{savePillNode}
		</div>
	);
}
