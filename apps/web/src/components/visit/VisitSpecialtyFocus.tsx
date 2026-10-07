import React, { useState, useMemo } from "react";
import { ChevronDown, FileText, X } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { VisitSurgeryProtocolTab } from "./surgery/VisitSurgeryProtocolTab";
import { VisitTherapyProtocolWidget } from "./therapy/VisitTherapyProtocolWidget";
import { VisitPediatricProtocolWidget } from "../pediatric/VisitPediatricProtocolWidget";

export interface VisitSpecialtyFocusProps {
	compact?: boolean;
	isDrawerOpen?: boolean;
	onToggleDrawer?: (open: boolean) => void;
	renderBarOnly?: boolean;
	renderDrawerOnly?: boolean;
}

export function VisitSpecialtyFocus({
	compact = false,
	isDrawerOpen: propIsDrawerOpen,
	onToggleDrawer: propOnToggleDrawer,
	renderBarOnly = false,
	renderDrawerOnly = false,
}: VisitSpecialtyFocusProps = {}) {
	// `|| {}` убран: useAppLogicContext() либо отдаёт контекст, либо бросает
	// исключение (contexts/AppLogicContext.tsx) — пустой объект он больше не
	// выдумывает, и вторая ветка была недостижима.
	const context = useAppLogicContext();
	const {
		activeDoctor,
		activeChair,
		activePatient,
		selectedSpecialty,
		setSelectedSpecialty,
		setSelectedProtocolId,
		specialtyLabels = {},
		visibleVisitSpecialtyFocusOptions = [],
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	} = context as any;

	const [localIsProtocolDrawerOpen, setLocalIsProtocolDrawerOpen] = useState(false);
	const isProtocolDrawerOpen =
		propIsDrawerOpen !== undefined ? propIsDrawerOpen : localIsProtocolDrawerOpen;
	const setIsProtocolDrawerOpen = (valOrFn: any) => {
		const next =
			typeof valOrFn === "function" ? valOrFn(isProtocolDrawerOpen) : valOrFn;
		if (propOnToggleDrawer) {
			propOnToggleDrawer(next);
		} else {
			setLocalIsProtocolDrawerOpen(next);
		}
	};
	const [activeTooth, setActiveTooth] = useState<number | null>(
		Number(context?.dashboard?.activeVisit?.diagnosisTooth) || 16,
	);
	const [activeSurfaces, setActiveSurfaces] = useState<string[]>(["O"]);
	const [franklRating, setFranklRating] = useState<1 | 2 | 3 | 4>(3);

	const patientAgeYears = useMemo(() => {
		if (activePatient?.birthDate) {
			const birth = new Date(activePatient.birthDate);
			if (!Number.isNaN(birth.getTime())) {
				const now = new Date();
				let age = now.getFullYear() - birth.getFullYear();
				const m = now.getMonth() - birth.getMonth();
				if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
					age--;
				}
				return age;
			}
		}
		if (typeof activePatient?.age === "number") return activePatient.age;
		return undefined;
	}, [activePatient?.birthDate, activePatient?.age]);

	const isChildDentition =
		(patientAgeYears !== undefined && patientAgeYears < 18) ||
		selectedSpecialty === "pediatric" ||
		selectedSpecialty === "children";
	const isSurgery =
		selectedSpecialty === "surgery" ||
		selectedSpecialty === "хирургия" ||
		selectedSpecialty === "surgeon" ||
		selectedSpecialty === "implantologist";
	const isTherapy =
		selectedSpecialty === "therapy" ||
		selectedSpecialty === "терапия" ||
		selectedSpecialty === "caries" ||
		(!isSurgery && !isChildDentition);

	const handleApplyProtocolText = (text: string) => {
		if (typeof context?.appendToTranscript === "function") {
			context.appendToTranscript(`\n\n${text}`);
		}
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							treatmentDescription: text,
						},
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// ignore
		}
	};

	// biome-ignore lint/suspicious/noExplicitAny: supports both array of services and single item
	const handleAddToInvoice = (services: any) => {
		try {
			if (typeof window === "undefined") return;
			const list = Array.isArray(services) ? services : [services];
			const formattedServices = list
				.filter(Boolean)
				.map((item) => ({
					code: item.code804n || item.code || "A16.07.002",
					title: item.title || item.name || item.nameRu || "Стоматологическая услуга",
					price: item.priceRub || item.price || 0,
					quantity: item.quantity || 1,
					toothCode: activeTooth ? String(activeTooth) : undefined,
				}));

			if (formattedServices.length > 0) {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: {
							toothNumber: activeTooth ? Number(activeTooth) || activeTooth : undefined,
							toothCode: activeTooth ? String(activeTooth) : undefined,
							services: formattedServices,
						},
					}),
				);
			}
		} catch {
			// ignore
		}
	};

	const currentSpecialtyLabel =
		(selectedSpecialty && specialtyLabels[selectedSpecialty]) ||
		selectedSpecialty ||
		"Прием";
	const focusOptions = Array.isArray(visibleVisitSpecialtyFocusOptions)
		? visibleVisitSpecialtyFocusOptions
		: [];

	const activeWidgetTitle = isChildDentition
		? "Детский протокол"
		: isSurgery
			? "Хирургический протокол"
			: "Терапевтический протокол";

	const barSection = compact ? (
		<div data-testid="visit-specialty-focus" className="inline-flex items-center shrink-0">
			<button
				type="button"
				data-testid="toggle-specialty-protocol-drawer"
				onClick={() => setIsProtocolDrawerOpen((prev: boolean) => !prev)}
				className={`h-8 min-h-[32px] max-h-[32px] px-3 rounded-lg border text-[13px] font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0 active:scale-[0.98] ${
					isProtocolDrawerOpen
						? "border-[var(--teal)] bg-[var(--paper-soft)] text-[var(--teal-ink,var(--teal))]"
						: "border-[var(--line-subtle)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] hover:text-[var(--teal-ink,var(--teal))]"
				}`}
				title="Развернуть специализированный бланк приема"
				aria-expanded={isProtocolDrawerOpen}
				aria-label="Специализированный клинический бланк"
			>
				<FileText size={13} className="text-[var(--teal)] shrink-0" />
				<span className="hidden sm:inline">Бланк: {isChildDentition ? "Детство" : isSurgery ? "Хирургия" : "Терапия"}</span>
				<span className="sm:hidden">{isChildDentition ? "Детство" : isSurgery ? "Хирургия" : "Терапия"}</span>
				<ChevronDown size={12} className={`shrink-0 transition-transform duration-150 ${isProtocolDrawerOpen ? "rotate-180" : ""}`} />
			</button>
		</div>
	) : (
		<section
			data-testid="visit-specialty-focus"
			className="specialty-focus-bar bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-between gap-1.5 shrink-0 select-none rounded-lg px-3 min-h-[32px] h-8 text-xs shadow-2xs"
			aria-label="Фокус специальности приема"
		>
			<div className="flex items-center gap-1.5 min-w-0">
				<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] shrink-0 hidden sm:inline">Фокус:</span>
				<strong className="font-semibold text-xs text-[var(--ink)] truncate">{currentSpecialtyLabel}</strong>
				<span className="text-xs text-[var(--muted)] hidden lg:inline shrink-0">
					({activeDoctor?.fullName?.split(" ")[0] ?? "Врач"} · {activeChair?.name ?? "кресло"})
				</span>
			</div>
			<div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
				{focusOptions.length === 0 ? (
					<span className="text-xs text-[var(--muted)] truncate">
						Направления не настроены
					</span>
				) : null}
				{focusOptions.length > 0 && (
					<div
						className="inline-flex items-center p-[2px] rounded-[9px] bg-[var(--paper-soft)] border border-[var(--line-subtle)] gap-[2px] shadow-2xs shrink-0"
						role="tablist"
						aria-label="Направления специализаций"
					>
						{focusOptions.map((option: any) => {
							const isActive = selectedSpecialty === option.specialty;
							return (
								<button
									className={`h-7 px-2.5 rounded-[7px] text-[12.5px] transition-all cursor-pointer select-none whitespace-nowrap ${
										isActive
											? "bg-[var(--teal)] text-white font-semibold shadow-xs"
											: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-medium"
									}`}
									type="button"
									role="tab"
									key={option.specialty}
									aria-selected={isActive}
									onClick={() => {
										if (setSelectedSpecialty) setSelectedSpecialty(option.specialty);
										if (setSelectedProtocolId) setSelectedProtocolId(null);
									}}
									title={option.hint}
								>
									<span>{option.title}</span>
								</button>
							);
						})}
					</div>
				)}

				{/* Кнопка быстрого специализированного бланка (Мандаты 8c, 8e: Warm Context Tier 2) */}
				<button
					type="button"
					onClick={() => setIsProtocolDrawerOpen((prev: boolean) => !prev)}
					className="h-7.5 px-2.5 rounded-lg text-[12.5px] font-semibold flex items-center gap-1 transition-all cursor-pointer border border-[var(--line-subtle)] bg-[var(--paper-soft)] text-[var(--teal-ink,var(--teal))] hover:bg-[var(--teal)] hover:text-white shrink-0"
					title="Развернуть специализированный бланк приема"
					data-testid="toggle-specialty-protocol-drawer"
				>
					<FileText size={12} className="shrink-0" />
					<span className="hidden sm:inline">Бланк:</span>
					<span>{isChildDentition ? "Детство" : isSurgery ? "Хирургия" : "Терапия"}</span>
					<ChevronDown size={11} className={`shrink-0 transform transition-transform ${isProtocolDrawerOpen ? "rotate-180" : ""}`} />
				</button>
			</div>
		</section>
	);

	const drawerSection = isProtocolDrawerOpen ? (
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
					className="text-xs text-[var(--muted)] hover:text-[var(--ink)] font-semibold cursor-pointer px-2 py-0.5 rounded inline-flex items-center gap-1"
				>
					<X size={12} className="shrink-0" aria-hidden="true" />
					<span>Свернуть</span>
				</button>
			</div>

			{isChildDentition ? (
				<VisitPediatricProtocolWidget
					activeTooth={activeTooth}
					activeSurfaces={activeSurfaces}
					onSelectSurfaces={(s) => setActiveSurfaces([...s])}
					onApplyProtocolText={handleApplyProtocolText}
					onAddToInvoice={handleAddToInvoice}
					initialFranklRating={franklRating}
					onFranklChange={setFranklRating}
					patientName={activePatient?.fullName}
					patientAgeYears={patientAgeYears}
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
	) : null;

	if (renderBarOnly) {
		return barSection;
	}

	if (renderDrawerOnly) {
		return drawerSection;
	}

	return (
		<div className="flex flex-col gap-1.5 shrink-0">
			{barSection}
			{drawerSection}
		</div>
	);
}
