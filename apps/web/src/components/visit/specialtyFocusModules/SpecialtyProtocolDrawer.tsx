import React from "react";
import { X } from "lucide-react";
import { VisitSurgeryProtocolTab } from "../surgery/VisitSurgeryProtocolTab";
import { VisitTherapyProtocolWidget } from "../therapy/VisitTherapyProtocolWidget";
import { VisitPediatricProtocolWidget } from "../../pediatric/VisitPediatricProtocolWidget";

export interface SpecialtyProtocolDrawerProps {
	isProtocolDrawerOpen: boolean;
	setIsProtocolDrawerOpen: (val: boolean) => void;
	activeWidgetTitle: string;
	activeTooth: number | null;
	isChildDentition: boolean;
	isSurgery: boolean;
	activeSurfaces: string[];
	setActiveSurfaces: React.Dispatch<React.SetStateAction<string[]>>;
	handleApplyProtocolText: (text: string) => void;
	handleAddToInvoice: (services: any) => void;
	franklRating: 1 | 2 | 3 | 4;
	setFranklRating: React.Dispatch<React.SetStateAction<1 | 2 | 3 | 4>>;
	activePatient?: any;
	activeDoctor?: any;
	patientAgeYears?: number | undefined;
	context?: any;
	setActiveTooth: (tooth: number | null) => void;
}

export function SpecialtyProtocolDrawer({
	isProtocolDrawerOpen,
	setIsProtocolDrawerOpen,
	activeWidgetTitle,
	activeTooth,
	isChildDentition,
	isSurgery,
	activeSurfaces,
	setActiveSurfaces,
	handleApplyProtocolText,
	handleAddToInvoice,
	franklRating,
	setFranklRating,
	activePatient,
	activeDoctor,
	patientAgeYears,
	context,
	setActiveTooth,
}: SpecialtyProtocolDrawerProps) {
	if (!isProtocolDrawerOpen) return null;

	return (
		<div
			data-testid="specialty-protocol-drawer"
			className="specialty-protocol-drawer p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-md animate-in fade-in slide-in-from-top-2 duration-150"
		>
			<div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)]">
				<span className="font-bold text-xs text-[var(--ink)] flex items-center gap-2">
					<span className="w-2 h-2 rounded-full bg-[var(--teal,#0d9488)]" />
					{activeWidgetTitle} (Зуб {activeTooth || "—"})
				</span>
				<button
					type="button"
					onClick={() => setIsProtocolDrawerOpen(false)}
					className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)] font-semibold text-xs cursor-pointer px-2 py-0.5 rounded-lg inline-flex items-center gap-1 shadow-2xs transition-colors"
				>
					<X size={12} className="shrink-0" aria-hidden="true" />
					<span>Свернуть</span>
				</button>
			</div>

			{isChildDentition ? (
				<VisitPediatricProtocolWidget
					activeTooth={activeTooth}
					onSelectActiveTooth={setActiveTooth}
					activeSurfaces={activeSurfaces}
					onSelectSurfaces={(s) => setActiveSurfaces([...s])}
					onApplyProtocolText={handleApplyProtocolText}
					onAddToInvoice={handleAddToInvoice}
					initialFranklRating={franklRating}
					onFranklChange={setFranklRating}
					patientName={activePatient?.fullName || activePatient?.name}
					patientPhone={activePatient?.phone}
					patientAgeYears={patientAgeYears}
					patientWeightKg={activePatient?.weight || activePatient?.weightKg}
					representativeFullName={activePatient?.representativeFullName || activePatient?.representative?.fullName || activePatient?.parentName}
					representativePhone={activePatient?.representativePhone || activePatient?.representative?.phone || activePatient?.parentPhone || activePatient?.phone}
					representativeRole={activePatient?.representativeRole || activePatient?.representative?.role || activePatient?.parentRole}
					allergies={activePatient?.allergies}
					doctorName={activeDoctor?.fullName}
					clinicName={context?.dashboard?.organization?.name}
				/>
			) : isSurgery ? (
				<VisitSurgeryProtocolTab
					activeTooth={activeTooth}
					onSelectActiveTooth={setActiveTooth}
					patientName={activePatient?.fullName}
					patientId={activePatient?.id}
					doctorName={activeDoctor?.fullName}
					doctorId={activeDoctor?.id}
					onApplyToDiary={handleApplyProtocolText}
					onAddToInvoice={handleAddToInvoice}
				/>
			) : (
				<VisitTherapyProtocolWidget
					activeTooth={activeTooth}
					activeSurfaces={activeSurfaces}
					onSelectSurfaces={(s) => setActiveSurfaces([...s])}
					onApplyProtocolText={handleApplyProtocolText}
					onAddToInvoice={handleAddToInvoice}
				/>
			)}
		</div>
	);
}
