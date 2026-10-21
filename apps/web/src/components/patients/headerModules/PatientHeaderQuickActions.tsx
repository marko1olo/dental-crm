import { Calendar, MoreHorizontal, Stethoscope } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { PatientHeaderActionsMenu } from "./PatientHeaderActionsMenu";
import type { PatientHeaderQuickActionsProps } from "./patientHeaderTypes";
import { usePatientQuickActions } from "./usePatientQuickActions";

export type { PatientHeaderQuickActionsProps } from "./patientHeaderTypes";

export const PatientHeaderQuickActions: React.FC<PatientHeaderQuickActionsProps> = (props) => {
	const { resolvedPatient, fullName, phone, clinicLegalName, onOpenAnamnesis, onEditPatient, onOpenFamilyWallet, isActiveVisit, nextAppointment } = props;
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const { handleOpenVisit, handleBookAppointment } = usePatientQuickActions({ resolvedPatient, fullName });

	useEffect(() => {
		if (!isMenuOpen) return;
		const handleClick = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsMenuOpen(false);
		};
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [isMenuOpen]);

	const isAwaiting = Boolean(isActiveVisit || (nextAppointment?.startsAt && (nextAppointment.status === "arrived" || nextAppointment.status === "in_treatment" || nextAppointment.status === "confirmed")));

	const renderAction = (isPrimary: boolean, onClick: () => void, Icon: any, label: string, testId: string, title: string) => (
		<button
			type="button"
			onClick={onClick}
			data-testid={testId}
			title={title}
			className={isPrimary
				? "primary-button min-h-[36px] h-9 px-3.5 rounded-xl bg-[var(--teal,var(--brand-primary))] hover:opacity-95 active:scale-95 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-all text-xs whitespace-nowrap"
				: "secondary-button min-h-[36px] h-9 px-3 rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors text-xs whitespace-nowrap"}
		>
			<Icon size={15} className={isPrimary ? "shrink-0" : "text-[var(--teal)] shrink-0"} />
			<span>{label}</span>
		</button>
	);

	return (
		<div className="flex items-center gap-2 shrink-0">
			{isAwaiting ? (
				<>
					{renderAction(true, handleOpenVisit, Stethoscope, "Начать приём", "header-open-visit-btn", "Открыть приём")}
					{renderAction(false, handleBookAppointment, Calendar, "Записать", "header-book-appointment-btn", "Записать в расписание")}
				</>
			) : (
				<>
					{renderAction(true, handleBookAppointment, Calendar, "Записать на приём", "header-book-appointment-btn", "Записать на приём")}
					{renderAction(false, handleOpenVisit, Stethoscope, "Начать приём", "header-open-visit-btn", "Открыть амбулаторный приём")}
				</>
			)}

			<div className="relative" ref={menuRef}>
				<button
					type="button"
					onClick={() => setIsMenuOpen((p) => !p)}
					className="icon-button min-h-[36px] min-w-[36px] h-9 w-9 rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] inline-flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
					title="Дополнительные действия"
					aria-label="Дополнительные действия"
					aria-expanded={isMenuOpen}
					aria-haspopup="true"
					data-testid="header-actions-menu-btn"
				>
					<MoreHorizontal size={16} />
				</button>
				{isMenuOpen && (
					<PatientHeaderActionsMenu resolvedPatient={resolvedPatient} fullName={fullName} phone={phone} clinicLegalName={clinicLegalName} onOpenAnamnesis={onOpenAnamnesis} onEditPatient={onEditPatient} onOpenFamilyWallet={onOpenFamilyWallet} onClose={() => setIsMenuOpen(false)} />
				)}
			</div>
		</div>
	);
};
