import React from "react";
import { X } from "lucide-react";
import { VisitSurgeryProtocolTab } from "../surgery/VisitSurgeryProtocolTab";
import { VisitTherapyProtocolWidget } from "../therapy/VisitTherapyProtocolWidget";
import { VisitPediatricProtocolWidget } from "../../pediatric/VisitPediatricProtocolWidget";

export interface InvoiceItemDraft {
	readonly code804n?: string | undefined;
	readonly code?: string | undefined;
	readonly title?: string | undefined;
	readonly name?: string | undefined;
	readonly nameRu?: string | undefined;
	readonly priceRub?: number | undefined;
	readonly price?: number | undefined;
	readonly quantity?: number | undefined;
	readonly toothCode?: string | undefined;
}

export interface PatientSummary {
	readonly id?: string | undefined;
	readonly fullName?: string | undefined;
	readonly name?: string | undefined;
	readonly phone?: string | null | undefined;
	readonly birthDate?: string | Date | null | undefined;
	readonly age?: number | string | undefined;
	readonly weight?: number | undefined;
	readonly weightKg?: number | null | undefined;
	readonly allergies?: string | readonly string[] | string[] | null | undefined;
	readonly representativeFullName?: string | undefined;
	readonly representativePhone?: string | undefined;
	readonly representativeRole?: string | undefined;
	readonly parentName?: string | undefined;
	readonly parentPhone?: string | undefined;
	readonly parentRole?: string | undefined;
	readonly representative?: {
		readonly fullName?: string | undefined;
		readonly phone?: string | undefined;
		readonly role?: string | undefined;
	} | undefined;
	readonly [key: string]: unknown;
}

export interface User {
	readonly id?: string | undefined;
	readonly fullName?: string | undefined;
	readonly name?: string | undefined;
	readonly role?: string | undefined;
}

export interface SpecialtyDrawerContext {
	readonly dashboard?: unknown;
	readonly [key: string]: unknown;
}

export interface SpecialtyProtocolDrawerProps {
	visitId?: string | undefined;
	isProtocolDrawerOpen: boolean;
	setIsProtocolDrawerOpen: (val: boolean) => void;
	activeWidgetTitle: string;
	activeTooth: number | null;
	isChildDentition: boolean;
	isSurgery: boolean;
	activeSurfaces: string[];
	setActiveSurfaces: React.Dispatch<React.SetStateAction<string[]>>;
	handleApplyProtocolText: (text: string) => void;
	handleAddToInvoice: (services: InvoiceItemDraft[] | readonly InvoiceItemDraft[] | InvoiceItemDraft) => void;
	franklRating: 1 | 2 | 3 | 4;
	setFranklRating: React.Dispatch<React.SetStateAction<1 | 2 | 3 | 4>>;
	activePatient?: PatientSummary | null | undefined;
	activeDoctor?: User | null | undefined;
	patientAgeYears?: number | undefined;
	context?: SpecialtyDrawerContext | null | undefined;
	setActiveTooth: (tooth: number | null) => void;
}

export function SpecialtyProtocolDrawer({
	visitId,
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

	const resolvedVisitId =
		visitId ??
		(context && typeof context === "object" && "dashboard" in context
			? ((context.dashboard as { activeVisit?: { id?: string }; activeAppointment?: { id?: string } } | undefined)?.activeVisit?.id ??
			   (context.dashboard as { activeAppointment?: { id?: string } } | undefined)?.activeAppointment?.id)
			: undefined);

	return (
		<div
			key={resolvedVisitId ?? activePatient?.id ?? "specialty-drawer"}
			data-testid="specialty-protocol-drawer"
			className="specialty-protocol-drawer p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-md animate-in fade-in slide-in-from-top-2 duration-150"
		>
			<div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)]">
				<span className="font-bold text-xs text-[var(--ink)] flex items-center gap-2">
					<span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
					{activeWidgetTitle} (Зуб {activeTooth || "—"})
				</span>
				<button
					type="button"
					onClick={() => setIsProtocolDrawerOpen(false)}
					className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--primary)] font-semibold text-xs cursor-pointer px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-2xs transition-colors min-h-[44px] h-11 sm:min-h-[36px] sm:h-9 touch-manipulation"
					aria-label="Свернуть специализированный клинический бланк"
				>
					<X size={13} className="shrink-0" aria-hidden="true" />
					<span>Свернуть</span>
				</button>
			</div>

			{isChildDentition ? (
				<VisitPediatricProtocolWidget
					key={`${activePatient?.id ?? "pt"}-${activeTooth ?? "pedia"}`}
					activeTooth={activeTooth}
					onSelectActiveTooth={setActiveTooth}
					activeSurfaces={activeSurfaces}
					onSelectSurfaces={(s) => setActiveSurfaces([...s])}
					onApplyProtocolText={handleApplyProtocolText}
					onAddToInvoice={handleAddToInvoice}
					initialFranklRating={franklRating}
					onFranklChange={setFranklRating}
					patientId={activePatient?.id}
					patientName={activePatient?.fullName || activePatient?.name}
					patientPhone={activePatient?.phone ?? undefined}
					patientAgeYears={patientAgeYears}
					patientWeightKg={activePatient?.weight || activePatient?.weightKg || undefined}
					representativeFullName={activePatient?.representativeFullName || activePatient?.representative?.fullName || activePatient?.parentName}
					representativePhone={activePatient?.representativePhone || activePatient?.representative?.phone || activePatient?.parentPhone || activePatient?.phone || undefined}
					representativeRole={activePatient?.representativeRole || activePatient?.representative?.role || activePatient?.parentRole}
					allergies={Array.isArray(activePatient?.allergies) ? activePatient.allergies.join(", ") : (typeof activePatient?.allergies === "string" ? activePatient.allergies : undefined)}
					doctorName={activeDoctor?.fullName}
					clinicName={context && typeof context === "object" && "dashboard" in context && (context.dashboard as { organization?: { name?: string } } | undefined)?.organization?.name ? (context.dashboard as { organization: { name: string } }).organization.name : undefined}
				/>
			) : isSurgery ? (
				<VisitSurgeryProtocolTab
					key={`${activePatient?.id ?? "pt"}-${activeTooth ?? "surg"}`}
					activeTooth={activeTooth}
					onSelectActiveTooth={setActiveTooth}
					patientName={activePatient?.fullName}
					patientId={activePatient?.id}
					visitId={resolvedVisitId}
					doctorName={activeDoctor?.fullName}
					doctorId={activeDoctor?.id}
					onApplyToDiary={handleApplyProtocolText}
					onAddToInvoice={handleAddToInvoice}
				/>
			) : (
				<VisitTherapyProtocolWidget
					key={activeTooth ?? "therapy-root"}
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
