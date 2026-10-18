import { StaffActionAuditService } from "../../../services/audit/staffActionAuditService";
import type { DoctorShiftStats } from "../controlBarModules/shiftControlBarTypes";
import type { DoctorShiftCompensationModel } from "./doctorShiftCloseTypes";
import { renderDoctorShiftStatementHtml } from "./renderDoctorShiftStatementHtml";

export interface PrintDoctorShiftStatementParams {
	doctorFullName: string;
	doctorSpecialtyRu: string;
	clinicName: string;
	todayLabel: string;
	shiftStats: DoctorShiftStats;
	cashRub: number;
	cardRub: number;
	sbpRub: number;
	depositRub: number;
	effectiveTotalCashRub: number;
	emrSigned: number;
	countedCashRub: number;
	cashDifferenceRub: number;
	isCashBalanced: boolean;
	cashboxName: string;
	fiscalDocNumber: string;
	compensationModel: DoctorShiftCompensationModel;
	calculatedPayoutRub: number;
	labDeductionsRub: number;
	fixedRentRub?: number;
	baseSalaryRub?: number;
}

export function printDoctorShiftStatement(params: PrintDoctorShiftStatementParams): void {
	StaffActionAuditService.logDocumentPrint({
		documentType: "doctor_shift_summary",
		title: `Сводка смены врача — ${params.doctorFullName}`,
	});

	const printWin = window.open("", "_blank", "width=800,height=900");
	if (!printWin) {
		window.print();
		return;
	}

	const html = renderDoctorShiftStatementHtml(params);
	printWin.document.open();
	printWin.document.write(html);
	printWin.document.close();
}
