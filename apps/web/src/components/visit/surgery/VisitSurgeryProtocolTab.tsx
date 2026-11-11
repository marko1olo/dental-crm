import React, { useMemo } from "react";
import "../../surgery/surgery.css";
import { SURGICAL_OPERATION_NORMS, COMMON_SURGERY_TEETH } from "../../surgery/surgeryCatalogData";
import { ImplantPassportCard } from "../../implants/ImplantPassportCard";
import { generateWarrantyPassportRecord } from "@dental/shared";
import type { FastImplantPassportData } from "../../implants/implantQuickPresets";
import { X, FileText, Plus } from "lucide-react";
import { useVisitSurgeryState } from "./modules/useVisitSurgeryState";
import { VisitSurgeryHeader } from "./modules/VisitSurgeryHeader";
import { VisitSurgeryToothSelector } from "./modules/VisitSurgeryToothSelector";
import { VisitSurgeryNormsGrid } from "./modules/VisitSurgeryNormsGrid";
import { VisitSurgeryCategoryCockpit } from "./modules/VisitSurgeryCategoryCockpit";
import { VisitSurgeryProtocolEditor } from "./modules/VisitSurgeryProtocolEditor";
import { VisitSurgeryFooterActions } from "./modules/VisitSurgeryFooterActions";
import { showToast } from "../../GlobalToast";

export interface VisitSurgeryProtocolTabProps {
	patientId?: string; patientName?: string; doctorId?: string; doctorName?: string;
	activeTooth?: number | null; onSelectActiveTooth?: (tooth: number | null) => void;
	onApplyToDiary?: ((text: string) => void) | undefined; onAddToInvoice?: ((service: unknown) => void) | undefined; className?: string | undefined;
}

export const VisitSurgeryProtocolTab: React.FC<VisitSurgeryProtocolTabProps> = ({
	patientId, patientName = "Пациент", doctorId, doctorName = "Врач-хирург",
	activeTooth, onSelectActiveTooth, onApplyToDiary, onAddToInvoice, className = "",
}) => {
	const s = useVisitSurgeryState({
		activeTooth: activeTooth ?? 46,
		patientName,
		doctorName,
		onSelectActiveTooth,
		onApplyToDiary,
		onAddToInvoice,
	});

	const passportData: FastImplantPassportData = useMemo(() => {
		return generateWarrantyPassportRecord({
			toothFdi: s.effectiveTooth,
			brand: s.implantBrand || "Dentium",
			model: "SuperLine SLA",
			diameterMm: s.implantDiameter || 4.0,
			lengthMm: s.implantLength || 10.0,
			torqueNcm: s.implantTorque || 35,
			isqDay0: s.implantIsq || 72,
			capType: s.implantCap === "plug" ? "plug" : "fdm",
			boneDensity: "D2",
			patientName,
			patientId,
			doctorName,
			doctorId,
			isWarehouseOverdraft: s.isMaterialsDeducted,
		});
	}, [
		s.effectiveTooth,
		s.implantBrand,
		s.implantDiameter,
		s.implantLength,
		s.implantTorque,
		s.implantIsq,
		s.implantCap,
		s.isMaterialsDeducted,
		patientName,
		patientId,
		doctorName,
		doctorId,
	]);

	return (
		<section
			className={`visit-surgery-container max-w-full overflow-x-clip ${s.isSterileGloveMode ? "sterile-glove-active" : ""} ${className}`.trim()}
			data-testid="visit-surgery-protocol-tab"
			aria-label="Хирургический протокол и кокпит имплантолога"
		>
			<VisitSurgeryHeader
				effectiveTooth={s.effectiveTooth} isSterileGloveMode={s.isSterileGloveMode}
				onToggleSterileMode={() => s.setIsSterileGloveMode(!s.isSterileGloveMode)}
				onOpenImplantModal={() => s.setIsImplantModalOpen(true)}
			/>
			<VisitSurgeryToothSelector effectiveTooth={s.effectiveTooth} commonTeeth={COMMON_SURGERY_TEETH} onSelectTooth={s.handleToothSelect} />
			<VisitSurgeryNormsGrid norms={SURGICAL_OPERATION_NORMS} selectedNormId={s.selectedNormId} onSelectNorm={s.handleNormClick} />
			<VisitSurgeryCategoryCockpit s={s} patientName={patientName} doctorName={doctorName} onAddToInvoice={onAddToInvoice} />
			<VisitSurgeryProtocolEditor
				protocolText={s.protocolText} onChangeText={s.setProtocolText}
				onCopy={() => { navigator.clipboard?.writeText(s.protocolText); showToast("Протокол операции скопирован", "success"); }}
			/>
			<VisitSurgeryFooterActions s={s} patientName={patientName} doctorName={doctorName} onAddToInvoice={onAddToInvoice} onApplyToDiary={onApplyToDiary} />
			{s.isImplantModalOpen && (
				<div
					className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
					data-testid="visit-implant-passport-dialog"
					role="dialog"
					aria-modal="true"
					aria-label={`Гарантийный паспорт имплантата Зуб FDI #${s.effectiveTooth}`}
					onClick={(e) => {
						if (e.target === e.currentTarget) s.setIsImplantModalOpen(false);
					}}
				>
					<div className="w-full max-w-3xl max-h-[90vh] bg-[var(--paper)] text-[var(--ink)] rounded-t-[24px] sm:rounded-2xl border border-[var(--line)] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
						{/* Apple HIG Drag Handle for Mobile */}
						<div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
							<div className="w-9 h-1 rounded-full bg-[var(--line-strong,#94a3b8)]" />
						</div>

						{/* Header */}
						<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] shrink-0">
							<div className="flex items-center gap-2">
								<h3 className="text-sm font-black text-[var(--ink)] m-0">
									Гарантийный паспорт дентального имплантата
								</h3>
								<span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]">
									#{s.effectiveTooth}
								</span>
							</div>
							<button
								type="button"
								onClick={() => s.setIsImplantModalOpen(false)}
								className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
								title="Закрыть"
								data-testid="btn-close-passport-dialog"
							>
								<X size={18} />
							</button>
						</div>

						{/* Card content */}
						<div className="p-4 overflow-y-auto flex-1 max-w-full overflow-x-clip">
							<ImplantPassportCard data={passportData} />
						</div>

						{/* Footer Actions */}
						<div className="flex items-center justify-between gap-2 p-3 sm:px-4 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 flex-wrap">
							<div className="text-xs text-[var(--muted)] hidden sm:block">
								Формат А5 • Официальный гарантийный сертификат
							</div>
							<div className="flex items-center gap-2 w-full sm:w-auto justify-end">
								<button
									type="button"
									onClick={() => {
										onAddToInvoice?.({
											code: "A16.07.054",
											name: `Операция установки дентального имплантата ${passportData.brand} Ø${passportData.diameterMm}x${passportData.lengthMm}мм (Зуб #${passportData.toothFdi})`,
											priceRub: 45000,
											quantity: 1,
										});
										showToast(`Услуга имплантации #${passportData.toothFdi} добавлена в смету`, "success");
									}}
									className="px-3 py-2 rounded-xl text-xs font-bold border border-[var(--teal,#0d9488)] bg-[var(--paper)] text-[var(--teal,#0d9488)] hover:bg-[var(--teal,#0d9488)] hover:text-white flex items-center gap-1.5 cursor-pointer min-h-[44px] touch-manipulation transition-all"
									data-testid="btn-passport-add-to-invoice"
								>
									<Plus size={16} />
									<span>+ В смету</span>
								</button>
								<button
									type="button"
									onClick={() => {
										const text = `Операция дентальной имплантации в области зуба FDI #${passportData.toothFdi}. Установлен имплантат ${passportData.brand} Ø${passportData.diameterMm}x${passportData.lengthMm}мм. Торк ${passportData.torqueNcm} Н·см.`;
										s.setProtocolText((prev) => (prev ? `${prev}\n\n${text}` : text));
										onApplyToDiary?.(text);
										s.setIsImplantModalOpen(false);
										showToast("Паспорт внесен в дневник приёма", "success");
									}}
									className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] flex items-center gap-1.5 cursor-pointer min-h-[44px] touch-manipulation shadow-xs hover:opacity-90 transition-all"
									data-testid="btn-passport-apply-diary"
								>
									<FileText size={16} />
									<span>Внести в карту</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</section>
	);
};

export default VisitSurgeryProtocolTab;
