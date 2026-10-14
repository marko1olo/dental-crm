/**
 * OrthopedicPassportA4Modal.tsx — Паспорт ортопедической конструкции и Гарантийный талон (A4).
 *
 * Mandate 8b: Декомпозиция монолитов (<= 800 строк).
 * Mandate 8d: Ноль мультяшных эмодзи (строго векторные иконки Lucide и клиническая типографика).
 * Mandate 8e & 8n: 1-клик генерация паспорта конструкции для пациента без бюрократических преград.
 * Apple HIG: На смартфонах открывается как нативный Bottom Sheet со скруглением 24px, хэндлом 36×5px и плавающей кнопкой печати.
 */

import React, { useRef } from "react";
import { createPortal } from "react-dom";
import {
	X,
	Printer,
	Copy,
	ShieldCheck,
	CheckCircle2,
	Award,
	QrCode,
	FileText,
	Building2,
	User,
	Sparkles,
} from "lucide-react";
import { DentalCrown, ToothShadeGuide } from "../icons/DentalIcons.js";
import { showToast } from "../GlobalToast.js";

export interface OrthopedicPassportData {
	readonly orderNumber?: string | undefined;
	readonly passportNumber?: string | undefined;
	readonly issueDate?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientChartNumber?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly technicianName?: string | undefined;
	readonly labName?: string | undefined;
	readonly toothFdi: string;
	readonly constructionName: string;
	readonly material: string;
	readonly colorVita: string;
	readonly stumpShade?: string | undefined;
	readonly preparationMarginLabel?: string | undefined;
	readonly fixationTypeLabel?: string | undefined;
	readonly warrantyMonths?: number | undefined;
	readonly warrantyLabelRu?: string | undefined;
	readonly batchLotNumber?: string | undefined;
	readonly standardsCompliance?: string | undefined;
	readonly careNotes?: readonly string[] | undefined;
}

export interface OrthopedicPassportA4ModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly passport: OrthopedicPassportData;
}

export function OrthopedicPassportA4Modal({
	isOpen,
	onClose,
	passport,
}: OrthopedicPassportA4ModalProps) {
	const printRef = useRef<HTMLDivElement>(null);

	if (!isOpen) return null;

	const issueDate = passport.issueDate || new Date().toLocaleDateString("ru-RU", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	const passportNumber =
		passport.passportNumber ||
		(passport.orderNumber ? `ГП-${passport.orderNumber}` : `ГП-${Date.now().toString().slice(-6)}`);

	const clinicName = passport.clinicName || "Стоматологическая клиника «DENTE»";
	const labName = passport.labName || "Цифровая зуботехническая лаборатория «DenteLab Precision»";
	const patientName = passport.patientName || "Пациент";
	const doctorName = passport.doctorName || "Лечащий врач-ортопед";
	const technicianName = passport.technicianName || "Смирнов А.В. (Зубной техник CAD/CAM)";
	const warrantyLabelRu = passport.warrantyLabelRu || (passport.warrantyMonths ? `${passport.warrantyMonths} мес.` : "60 месяцев (5 лет)");
	const batchLot = passport.batchLotNumber || `LOT-2026-${passportNumber.replace(/\D/g, "").slice(-4) || "8841"}`;
	const standards = passport.standardsCompliance || "ГОСТ ISO 6872:2015 / ГОСТ 31572 / CE 0123 / СанПиН 2.1.3678-20";

	const defaultCareNotes = [
		"Проведение обязательной профессиональной гигиены и осмотра лечащим врачом не реже 1 раза в 6 месяцев.",
		"Использование зубной щетки мягкой или средней жесткости, монопучковой щетки и суперфлосса для очистки межзубных промежутков.",
		"Регулярное использование ирригатора полости рта в деликатном режиме (давление 2-3 бара) для очистки десневого края.",
		"Исключение экстремальных механических перегрузок (разгрызание скорлупы орехов, костей, открывание бутылок).",
		"При появлении дискомфорта, подвижности или скола немедленно обратиться к лечащему врачу без самостоятельных манипуляций.",
	];

	const careNotes = passport.careNotes && passport.careNotes.length > 0
		? passport.careNotes
		: defaultCareNotes;

	const handlePrint = () => {
		if (typeof window !== "undefined") {
			window.print();
		}
	};

	const handleCopyText = async () => {
		const text = `ПАСПОРТ ОРТОПЕДИЧЕСКОЙ КОНСТРУКЦИИ И ГАРАНТИЙНЫЙ ТАЛОН № ${passportNumber}
Клиника: ${clinicName}
ЗТЛ: ${labName}
Пациент: ${patientName}${passport.patientChartNumber ? ` (карта № ${passport.patientChartNumber})` : ""}
Врач-ортопед: ${doctorName}
Зубной техник: ${technicianName}
Дата выдачи: ${issueDate}
Зубы FDI: ${passport.toothFdi}
Конструкция: ${passport.constructionName}
Материал: ${passport.material}
Цвет по шкале VITA: ${passport.colorVita}${passport.stumpShade ? ` (Культя: ${passport.stumpShade})` : ""}
Вид фиксации: ${passport.fixationTypeLabel || "Постоянная цементная (GC Fuji Plus / RelyX U200)"}
Граница препарирования: ${passport.preparationMarginLabel || "Круговой уступ Chamfer"}
Гарантийный срок: ${warrantyLabelRu}
Партия материала (LOT): ${batchLot}
Стандарты: ${standards}`;

		try {
			await navigator.clipboard.writeText(text);
			showToast("Текст паспорта скопирован в буфер обмена", "success", 2500);
		} catch {
			showToast("Не удалось скопировать текст", "error", 2000);
		}
	};

	const modalContent = (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto max-sm:items-end"
			role="dialog"
			aria-modal="true"
			aria-labelledby="passport-modal-title"
			data-testid="orthopedic-passport-modal"
		>
			<style>{`
				@media print {
					body * {
						visibility: hidden !important;
					}
					#orthopedic-passport-print-area,
					#orthopedic-passport-print-area * {
						visibility: visible !important;
					}
					#orthopedic-passport-print-area {
						position: absolute !important;
						left: 0 !important;
						top: 0 !important;
						width: 100% !important;
						margin: 0 !important;
						padding: 12mm 15mm !important;
						background: #ffffff !important;
						color: #0f172a !important;
						box-shadow: none !important;
						border: none !important;
					}
					.no-print {
						display: none !important;
					}
				}
				@media (max-width: 640px) {
					.passport-desktop-action {
						display: none !important;
					}
				}
			`}</style>

			{/* Modal Container: On Mobile = Native Bottom Sheet (rounded-t-[24px]) */}
			<div className="relative w-full max-w-4xl bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-t-[24px] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[92vh]">
				{/* Mobile Drag Handle (Apple HIG standard 36x5px) */}
				<div className="sm:hidden w-9 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-2.5 mb-1 shrink-0 no-print" aria-hidden="true" />

				{/* Header Actions Toolbar */}
				<div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-[var(--line,#e2e8f0)] bg-slate-50 dark:bg-slate-800/60 no-print shrink-0">
					<div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
						<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
							<Award size={18} />
						</div>
						<div className="min-w-0 flex-1">
							<h3 id="passport-modal-title" className="text-xs sm:text-sm font-bold truncate text-slate-900 dark:text-slate-100">
								Паспорт ортопедической конструкции
							</h3>
							<p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
								{passportNumber} · Зуб FDI {passport.toothFdi}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							onClick={handleCopyText}
							className="passport-desktop-action hidden sm:inline-flex min-h-[36px] px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 items-center gap-1.5 transition-colors cursor-pointer"
							data-testid="passport-copy-btn"
							title="Скопировать текстовую версию паспорта"
						>
							<Copy size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Скопировать</span>
						</button>
						<button
							type="button"
							onClick={handlePrint}
							className="passport-desktop-action hidden sm:inline-flex min-h-[36px] px-3.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
							data-testid="passport-print-btn"
							title="Распечатать официальный бланк формата А4"
						>
							<Printer size={15} className="shrink-0" />
							<span>Печать (А4)</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
							aria-label="Закрыть"
							data-testid="passport-close-btn"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* Printable A4 Content Area */}
				<div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100 dark:bg-slate-950/40">
					<div
						id="orthopedic-passport-print-area"
						ref={printRef}
						className="max-w-[800px] mx-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-5 sm:p-8 shadow-sm text-slate-900 dark:text-slate-100 font-sans"
						data-testid="passport-a4-sheet"
					>
						{/* Document Header */}
						<div className="border-b-2 border-teal-600 pb-4 mb-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-bold text-xs uppercase tracking-wider mb-1">
									<Building2 size={14} />
									<span>{clinicName}</span>
								</div>
								<h1 className="text-sm sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
									ПАСПОРТ ОРТОПЕДИЧЕСКОЙ КОНСТРУКЦИИ
								</h1>
								<h2 className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
									И СЕРТИФИКАТ ГАРАНТИЙНЫХ ОБЯЗАТЕЛЬСТВ № <span className="font-mono text-teal-700 dark:text-teal-400">{passportNumber}</span>
								</h2>
							</div>

							<div className="text-left sm:text-right text-xs shrink-0 font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800/60">
								<div>Дата выдачи: <strong className="text-slate-900 dark:text-slate-100">{issueDate}</strong></div>
								<div>Статус: <strong className="text-emerald-600 dark:text-emerald-400">ПОСТОЯННАЯ ФИКСАЦИЯ</strong></div>
							</div>
						</div>

						{/* Section 1: Parties (Patient, Doctor, Lab) */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
							<div>
								<span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Пациент</span>
								<div className="font-bold text-slate-900 dark:text-slate-100">{patientName}</div>
								{passport.patientChartNumber && (
									<div className="text-[11px] text-slate-500">Мед. карта № {passport.patientChartNumber}</div>
								)}
							</div>
							<div>
								<span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Врач-ортопед</span>
								<div className="font-bold text-slate-900 dark:text-slate-100">{doctorName}</div>
								<div className="text-[11px] text-slate-500">{clinicName}</div>
							</div>
							<div>
								<span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Изготовитель (ЗТЛ)</span>
								<div className="font-bold text-slate-900 dark:text-slate-100">{technicianName}</div>
								<div className="text-[11px] text-slate-500">{labName}</div>
							</div>
						</div>

						{/* Section 2: Clinical Specification Matrix */}
						<div className="mb-5">
							<h3 className="text-xs uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider mb-2 flex items-center gap-1.5">
								<DentalCrown size={14} className="text-teal-600" />
								<span>Клинико-техническая спецификация</span>
							</h3>
							<div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
								<div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
									<div className="p-3 space-y-2">
										<div className="flex justify-between items-baseline">
											<span className="text-slate-500">Локализация (FDI зуб):</span>
											<span className="font-bold font-mono text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
												{passport.toothFdi}
											</span>
										</div>
										<div className="flex justify-between items-baseline">
											<span className="text-slate-500">Вид конструкции:</span>
											<span className="font-bold text-slate-900 dark:text-slate-100 text-right">
												{passport.constructionName}
											</span>
										</div>
										<div className="flex justify-between items-baseline">
											<span className="text-slate-500">Конструкционный материал:</span>
											<span className="font-bold text-slate-900 dark:text-slate-100 text-right">
												{passport.material}
											</span>
										</div>
										<div className="flex justify-between items-baseline">
											<span className="text-slate-500">Партия / LOT номер:</span>
											<span className="font-mono text-slate-700 dark:text-slate-300">
												{batchLot}
											</span>
										</div>
									</div>

									<div className="p-3 space-y-2">
										<div className="flex justify-between items-baseline">
											<span className="text-slate-500">Цвет по шкале VITA:</span>
											<span className="font-bold font-mono text-slate-900 dark:text-slate-100 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
												{passport.colorVita}
											</span>
										</div>
										{passport.stumpShade && (
											<div className="flex justify-between items-baseline">
												<span className="text-slate-500">Цвет культи (Natural Die):</span>
												<span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
													{passport.stumpShade}
												</span>
											</div>
										)}
										<div className="flex justify-between items-baseline">
											<span className="text-slate-500">Граница препарирования:</span>
											<span className="font-semibold text-slate-800 dark:text-slate-200">
												{passport.preparationMarginLabel || "Круговой уступ Chamfer"}
											</span>
										</div>
										<div className="flex justify-between items-baseline">
											<span className="text-slate-500">Вид фиксации:</span>
											<span className="font-semibold text-slate-800 dark:text-slate-200">
												{passport.fixationTypeLabel || "Постоянная цементная (Fuji Plus / RelyX)"}
											</span>
										</div>
									</div>
								</div>

								<div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
									<span>Стандарты безопасности: <strong>{standards}</strong></span>
									<span className="font-mono text-teal-700 dark:text-teal-400 font-bold">100% БИОСОВМЕСТИМО</span>
								</div>
							</div>
						</div>

						{/* Section 3: Warranty Conditions */}
						<div className="mb-5 p-3.5 rounded-lg border-2 border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs">
							<div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold mb-1.5">
								<ShieldCheck size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
								<span className="text-sm">Гарантийные обязательства: {warrantyLabelRu}</span>
							</div>
							<p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11.5px]">
								Клиника гарантирует сохранение целостности, функциональной пригодности и цветостабильности конструкции в течение установленного гарантийного срока при условии соблюдения пациентом правил гигиены и регулярного прохождения профилактических осмотров.
							</p>
						</div>

						{/* Section 4: Patient Care Recommendations */}
						<div className="mb-6">
							<h4 className="text-xs uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider mb-2 flex items-center gap-1.5">
								<FileText size={14} className="text-teal-600" />
								<span>Памятка пациенту по уходу за конструкцией</span>
							</h4>
							<ol className="list-decimal pl-4 space-y-1 text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
								{careNotes.map((note, idx) => (
									<li key={idx} className="pl-1">
										{note}
									</li>
								))}
							</ol>
						</div>

						{/* Section 5: Signatures & Stamp Placeholders */}
						<div className="border-t border-slate-300 dark:border-slate-700 pt-5 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
							<div>
								<span className="text-[10px] uppercase font-bold text-slate-400 block mb-6">Врач-ортопед</span>
								<div className="border-b border-slate-400 dark:border-slate-600 pb-1 mb-1 text-[11px] font-mono text-slate-700 dark:text-slate-300">
									/ _____________________ / {doctorName}
								</div>
								<span className="text-[10px] text-slate-400">М.П. Клиники</span>
							</div>

							<div>
								<span className="text-[10px] uppercase font-bold text-slate-400 block mb-6">Зубной техник</span>
								<div className="border-b border-slate-400 dark:border-slate-600 pb-1 mb-1 text-[11px] font-mono text-slate-700 dark:text-slate-300">
									/ _____________________ / {technicianName}
								</div>
								<span className="text-[10px] text-slate-400">Штамп лаборатории</span>
							</div>

							<div>
								<span className="text-[10px] uppercase font-bold text-slate-400 block mb-6">Пациент (с условиями ознакомлен)</span>
								<div className="border-b border-slate-400 dark:border-slate-600 pb-1 mb-1 text-[11px] font-mono text-slate-700 dark:text-slate-300">
									/ _____________________ / {patientName}
								</div>
								<span className="text-[10px] text-slate-400">Подпись пациента</span>
							</div>
						</div>
					</div>
				</div>

				{/* Floating Bottom Bar (Natural Thumb Zone for Mobile) */}
				<div className="sm:hidden p-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]/95 backdrop-blur-md flex items-center gap-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] no-print shrink-0">
					<button
						type="button"
						onClick={handleCopyText}
						className="min-h-[48px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 active:scale-95"
					>
						<Copy size={16} className="text-teal-600 dark:text-teal-400" />
						<span>Копия</span>
					</button>

					<button
						type="button"
						onClick={handlePrint}
						className="min-h-[48px] flex-1 rounded-xl bg-teal-600 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md active:scale-95"
					>
						<Printer size={16} />
						<span>Распечатать паспорт (А4)</span>
					</button>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[48px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 active:scale-95"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}
