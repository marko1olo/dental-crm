import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Copy, Award } from "lucide-react";
import { showToast } from "../GlobalToast.js";
import type { OrthopedicPassportData, OrthopedicPassportA4ModalProps } from "./passport/orthopedicPassportTypes.js";
import { OrthopedicPassportHeader } from "./passport/OrthopedicPassportHeader.js";
import { OrthopedicPassportSpecsTable } from "./passport/OrthopedicPassportSpecsTable.js";
import { OrthopedicPassportCareNotice } from "./passport/OrthopedicPassportCareNotice.js";
import { OrthopedicPassportSignatures } from "./passport/OrthopedicPassportSignatures.js";
import { OrthopedicPassportMobileBar } from "./passport/OrthopedicPassportMobileBar.js";

export type { OrthopedicPassportData, OrthopedicPassportA4ModalProps };

const DEFAULT_CARE_NOTES = [
	"Проведение обязательной профессиональной гигиены и осмотра врачом не реже 1 раза в 6 месяцев.",
	"Использование зубной щетки мягкой/средней жесткости, монопучковой щетки и суперфлосса.",
	"Регулярное использование ирригатора полости рта в деликатном режиме для очистки десневого края.",
	"Исключение экстремальных механических перегрузок (разгрызание скорлупы орехов, костей).",
	"При появлении дискомфорта или скола немедленно обратиться к лечащему врачу.",
];

export function OrthopedicPassportA4Modal({ isOpen, onClose, passport }: OrthopedicPassportA4ModalProps) {
	const printRef = useRef<HTMLDivElement>(null);
	if (!isOpen) return null;

	const issueDate = passport.issueDate || new Date().toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" });
	const passportNumber = passport.passportNumber || (passport.orderNumber ? `ГП-${passport.orderNumber}` : `ГП-${Date.now().toString().slice(-6)}`);
	const clinicName = passport.clinicName || "Стоматологическая клиника «DENTE»";
	const labName = passport.labName || "Цифровая зуботехническая лаборатория «DenteLab Precision»";
	const patientName = passport.patientName || "Пациент";
	const doctorName = passport.doctorName || "Лечащий врач-ортопед";
	const technicianName = passport.technicianName || "Смирнов А.В. (Зубной техник CAD/CAM)";
	const warrantyLabelRu = passport.warrantyLabelRu || (passport.warrantyMonths ? `${passport.warrantyMonths} мес.` : "60 месяцев (5 лет)");
	const batchLot = passport.batchLotNumber || `LOT-2026-${passportNumber.replace(/\D/g, "").slice(-4) || "8841"}`;
	const standards = passport.standardsCompliance || "ГОСТ ISO 6872:2015 / ГОСТ 31572 / CE 0123 / СанПиН 2.1.3678-20";
	const careNotes = passport.careNotes && passport.careNotes.length > 0 ? passport.careNotes : DEFAULT_CARE_NOTES;

	const handlePrint = () => { if (typeof window !== "undefined") window.print(); };

	const handleCopyText = async () => {
		const text = `ПАСПОРТ ОРТОПЕДИЧЕСКОЙ КОНСТРУКЦИИ И ГАРАНТИЙНЫЙ ТАЛОН № ${passportNumber}\nКлиника: ${clinicName}\nЗТЛ: ${labName}\nПациент: ${patientName}${passport.patientChartNumber ? ` (карта № ${passport.patientChartNumber})` : ""}\nВрач: ${doctorName}\nТехник: ${technicianName}\nДата: ${issueDate}\nЗуб FDI: ${passport.toothFdi}\nКонструкция: ${passport.constructionName}\nМатериал: ${passport.material}\nЦвет VITA: ${passport.colorVita}\nГарантия: ${warrantyLabelRu}\nLOT: ${batchLot}\nСтандарты: ${standards}`;
		try {
			await navigator.clipboard.writeText(text);
			showToast("Текст паспорта скопирован в буфер обмена", "success", 2500);
		} catch {
			showToast("Не удалось скопировать текст", "error", 2000);
		}
	};

	const modalContent = (
		<div className="fixed inset-0 z-[99999] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto max-sm:items-end" role="dialog" aria-modal="true" data-testid="orthopedic-passport-modal">
			<style>{`@media print { body * { visibility: hidden !important; } #orthopedic-passport-print-area, #orthopedic-passport-print-area * { visibility: visible !important; } #orthopedic-passport-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 12mm 15mm !important; background: #fff !important; color: #0f172a !important; box-shadow: none !important; border: none !important; } .no-print { display: none !important; } }`}</style>
			<div className="relative w-full max-w-4xl bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-t-[24px] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[92vh]">
				<div className="sm:hidden w-9 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-2.5 mb-1 shrink-0 no-print" aria-hidden="true" />
				<div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 border-b border-[var(--line,#e2e8f0)] bg-slate-50 dark:bg-slate-800/60 no-print shrink-0">
					<div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
						<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0"><Award size={18} /></div>
						<div className="min-w-0 flex-1">
							<h3 className="text-xs sm:text-sm font-bold truncate text-slate-900 dark:text-slate-100">Паспорт ортопедической конструкции</h3>
							<p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">{passportNumber} · Зуб FDI {passport.toothFdi}</p>
						</div>
					</div>
					<div className="flex items-center gap-1.5 shrink-0">
						<button type="button" onClick={handleCopyText} className="hidden sm:inline-flex min-h-[34px] px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 items-center gap-1.5 cursor-pointer" data-testid="passport-copy-btn"><Copy size={14} className="text-teal-600" /><span>Скопировать</span></button>
						<button type="button" onClick={handlePrint} className="hidden sm:inline-flex min-h-[34px] px-3.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white items-center gap-1.5 shadow-xs cursor-pointer" data-testid="passport-print-btn"><Printer size={14} /><span>Печать (А4)</span></button>
						<button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" aria-label="Закрыть" data-testid="passport-close-btn"><X size={18} /></button>
					</div>
				</div>
				<div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100 dark:bg-slate-950/40">
					<div id="orthopedic-passport-print-area" ref={printRef} className="max-w-[800px] mx-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-4 sm:p-7 shadow-sm text-slate-900 dark:text-slate-100 font-sans" data-testid="passport-a4-sheet">
						<OrthopedicPassportHeader clinicName={clinicName} passportNumber={passportNumber} issueDate={issueDate} batchLot={batchLot} toothFdi={passport.toothFdi} />
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
							<div><span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Пациент</span><div className="font-bold">{patientName}</div>{passport.patientChartNumber && (<div className="text-[11px] text-slate-500">Мед. карта № {passport.patientChartNumber}</div>)}</div>
							<div><span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Врач-ортопед</span><div className="font-bold">{doctorName}</div><div className="text-[11px] text-slate-500">{clinicName}</div></div>
							<div><span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Изготовитель (ЗТЛ)</span><div className="font-bold">{technicianName}</div><div className="text-[11px] text-slate-500">{labName}</div></div>
						</div>
						<OrthopedicPassportSpecsTable passport={passport} batchLot={batchLot} standards={standards} />
						<OrthopedicPassportCareNotice warrantyLabelRu={warrantyLabelRu} careNotes={careNotes} />
						<OrthopedicPassportSignatures doctorName={doctorName} technicianName={technicianName} patientName={patientName} />
					</div>
				</div>
				<OrthopedicPassportMobileBar onCopyText={handleCopyText} onPrint={handlePrint} onClose={onClose} />
			</div>
		</div>
	);
	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
