import React from "react";
import { FileCheck, Printer, PackageMinus, Plus, FileText } from "lucide-react";
import { DentalImplant } from "../../../icons/DentalIcons";
import {
	executeApplyToVisitDiary,
	executePrintProtocol,
	executePrintIds,
	executeQuickDeduct,
} from "./visitSurgeryActions";
import { dispatchSurgicalServicesToInvoice } from "../../../surgery/surgeryCatalogData";
import { showToast } from "../../../GlobalToast";
import type { SurgicalServiceItem } from "@dental/shared";
import type { useVisitSurgeryState } from "./useVisitSurgeryState";

interface VisitSurgeryFooterActionsProps {
	s: ReturnType<typeof useVisitSurgeryState>;
	patientName: string;
	doctorName: string;
	patientId?: string | undefined;
	onAddToInvoice?: ((services: readonly SurgicalServiceItem[]) => void) | undefined;
	onApplyToDiary?: ((text: string) => void) | undefined;
}

const BTN_BASE =
	"px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer min-h-[48px] touch-manipulation transition-all";

export const VisitSurgeryFooterActions: React.FC<VisitSurgeryFooterActionsProps> = ({
	s,
	patientName,
	doctorName,
	patientId,
	onAddToInvoice,
	onApplyToDiary,
}) => {
	const handleDeduct = async () => {
		await executeQuickDeduct({
			currentNorm: s.currentNorm,
			hasWarehouseDelay: s.hasWarehouseDelay,
			effectiveTooth: s.effectiveTooth,
			implantBrand: s.implantBrand,
			implantSuture: s.implantSuture,
			patientId,
			implantDiameter: s.implantDiameter,
			implantLength: s.implantLength,
			implantTorque: s.implantTorque,
			implantIsq: s.implantIsq,
			implantCap: s.implantCap,
		});
		s.setIsMaterialsDeducted(true);
	};

	const handleAddServices = () => {
		const srv = dispatchSurgicalServicesToInvoice({
			norm: s.currentNorm,
			toothFdi: s.effectiveTooth,
			onAddToInvoice,
		});
		showToast(`Добавлено ${srv.length} услуг(и) в смету (зуб #${s.effectiveTooth})`, "success");
	};

	return (
		<footer className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--line)] flex-wrap">
			<div className="text-xs text-[var(--muted)]">
				{s.currentNorm.code804n && (
					<>
						<span>Услуга: </span>
						<strong className="text-[var(--ink)]">{s.currentNorm.code804n}</strong>
						<span> · </span>
					</>
				)}
				<span>Диагноз: </span>
				<strong className="text-[var(--ink)]">{s.currentNorm.icd10}</strong>
				{s.currentNorm.category === "implant" ? " · Торк 35 Н/см" : ""}
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={() => executePrintIds(patientName, doctorName, s.currentNorm.title, s.effectiveTooth)}
					className={`${BTN_BASE} border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--primary)]`}
					data-testid="btn-tab-print-ids"
					title="Печать комплекта ИДС и памятки пациента (3 бланка)"
				>
					<FileCheck size={16} />
					<span>Печать ИДС</span>
				</button>

				<button
					type="button"
					onClick={() =>
						executePrintProtocol({
							patientName,
							doctorName,
							currentNorm: s.currentNorm,
							effectiveTooth: s.effectiveTooth,
							protocolText: s.protocolText,
							implantDetails:
								s.selectedNormId === "surgery_implant_standard"
									? {
											implantBrand: s.implantBrand,
											diameterMm: s.implantDiameter,
											lengthMm: s.implantLength,
											torqueNcm: s.implantTorque,
											isq: s.implantIsq,
											capType: s.implantCap,
											sutureMaterial: s.implantSuture,
										}
									: undefined,
						})
					}
					className={`${BTN_BASE} border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--primary)]`}
					data-testid="btn-tab-print-protocol"
					title="Печать протокола операции"
				>
					<Printer size={16} />
					<span>Печать протокола</span>
				</button>

				<button
					type="button"
					onClick={handleDeduct}
					className={`${BTN_BASE} ${
						s.isMaterialsDeducted
							? "border-[var(--primary)] bg-[var(--primary-soft,rgba(var(--primary-rgb),0.1))] text-[var(--primary)]"
							: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--primary)]"
					}`}
					data-testid="btn-tab-deduct-materials"
					title="Списание материалов операции со склада"
				>
					<PackageMinus size={16} />
					<span>{s.isMaterialsDeducted ? "Материалы списаны" : "Списать со склада"}</span>
				</button>

				{s.currentNorm.category === "implant" && (
					<button
						type="button"
						onClick={() => s.setIsImplantModalOpen(true)}
						className={`${BTN_BASE} border-[var(--primary)] bg-[var(--primary-soft,rgba(var(--primary-rgb),0.1))] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white`}
						data-testid="btn-open-implant-passport-modal open-implant-passport-modal-btn"
						title="Открыть хирургический паспорт имплантата"
					>
						<DentalImplant size={16} />
						<span>Паспорт имплантата</span>
					</button>
				)}

				<button
					type="button"
					onClick={handleAddServices}
					className={`${BTN_BASE} border-[var(--primary)] bg-[var(--paper-soft)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white`}
					data-testid="btn-tab-add-to-invoice-804n"
					title="Добавить хирургические услуги в смету визита"
				>
					<Plus size={16} />
					<span>+ В смету</span>
				</button>

				<button
					type="button"
					onClick={() =>
						executeApplyToVisitDiary(s.protocolText, {
							onApplyToDiary,
							patientId,
							effectiveTooth: s.effectiveTooth,
							implantBrand: s.implantBrand,
							implantDiameter: s.implantDiameter,
							implantLength: s.implantLength,
							implantTorque: s.implantTorque,
							implantIsq: s.implantIsq,
							implantSuture: s.implantSuture,
							isImplant: s.currentNorm.category === "implant",
						})
					}
					className="visit-surgery-btn-action bg-[var(--primary)] text-white shadow-xs min-h-[48px] touch-manipulation cursor-pointer"
					data-testid="btn-apply-to-visit-diary"
				>
					<FileText size={16} />
					<span>Внести в карту</span>
				</button>
			</div>
		</footer>
	);
};
