import { StaffActionAuditService } from "../../services/audit/staffActionAuditService";
import {
	localCalendarDateString,
	calendarDateOfInstant,
	NIL_UUID,
	formatClockTime,
} from "./shiftDateHelpers";
import {
	type PrintEncashmentOptions,
	renderEncashmentStatementHtml,
} from "./renderEncashmentStatementHtml";

export {
	localCalendarDateString,
	calendarDateOfInstant,
	NIL_UUID,
	formatClockTime,
};
export type { PrintEncashmentOptions };

/**
 * Native A4 Print statement for 54-FZ Encashment & Doctor Shift Cash Reconciliation.
 * Adheres to 0% emoji policy and official accounting standards.
 */
export function printEncashmentStatement(options: PrintEncashmentOptions): void {
	StaffActionAuditService.logDocumentPrint({
		documentType: "encashment_statement_54fz",
		title: `Ведомость инкассации и сменный отчёт — ${options.doctorFullName}`,
	});

	const printWin = window.open("", "_blank", "width=800,height=900");
	if (!printWin) {
		window.print();
		return;
	}

	const html = renderEncashmentStatementHtml(options);
	printWin.document.open();
	printWin.document.write(html);
	printWin.document.close();
	printWin.focus();
	setTimeout(() => {
		printWin.print();
	}, 250);
}
