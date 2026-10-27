import React from "react";
import { showToast } from "../../GlobalToast";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { formatPatientDisplayFio } from "./AppointmentCardTeethList";

export interface CardPatientMetadataProps {
	patientName: string;
	patientId?: string | null;
	doctorName?: string | null;
	chairName?: string | null;
	appointment: any;
	sizeVariant?: "micro" | "two-line" | "expanded";
	onOpenVisit?: (() => void) | null;
	openAppointmentEditor: (appt: any) => void;
	setIsMobileSheetOpen: (open: boolean) => void;
}

export function CardPatientMetadata({
	patientName,
	patientId,
	doctorName,
	chairName,
	appointment,
	sizeVariant = "expanded",
	onOpenVisit,
	openAppointmentEditor,
	setIsMobileSheetOpen,
}: CardPatientMetadataProps) {
	const handleDoubleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		const pid = patientId || appointment?.patientId;
		if (pid) {
			usePatientStore.getState().setSelectedPatientId(pid);
			if (typeof window !== "undefined") {
				window.location.hash = "#visit";
			}
			if (onOpenVisit) {
				onOpenVisit();
			} else {
				useAppStore.getState().setCurrentView("visit");
			}
			showToast(`Открыта карта приёма: ${patientName}`, "info");
		} else {
			openAppointmentEditor(appointment);
		}
	};

	const handleClick = (e: React.MouseEvent) => {
		if (typeof window !== "undefined" && window.innerWidth < 768) {
			e.stopPropagation();
			setIsMobileSheetOpen(true);
		}
	};

	const titleInfo = `Пациент: ${patientName}${doctorName ? ` · Врач: ${doctorName}` : ""}${chairName ? ` · Кресло: ${chairName}` : ""}`;

	if (sizeVariant === "micro") {
		return (
			<h3
				className="text-xs font-bold truncate shrink-0 max-w-[140px] sm:max-w-[180px] text-[var(--ink)] hover:text-[var(--teal)] transition-colors cursor-pointer m-0 p-0"
				title={titleInfo}
				onDoubleClick={handleDoubleClick}
				onClick={handleClick}
			>
				<span className="truncate block">
					{formatPatientDisplayFio(patientName)}
				</span>
			</h3>
		);
	}

	if (sizeVariant === "two-line") {
		return (
			<h3
				className="text-xs sm:text-sm font-bold truncate min-w-0 leading-snug cursor-pointer hover:text-[var(--teal)] transition-colors m-0 p-0 text-[var(--ink)]"
				title={titleInfo}
				onDoubleClick={handleDoubleClick}
				onClick={handleClick}
			>
				<span className="truncate block min-w-0 max-w-full">
					{formatPatientDisplayFio(patientName)}
				</span>
			</h3>
		);
	}

	return (
		<h3
			className="text-base font-semibold truncate min-w-0 max-w-full leading-snug cursor-pointer hover:text-[var(--teal)] transition-colors text-[var(--ink)]"
			title={titleInfo}
			onDoubleClick={handleDoubleClick}
			onClick={handleClick}
		>
			<span className="truncate block min-w-0 max-w-full">
				{formatPatientDisplayFio(patientName)}
			</span>
		</h3>
	);
}
