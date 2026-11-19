/**
 * Печать акта трансфера пациента и передачи медицинской документации между филиалами (152-ФЗ)
 */
export function printPatientBranchTransferAct(patient: { fullName?: string; id?: string }): void {
	if (typeof window === "undefined") return;
	const w = window.open("", "_blank");
	if (!w) return;
	const title = "Акт приема-передачи медицинской карты и трансфера пациента (152-ФЗ)";
	const patientName = patient?.fullName || "Пациент";
	const dateStr = new Date().toLocaleDateString("ru-RU");
	w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:system-ui,sans-serif;padding:32px;color:#1e293b;line-height:1.5;}h1{font-size:18px;margin-bottom:8px;}p{font-size:13px;margin:6px 0;}.signature{margin-top:40px;display:flex;justify-content:space-between;}</style></head><body><h1>${title}</h1><p><strong>Дата оформления:</strong> ${dateStr}</p><p><strong>Пациент:</strong> ${patientName}</p><p><strong>Основание:</strong> Согласие субъекта персональных данных на передачу ЭМК между филиалами клиники (ст. 9, 10 Федерального закона № 152-ФЗ).</p><div class="signature"><p>Передал: ____________________</p><p>Принял: ____________________</p><p>Пациент: ____________________</p></div></body></html>`);
	w.document.close();
	w.focus();
	w.print();
}
