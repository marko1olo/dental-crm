import React from "react";
import { Printer, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { money } from "../../AppHelpers";
import {
	CONSTRUCTION_TYPES,
	LAB_MATERIALS,
	generateBarcodeSvg,
	generateQrCodeSvg,
	type JawScope,
	formatJawScopeLabel,
	CANONICAL_5_CLINICAL_LAB_STATUSES,
	mapTo5StageLabStatus,
	CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES,
	mapTo6StageOrthopedicLifecycle,
	calculateWorkingDaysRemaining,
	formatPatientName152Fz,
} from "./labMath";

export interface DentalLabPrintBlankProps {
	gostOrderNumber: string;
	secureToken: string;
	formPatientName: string;
	formDoctorName: string;
	clinicName?: string;
	clinicPhone?: string;
	doctorPhone?: string;
	deliveryTimeSlot?: string;
	selectedTeeth: number[];
	jawScope?: JawScope | null;
	constructionType: string;
	material: string;
	shadeSystem: "classical" | "3d_master" | "bleach";
	shadeClassical: string;
	shade3dMaster: string;
	shadeBleach: string;
	shadeCervical: string;
	shadeBody: string;
	shadeIncisal: string;
	shadeStump: string;
	translucency: string;
	mamelons: boolean;
	calcifications: boolean;
	opalescence?: boolean;
	occlusalScheme?: string;
	contactTightness?: string;
	surfaceTexture?: string;
	cementGapMicrons?: number;
	impressionType?: string;
	impressionDate?: string | null;
	frameworkTrialDate?: string | null;
	ceramicTrialDate?: string | null;
	dueDate?: string | null;
	clinicalNotes: string;
	totalLabPriceRub?: number;
	portalUrl: string;
	handlePrint: () => void;
	isDraft?: boolean;
	isSigned?: boolean;
	currentStage?: string;
	status?: string;
}

export function DentalLabPrintBlank({
	gostOrderNumber,
	secureToken,
	formPatientName,
	formDoctorName,
	clinicName = "ООО «ДЕНТЕ» · Стоматологическая клиника",
	clinicPhone = "+7 (495) 789-20-20",
	doctorPhone = "+7 (926) 450-11-22",
	deliveryTimeSlot = "12:00 – 15:00",
	selectedTeeth,
	jawScope,
	constructionType,
	material,
	shadeSystem,
	shadeClassical,
	shade3dMaster,
	shadeBleach,
	shadeCervical,
	shadeBody,
	shadeIncisal,
	shadeStump,
	translucency,
	mamelons,
	calcifications,
	opalescence,
	occlusalScheme,
	contactTightness,
	surfaceTexture,
	cementGapMicrons,
	impressionType = "a_silicone",
	impressionDate,
	frameworkTrialDate,
	ceramicTrialDate,
	dueDate,
	clinicalNotes,
	totalLabPriceRub,
	portalUrl,
	handlePrint,
	isDraft = true,
	isSigned = false,
	currentStage,
	status,
}: DentalLabPrintBlankProps) {
	const active5Stage = mapTo5StageLabStatus(currentStage || status || "sent");
	const currentStep =
		CANONICAL_5_CLINICAL_LAB_STATUSES.find((s) => s.id === active5Stage)?.step ?? 1;


	const finalShade =
		shadeSystem === "3d_master"
			? shade3dMaster
			: shadeSystem === "bleach"
			? shadeBleach
			: shadeClassical;

	const patientFio = formatPatientName152Fz(formPatientName);
	const deadlineInfo = calculateWorkingDaysRemaining(dueDate);

	const impressionLabels: Record<string, string> = {
		a_silicone: "А-силикон (Винилполисилоксан / VPS)",
		c_silicone: "С-силикон (Конденсационный)",
		polyether: "Полиэфир (Impregum / Permadyne)",
		hydrocolloid: "Гидроколлоид (Агар-агар)",
		alginate: "Альгинатная масса",
		digital_scan_stl_ply: "Цифровой оптический 3D-скан (STL / PLY)",
		digital_scan: "Цифровой скан (STL/PLY)",
		pvs_silicone: "PVS-силикон",
	};

	const formattedOrderDate = impressionDate
		? new Date(impressionDate).toLocaleDateString("ru-RU")
		: new Date().toLocaleDateString("ru-RU");

	return (
		<div className="space-y-6">
			{/* Print stylesheet for perfect A4 output and anti-dark-theme-bleed */}
			<style>{`
				@media print {
					@page {
						size: A4 portrait;
						margin: 8mm 10mm;
					}
					html, body {
						background: #ffffff !important;
						color: #000000 !important;
						-webkit-print-color-adjust: exact !important;
						print-color-adjust: exact !important;
					}
					.print\\:hidden, button, header, nav, aside {
						display: none !important;
					}
					#printable-lab-order-sheet {
						border: none !important;
						box-shadow: none !important;
						padding: 0 !important;
						margin: 0 !important;
						background: #ffffff !important;
						color: #000000 !important;
					}
					#printable-lab-order-sheet,
					#printable-lab-order-sheet * {
						box-shadow: none !important;
						text-shadow: none !important;
					}
					/* Anti-muddy grey backgrounds: strip dirty shaded fills on physical paper */
					#printable-lab-order-sheet .bg-slate-50,
					#printable-lab-order-sheet .bg-slate-100,
					#printable-lab-order-sheet .bg-slate-200 {
						background-color: transparent !important;
						background: transparent !important;
					}
					#printable-lab-order-sheet .border-slate-200,
					#printable-lab-order-sheet .border-slate-300,
					#printable-lab-order-sheet .border-slate-400 {
						border-color: #000000 !important;
					}
					#printable-lab-order-sheet .bg-slate-900 {
						background-color: #ffffff !important;
						color: #000000 !important;
						border: 2px solid #000000 !important;
						font-weight: 800 !important;
					}
					.break-inside-avoid,
					tr,
					.teeth-avoid-break,
					.spec-avoid-break,
					.tracker-avoid-break {
						break-inside: avoid !important;
						page-break-inside: avoid !important;
					}
				}
			`}</style>

			{/* Header Toolbar */}
			<div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
				<div>
					<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
						Наряд-заказ в зуботехническую лабораторию
					</h3>
					<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
						Официальный наряд-заказ с уникальным 2D-штрихкодом партии и ссылкой для трекинга техником.
					</p>
				</div>
				<button
					type="button"
					onClick={handlePrint}
					data-testid="print-blank-action-btn"
					className="min-h-[36px] h-9 px-4 py-1.5 rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
				>
					<Printer className="w-4 h-4" />
					Распечатать наряд (A4 / Термочехол)
				</button>
			</div>

			{/* Printable Paper Card conforming to GOST / StAR standards */}
			<div
				id="printable-lab-order-sheet"
				data-testid="form-ztl-1-blank"
				className="p-6 sm:p-8 bg-white text-slate-900 rounded-xl border border-slate-300 shadow-sm space-y-5 print:border-none print:shadow-none print:p-0 print:m-0 print:space-y-4"
			>
				{/* Blank Header */}
				<div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
					<div>
						<div className="text-[11px] font-black uppercase tracking-wider text-slate-600">
							{clinicName}
						</div>
						<h1 className="text-lg sm:text-xl font-black tracking-wide uppercase m-0 mt-0.5">
							Наряд-заказ в зуботехническую лабораторию № {gostOrderNumber}
						</h1>
						<p className="text-xs text-slate-600 mt-0.5 m-0 font-medium">
							Стоматологическая медицинская организация · Отделение ортопедии и цифрового зубопротезирования CAD/CAM
						</p>
					</div>
					<div className="text-right shrink-0">
						<span className="text-xs font-bold block">
							Дата сдачи слепка/скана: <strong>{formattedOrderDate}</strong>
						</span>
						{dueDate && (
							<span className="text-xs font-bold text-rose-600 print:text-black block mt-0.5">
								Срок сдачи: {new Date(dueDate).toLocaleDateString("ru-RU")}
							</span>
						)}
						<span className="text-xs font-semibold block text-slate-700 print:text-black mt-0.5">
							Окно курьера: <strong>{deliveryTimeSlot}</strong>
						</span>
						{deadlineInfo && (
							<span
								className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${deadlineInfo.badgeClass}`}
								data-testid="print-blank-deadline-badge"
							>
								{deadlineInfo.labelRu}
							</span>
						)}
					</div>
				</div>

				{/* Watermark / Statutory Stamp (Mandate 8e item 5) */}
				<div
					className="p-2.5 rounded-lg border text-xs font-black uppercase tracking-wider flex justify-between items-center"
					style={{
						borderColor: isSigned && !isDraft ? "#059669" : "#d97706",
						backgroundColor: isSigned && !isDraft ? "#f0fdf4" : "#fffbeb",
						color: isSigned && !isDraft ? "#047857" : "#b45309",
					}}
				>
					<span>
						{isSigned && !isDraft
							? "ШТАМП: ПОДПИСАНО ВРАЧОМ • ОФИЦИАЛЬНЫЙ НАРЯД ЗТЛ"
							: "ШТАМП: ЧЕРНОВИК • ПРЕДВАРИТЕЛЬНОЕ ТЗ"}
					</span>
					<span className="font-mono text-[11px] font-bold">
						{isSigned && !isDraft ? "СТАТУС: ПОДПИСАН" : "СТАТУС: ЧЕРНОВИК"}
					</span>
				</div>

				{/* Info Table */}
				<div className="grid grid-cols-2 gap-4 text-xs break-inside-avoid print:break-inside-avoid" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
					<div className="space-y-1.5">
						<div>
							<strong>Пациент:</strong> <span className="font-bold">{patientFio.fullName}</span>{" "}
							<span className="text-[11px] text-slate-500 font-normal">
								(Курьерский код: <strong>{patientFio.courierMaskedName}</strong>)
							</span>
						</div>
						<div>
							<strong>Врач-ортопед:</strong> <span className="font-bold">{formDoctorName}</span>
							{doctorPhone && (
								<span className="text-[11px] text-slate-600 print:text-black font-normal ml-1">
									(Тел: <strong>{doctorPhone}</strong>)
								</span>
							)}
						</div>
						<div>
							<strong>Клиника:</strong> <span className="font-bold">{clinicName}</span>
							{clinicPhone && (
								<span className="text-[11px] text-slate-600 print:text-black font-normal ml-1">
									(Тел: <strong>{clinicPhone}</strong>)
								</span>
							)}
						</div>
						<div>
							<strong>Зубная формула (FDI):</strong>{" "}
							<span className="font-bold text-sm bg-slate-100 print:bg-transparent px-2 py-0.5 rounded border border-slate-200 print:border-black">
								{jawScope
									? `Челюсть целиком: ${formatJawScopeLabel(jawScope)}`
									: selectedTeeth.length > 0
									? selectedTeeth.join(", ")
									: "Челюсть целиком / Общечелюстное изделие"}
							</span>
						</div>
						<div>
							<strong>Слепок / Оттискная масса:</strong>{" "}
							<span className="font-bold">{impressionLabels[impressionType] || impressionType}</span>
						</div>
					</div>
					<div className="space-y-1.5">
						<div>
							<strong>Вид конструкции:</strong>{" "}
							<span className="font-bold">
								{CONSTRUCTION_TYPES.find((c) => c.id === constructionType)?.name || constructionType}
							</span>
						</div>
						<div>
							<strong>Материал каркаса:</strong>{" "}
							<span className="font-bold">
								{LAB_MATERIALS.find((m) => m.id === material)?.name || material}
							</span>
						</div>
						<div>
							<strong>Основной цвет VITA:</strong>{" "}
							<span className="font-bold">{finalShade}</span>{" "}
							{shadeStump ? `(Культя: ${shadeStump})` : ""}
						</div>
						<div>
							<strong>Гарантийный срок:</strong>{" "}
							<span className="font-bold">2 года (ГОСТ Р 51087-97 / Рекомендации СтАР)</span>
						</div>
					</div>
				</div>

				{/* Detailed Spec Box */}
				<div className="p-3.5 bg-slate-50 border border-slate-300 rounded-lg text-xs space-y-2 break-inside-avoid print:break-inside-avoid print:bg-transparent print:border-black" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
					<div className="font-bold border-b border-slate-200 pb-1 uppercase tracking-wider text-[11px] text-slate-700 print:border-black print:text-black">
						Техническое задание зубному технику:
					</div>
					<div className="grid grid-cols-2 gap-2 text-xs">
						<div>
							• <strong>3-Зонная стратификация:</strong> Пришейка {shadeCervical} / Тело {shadeBody} / Край {shadeIncisal}
						</div>
						<div>
							• <strong>Оптические свойства:</strong> {translucency} {mamelons ? "(Мамелоны)" : ""}{" "}
							{opalescence ? "(Опалесценция)" : ""}{" "}
							{calcifications ? "(Кальцификаты)" : ""}
						</div>
						<div>
							• <strong>Прикус / Окклюзия:</strong> В привычной окклюзии (по силиконовому регистрату / шаблону)
						</div>
						<div>
							• <strong>Анатомия и контакты:</strong> Естественная анатомическая форма, физиологический контакт
						</div>
					</div>

					{/* Fitting and Due Dates */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200 print:border-black text-xs">
						<div>
							<strong>Примерка каркаса:</strong>{" "}
							{frameworkTrialDate
								? new Date(frameworkTrialDate).toLocaleDateString("ru-RU")
								: "По готовности"}
						</div>
						<div>
							<strong>Примерка керамики:</strong>{" "}
							{ceramicTrialDate
								? new Date(ceramicTrialDate).toLocaleDateString("ru-RU")
								: "По готовности"}
						</div>
						<div>
							<strong>Сдача готовой работы:</strong>{" "}
							{dueDate ? new Date(dueDate).toLocaleDateString("ru-RU") : "Не назначена"}{" "}
							<span className="font-semibold text-slate-600 print:text-black">({deliveryTimeSlot})</span>
						</div>
					</div>

					{clinicalNotes && (
						<div className="pt-1.5 text-xs italic text-slate-800 print:text-black">
							<strong>Клинические указания:</strong> {clinicalNotes}
						</div>
					)}
				</div>

				{/* 5-Stage Clinical Tracking Progression (ГОСТ Р 51087-97 / Мандаты 8e, 8s, 8k) */}
				<div
					className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs space-y-2 break-inside-avoid print:break-inside-avoid print:bg-transparent print:border-black"
					data-testid="lab-blank-5stage-tracker"
				>
					<div className="font-bold border-b border-slate-200 pb-1.5 uppercase tracking-wider text-[11px] text-slate-700 flex justify-between items-center print:border-black print:text-black">
						<span>Маршрутный лист и этапы изготовления в лаборатории:</span>
						<span className="font-mono text-[10px] text-slate-500 print:text-black font-semibold">5 ЭТАПОВ ТРЕКИНГА</span>
					</div>
					<div className="grid grid-cols-5 gap-2 pt-1 text-center">
						{CANONICAL_5_CLINICAL_LAB_STATUSES.map((item) => {
							const isCurrent = active5Stage === item.id;
							const isPassed = currentStep >= item.step;
							return (
								<div
									key={item.id}
									className={`p-2 rounded border text-center transition-all ${
										isCurrent
											? "bg-slate-900 text-white border-slate-900 font-bold shadow-xs ring-1 ring-slate-900 print:bg-white print:text-black print:border-black print:font-black"
											: isPassed
											? "bg-slate-100 text-slate-800 border-slate-300 font-semibold print:bg-transparent print:text-black print:border-black"
											: "bg-white text-slate-400 border-slate-200 print:bg-transparent print:text-slate-600 print:border-slate-300"
									}`}
									data-testid={`ztl-blank-stage-${item.id}`}
								>
									<div className="text-[10px] uppercase font-bold tracking-wider">
										Этап {item.step}
									</div>
									<div className="text-xs font-bold mt-0.5 truncate">{item.shortLabelRu}</div>
									<div className="text-[10px] mt-0.5 opacity-80">
										{isCurrent ? "ТЕКУЩИЙ" : isPassed ? "ПРОЙДЕН" : "ОЖИДАНИЕ"}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* 6-Stage Orthopedic Lifecycle & Courier Manifest (Mandates 8e, 8s) */}
				<div
					className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs space-y-2 break-inside-avoid print:break-inside-avoid print:bg-transparent print:border-black"
					data-testid="lab-blank-6stage-lifecycle"
				>
					<div className="font-bold border-b border-slate-200 pb-1.5 uppercase tracking-wider text-[11px] text-slate-700 flex justify-between items-center print:border-black print:text-black">
						<span>Ортопедический жизненный цикл и курьерский трекинг (6 этапов):</span>
						<span className="font-mono text-[10px] text-slate-600 print:text-black font-bold">
							СЛОТ ДОСТАВКИ: {deliveryTimeSlot}
						</span>
					</div>
					<div className="grid grid-cols-6 gap-1.5 pt-1 text-center">
						{CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES.map((item) => {
							const mapped6 = mapTo6StageOrthopedicLifecycle(currentStage || status || "sent");
							const isCurrent = mapped6 === item.id;
							const stepCurrent = CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES.find((s) => s.id === mapped6)?.step ?? 1;
							const isPassed = stepCurrent >= item.step;

							return (
								<div
									key={item.id}
									className={`p-1.5 rounded border text-center text-[10px] transition-all ${
										isCurrent
											? "bg-slate-900 text-white border-slate-900 font-bold print:bg-white print:text-black print:border-black print:font-black"
											: isPassed
											? "bg-slate-100 text-slate-800 border-slate-300 font-semibold print:bg-transparent print:text-black print:border-black"
											: "bg-white text-slate-400 border-slate-200 print:bg-transparent print:text-slate-600 print:border-slate-300"
									}`}
									data-testid={`ztl-blank-6stage-${item.id}`}
								>
									<div className="font-bold uppercase tracking-wider">
										Эт. {item.step}
									</div>
									<div className="font-bold truncate mt-0.5">{item.shortLabelRu}</div>
									<div className="opacity-80 mt-0.5">
										{isCurrent ? "ТЕКУЩИЙ" : isPassed ? "ПРОЙДЕН" : "ОЖИДАНИЕ"}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Disinfection & Authorization Mark */}
				<div className="p-2.5 border border-dashed border-slate-300 print:border-black rounded text-xs flex justify-between items-center text-slate-600 print:text-black flex-wrap gap-2 break-inside-avoid print:break-inside-avoid" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
					<span>
						Оттиски и материалы дезинфицированы в клинике • Срок плана лечения (&gt;30 дн.) не блокирует наряды ЗТЛ • Наряд авторизован лечащим врачом
					</span>
					{totalLabPriceRub != null && totalLabPriceRub > 0 && (
						<span className="font-bold text-slate-900 print:text-black">
							Стоимость наряда: {money(totalLabPriceRub)}
						</span>
					)}
				</div>

				{/* Barcode & QR Code Section */}
				<div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-300 print:border-black break-inside-avoid print:break-inside-avoid" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
					<div className="w-1/2">
						<div className="text-xs uppercase font-bold text-slate-500 print:text-black mb-1">
							Штрихкод наряда
						</div>
						<div
							className="w-48 text-slate-900"
							dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(secureToken) }}
						/>
					</div>

					<div className="flex items-center gap-3 text-right">
						<div>
							<div className="text-xs uppercase font-bold text-slate-600 print:text-black">
								Портал техника (QR)
							</div>
							<div className="text-xs text-slate-500 print:text-black">
								Сканируйте для онлайн-статуса
							</div>
						</div>
						<div
							className="text-slate-900 flex-shrink-0"
							dangerouslySetInnerHTML={{ __html: generateQrCodeSvg(portalUrl) }}
						/>
					</div>
				</div>

				{/* Signatures & Courier Handover Slip */}
				<div className="grid grid-cols-3 gap-6 pt-3 text-xs break-inside-avoid print:break-inside-avoid" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
					<div className="border-t border-slate-400 print:border-black pt-1 space-y-0.5">
						<div className="font-semibold text-slate-700 print:text-black">Врач-ортопед:</div>
						<div className="font-bold">/ {formDoctorName} /</div>
						<div className="text-[10px] text-slate-500 print:text-black">Тел: {doctorPhone || clinicPhone}</div>
					</div>
					<div className="border-t border-slate-400 print:border-black pt-1 text-center space-y-0.5">
						<div className="font-semibold text-slate-700 print:text-black">Курьер ЗТЛ (передача):</div>
						<div className="font-bold">Слот: {deliveryTimeSlot}</div>
						<div className="text-[10px] text-slate-500 print:text-black">Подпись: ___________________</div>
					</div>
					<div className="border-t border-slate-400 print:border-black pt-1 text-right space-y-0.5">
						<div className="font-semibold text-slate-700 print:text-black">Прием лабораторией ЗТЛ:</div>
						<div className="font-bold">Техник: ___________________</div>
						<div className="text-[10px] text-slate-500 print:text-black">Дата/время: ________________</div>
					</div>
				</div>
			</div>
		</div>
	);
}
