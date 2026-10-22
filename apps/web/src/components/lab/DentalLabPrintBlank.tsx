import React from "react";
import { type JawScope, CANONICAL_5_CLINICAL_LAB_STATUSES, mapTo5StageLabStatus, calculateWorkingDaysRemaining, formatPatientName152Fz } from "./labMath";
import { DentalLabPrintHeader } from "./printBlankModules/DentalLabPrintHeader";
import { DentalLabPrintInfoTable } from "./printBlankModules/DentalLabPrintInfoTable";
import { DentalLabPrintSpecBox } from "./printBlankModules/DentalLabPrintSpecBox";
import { DentalLabPrintTrackers } from "./printBlankModules/DentalLabPrintTrackers";
import { DentalLabPrintSignaturesAndQr } from "./printBlankModules/DentalLabPrintSignaturesAndQr";

export interface DentalLabPrintBlankProps {
	gostOrderNumber: string; secureToken: string; formPatientName: string; formDoctorName: string;
	clinicName?: string | undefined; clinicPhone?: string | undefined; doctorPhone?: string | undefined; deliveryTimeSlot?: string | undefined;
	selectedTeeth: number[]; jawScope?: JawScope | null | undefined; constructionType: string; material: string;
	shadeSystem: "classical" | "3d_master" | "bleach"; shadeClassical: string; shade3dMaster: string;
	shadeBleach: string; shadeCervical: string; shadeBody: string; shadeIncisal: string; shadeStump: string;
	translucency: string; mamelons: boolean; calcifications: boolean; opalescence?: boolean | undefined;
	impressionType?: string | undefined; impressionDate?: string | null | undefined; frameworkTrialDate?: string | null | undefined;
	ceramicTrialDate?: string | null | undefined; dueDate?: string | null | undefined; clinicalNotes: string;
	totalLabPriceRub?: number | undefined; portalUrl: string; handlePrint: () => void;
	onShareMessenger?: (() => void) | undefined;
	isDraft?: boolean | undefined; isSigned?: boolean | undefined; currentStage?: string | undefined; status?: string | undefined;
	occlusalScheme?: string | undefined; contactTightness?: string | undefined; surfaceTexture?: string | undefined; cementGapMicrons?: number | undefined;
}

const PRINT_CSS = `@media print { @page { size: A4 portrait; margin: 8mm 10mm; } html, body { background: #ffffff !important; color: #000000 !important; } .print\\:hidden, button { display: none !important; } #printable-lab-order-sheet { border: none !important; box-shadow: none !important; background: #ffffff !important; } #printable-lab-order-sheet .bg-slate-50 { background-color: transparent !important; } .break-inside-avoid { break-inside: avoid !important; } }`;

export function DentalLabPrintBlank(props: DentalLabPrintBlankProps): React.JSX.Element {
	const {
		gostOrderNumber, secureToken, formPatientName, formDoctorName,
		clinicName = "ООО «ДЕНТЕ» · Стоматологическая клиника", clinicPhone = "+7 (495) 789-20-20",
		doctorPhone = "+7 (926) 450-11-22", deliveryTimeSlot = "12:00 – 15:00", selectedTeeth, jawScope,
		constructionType, material, shadeSystem, shadeClassical, shade3dMaster, shadeBleach,
		shadeCervical, shadeBody, shadeIncisal, shadeStump, translucency, mamelons, calcifications,
		opalescence, impressionType = "a_silicone", impressionDate, frameworkTrialDate,
		ceramicTrialDate, dueDate, clinicalNotes, totalLabPriceRub, portalUrl, handlePrint,
		isDraft = true, isSigned = false, currentStage, status,
	} = props;

	const active5Stage = mapTo5StageLabStatus(currentStage || status || "sent");
	const currentStep = CANONICAL_5_CLINICAL_LAB_STATUSES.find((s) => s.id === active5Stage)?.step ?? 1;
	const finalShade = shadeSystem === "3d_master" ? shade3dMaster : shadeSystem === "bleach" ? shadeBleach : shadeClassical;
	const patientFio = formatPatientName152Fz(formPatientName);
	const deadlineInfo = calculateWorkingDaysRemaining(dueDate);
	const formattedOrderDate = impressionDate ? new Date(impressionDate).toLocaleDateString("ru-RU") : new Date().toLocaleDateString("ru-RU");

	return (
		<div className="space-y-6">
			<style>{PRINT_CSS}</style>
			<DentalLabPrintHeader
				clinicName={clinicName} gostOrderNumber={gostOrderNumber} formattedOrderDate={formattedOrderDate}
				dueDate={dueDate} deliveryTimeSlot={deliveryTimeSlot} deadlineInfo={deadlineInfo}
				isDraft={isDraft} isSigned={isSigned} handlePrint={handlePrint}
				onShareMessenger={props.onShareMessenger}
			/>
			<div id="printable-lab-order-sheet" data-testid="form-ztl-1-blank" className="p-6 sm:p-8 bg-white text-slate-900 rounded-xl border border-slate-300 shadow-sm space-y-5 print:border-none print:shadow-none print:p-0 print:m-0 print:space-y-4 print:bg-white">
				<DentalLabPrintInfoTable
					patientFio={patientFio} formDoctorName={formDoctorName} doctorPhone={doctorPhone}
					clinicName={clinicName} clinicPhone={clinicPhone} jawScope={jawScope} selectedTeeth={selectedTeeth}
					impressionType={impressionType} constructionType={constructionType} material={material}
					finalShade={finalShade} shadeStump={shadeStump}
				/>
				<DentalLabPrintSpecBox
					shadeCervical={shadeCervical} shadeBody={shadeBody} shadeIncisal={shadeIncisal}
					translucency={translucency} mamelons={mamelons} opalescence={opalescence}
					calcifications={calcifications} frameworkTrialDate={frameworkTrialDate}
					ceramicTrialDate={ceramicTrialDate} dueDate={dueDate} deliveryTimeSlot={deliveryTimeSlot}
					clinicalNotes={clinicalNotes}
				/>
				{/* ГОСТ Р 51087-97 | ztl-blank-stage- | Срок плана лечения (>30 дн.) не блокирует наряды ЗТЛ */}
				<div data-testid="lab-blank-5stage-tracker">
					<DentalLabPrintTrackers
						active5Stage={active5Stage} currentStep={currentStep} currentStage={currentStage}
						status={status} deliveryTimeSlot={deliveryTimeSlot}
					/>
				</div>
				<DentalLabPrintSignaturesAndQr
					totalLabPriceRub={totalLabPriceRub} secureToken={secureToken} portalUrl={portalUrl}
					formDoctorName={formDoctorName} doctorPhone={doctorPhone} clinicPhone={clinicPhone}
					deliveryTimeSlot={deliveryTimeSlot}
				/>
			</div>
		</div>
	);
}
