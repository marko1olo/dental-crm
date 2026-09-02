/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LAB WORK ORDER CONSTRUCTOR MODAL (ЗТЛ & Ортопедический / Ортодонтический Бланк)
 * Comprehensive Digital CAD/CAM & Analog Laboratory Order Generator
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback, useId } from "react";
import {
	CheckCircle2,
	X,
	Layers,
	Crown,
	Sparkles,
	Palette,
	Anchor,
	UploadCloud,
	FileText,
	Printer,
	Send,
	Clock,
	Check,
	Coins,
	FileCode,
	MessageSquare,
	Eye,
	Trash2,
	Plus,
	ShieldCheck,
	AlertCircle,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	ORTHOPEDIC_WORK_TYPES,
	type OrthopedicWorkTypeId,
	type LabWorkflowStatus,
	type LabStlScanAttachment,
} from "./dentalLabWorkflowEngine";
import "./labWorkOrderConstructor.css";

function formatKopecksToRubles(kopecks: number): string {
	return `${Math.round(kopecks / 100).toLocaleString("ru-RU")} ₽`;
}

const VITA_CLASSICAL_SHADES = [
	"A1", "A2", "A3", "A3.5", "A4",
	"B1", "B2", "B3", "B4",
	"C1", "C2", "C3", "C4",
	"D2", "D3", "D4",
];

const VITA_BLEACH_SHADES = ["BL1", "BL2", "BL3", "BL4", "0M1", "0M2", "0M3"];

const STUMP_SHADES = ["ND1", "ND2", "ND3", "ND4", "ND5", "ND6", "ND7", "ND8", "ND9"];

const IMPLANT_SYSTEMS = [
	"Straumann (BLX / TL)",
	"Nobel Biocare (Active / Conical)",
	"Osstem TS III (SA / CA)",
	"Dentium SuperLine",
	"Astra Tech EV",
	"MegaGen AnyRidge",
	"Ankylos C/X",
	"Medentika",
];

const ABUTMENT_TYPES = [
	"Ti-Base (Титановое основание)",
	"Индивидуальный титановый абатмент",
	"Индивидуальный циркониевый абатмент",
	"Multi-Unit (Мульти-юнит винтовой)",
	"Прямой стандартный абатмент",
	"Угловой абатмент (15° / 25°)",
];

export type LabConstructorTab =
	| "construction"
	| "shades"
	| "abutment"
	| "scans"
	| "timeline"
	| "summary";

export interface LabWorkOrderData {
	orderId: string;
	orderNumberRu: string;
	patientId: string;
	patientName: string;
	doctorId: string;
	doctorName: string;
	labName: string;
	workTypeId: OrthopedicWorkTypeId;
	constructionNameRu: string;
	teethFdi: number[];
	shadeBody: string;
	shadeStump?: string | undefined;
	shadeBleach?: string | undefined;
	shade3dMaster?: string | undefined;
	implantSystem?: string | undefined;
	abutmentType?: string | undefined;
	materialsRu: string;
	scans: LabStlScanAttachment[];
	status: LabWorkflowStatus;
	sentToLabDateIso?: string | undefined;
	fittingDateIso?: string | undefined;
	completionDeadlineIso?: string | undefined;
	labCostKopecks: number;
	patientPriceKopecks: number;
	marginKopecks: number;
	marginPercent: number;
	specialInstructions?: string | undefined;
	createdAtIso: string;
}

export interface LabWorkOrderConstructorModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly initialTeeth?: number[] | undefined;
	readonly onSaveOrder?: ((order: LabWorkOrderData) => void) | undefined;
	readonly onExportPdf?: ((order: LabWorkOrderData) => void) | undefined;
	readonly onSendToChat?: ((order: LabWorkOrderData, textSummary: string) => void) | undefined;
	readonly className?: string | undefined;
}

const DEFAULT_CONSTRUCTIONS: Array<{
	id: OrthopedicWorkTypeId;
	title: string;
	category: string;
	desc: string;
	defaultPriceKop: number;
	defaultCostKop: number;
}> = [
	{
		id: "crown_zirconia",
		title: "Цирконий Multi-Layer (Katana / Prettau)",
		category: "Несъёмное протезирование",
		desc: "Многослойный анатомический диоксид циркония с плавным градиентом прозрачности.",
		defaultPriceKop: 2400000,
		defaultCostKop: 750000,
	},
	{
		id: "crown_emax",
		title: "IPS e.max Press / CAD (дисиликат лития)",
		category: "Эстетическая керамика",
		desc: "Высокоэстетичная цельная керамика с идеальной флюоресценцией для фронтальной группы.",
		defaultPriceKop: 2600000,
		defaultCostKop: 850000,
	},
	{
		id: "metal_ceramic",
		title: "Металлокерамика Co-Cr (Noritake / Duceram)",
		category: "Классическая ортопедия",
		desc: "Фрезерованный кобальт-хромовый каркас с послойным нанесением полевошпатной керамики.",
		defaultPriceKop: 1500000,
		defaultCostKop: 500000,
	},
	{
		id: "custom_abutment",
		title: "All-on-4 / All-on-6 и Индивидуальный абатмент",
		category: "Имплантопротезирование",
		desc: "Фрезерованная титановая балка или индивидуальный Ti-Base абатмент с винтовой фиксацией.",
		defaultPriceKop: 3800000,
		defaultCostKop: 1400000,
	},
	{
		id: "aligners",
		title: "Элайнеры и Ортодонтические каппы / Сплинты",
		category: "Ортодонтия и гнатология",
		desc: "Высокоточные полиуретановые каппы для исправления прикуса или депрограммации ВНЧС.",
		defaultPriceKop: 4500000,
		defaultCostKop: 1800000,
	},
	{
		id: "clasp_prosthesis",
		title: "Бюгельный протез (Bredent / Кламмеры)",
		category: "Съемное протезирование",
		desc: "Литой дуговой каркас с замковыми креплениями микрофиксации повышенной прочности.",
		defaultPriceKop: 3200000,
		defaultCostKop: 1100000,
	},
];

const VITA_3D_MASTER_SHADES = [
	"1M1", "1M2", "2L1.5", "2M1", "2M2", "2M3", "2R1.5", "3L1.5", "3M1", "3M2", "3M3", "4M1", "4M2", "5M1"
];

const TIMELINE_STAGES: Array<{ id: LabWorkflowStatus; labelRu: string; step: number }> = [
	{ id: "draft", labelRu: "1. Черновик", step: 1 },
	{ id: "sent_to_lab", labelRu: "2. Отправлен в ЗТЛ", step: 2 },
	{ id: "fitting_scheduled", labelRu: "3. Примерка", step: 3 },
	{ id: "installed_completed", labelRu: "4. Сдан пациенту", step: 4 },
];

export const LabWorkOrderConstructorModal: React.FC<LabWorkOrderConstructorModalProps> = ({
	isOpen,
	onClose,
	patientName = "Смирнова Екатерина Васильевна",
	patientId = "PAT-2026-0814",
	doctorName = "Др. Ковалев А. В.",
	doctorId = "DOC-04",
	initialTeeth = [11, 21],
	onSaveOrder,
	onExportPdf,
	onSendToChat,
	className = "",
}) => {
	const [activeTab, setActiveTab] = useState<LabConstructorTab>("construction");
	const [selectedWorkType, setSelectedWorkType] = useState<OrthopedicWorkTypeId>("crown_zirconia");
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>(initialTeeth);
	const [selectedShade, setSelectedShade] = useState<string>("A2");
	const [selectedStumpShade, setSelectedStumpShade] = useState<string>("ND2");
	const [selectedBleachShade, setSelectedBleachShade] = useState<string>("");
	const [selected3dMaster, setSelected3dMaster] = useState<string>("");
	const [selectedImplantSystem, setSelectedImplantSystem] = useState<string>("Osstem TS III");
	const [selectedAbutmentType, setSelectedAbutmentType] = useState<string>("Ti-Base (Титановое основание)");
	const [selectedLabName, setSelectedLabName] = useState<string>("CAD/CAM Лаборатория «Дентал-Арт»");
	const [currentStatus, setCurrentStatus] = useState<LabWorkflowStatus>("draft");
	const [specialInstructions, setSpecialInstructions] = useState<string>(
		"Анатомическая форма с выраженными краевыми валиками, микротекстура вестибулярной поверхности, прозрачный режущий край (0.8 мм транслуцентность)."
	);

	const [patientPriceKop, setPatientPriceKop] = useState<number>(4800000);
	const [labCostKop, setLabCostKop] = useState<number>(1500000);

	const [scans, setScans] = useState<LabStlScanAttachment[]>([
		{
			id: "scan-upper-01",
			archType: "upper",
			fileName: "Upper_Jaw_Prep_11_21.stl",
			fileSizeBytes: 24500000,
			uploadDateIso: new Date().toISOString(),
		},
		{
			id: "scan-lower-01",
			archType: "lower",
			fileName: "Lower_Jaw_Antagonist.stl",
			fileSizeBytes: 22100000,
			uploadDateIso: new Date().toISOString(),
		},
		{
			id: "scan-bite-01",
			archType: "bite",
			fileName: "Centric_Bite_Registration.stl",
			fileSizeBytes: 8900000,
			uploadDateIso: new Date().toISOString(),
		},
	]);

	const titleId = useId();

	// Financial Margin Calculation
	const marginKop = Math.max(0, patientPriceKop - labCostKop);
	const marginPercent = patientPriceKop > 0 ? Math.round((marginKop / patientPriceKop) * 100) : 0;

	// Toggle FDI tooth selection
	const handleToggleTooth = useCallback((tNum: number) => {
		setSelectedTeeth((prev) =>
			prev.includes(tNum) ? prev.filter((t) => t !== tNum) : [...prev, tNum].sort((a, b) => a - b)
		);
	}, []);

	// Active Construction Definition
	const activeConstruction = useMemo(() => {
		return (
			DEFAULT_CONSTRUCTIONS.find((c) => c.id === selectedWorkType) ||
			DEFAULT_CONSTRUCTIONS[0]!
		);
	}, [selectedWorkType]);

	// Assembled Order Data
	const assembledOrder: LabWorkOrderData = useMemo(() => {
		const orderNum = `ЗТЛ-${Date.now().toString().slice(-6)}`;
		return {
			orderId: `lab-ord-${Date.now()}`,
			orderNumberRu: orderNum,
			patientId,
			patientName,
			doctorId,
			doctorName,
			labName: selectedLabName,
			workTypeId: selectedWorkType,
			constructionNameRu: activeConstruction.title,
			teethFdi: selectedTeeth,
			shadeBody: selectedShade,
			shadeStump: selectedStumpShade || undefined,
			shadeBleach: selectedBleachShade || undefined,
			shade3dMaster: selected3dMaster || undefined,
			implantSystem: selectedImplantSystem || undefined,
			abutmentType: selectedAbutmentType || undefined,
			materialsRu: activeConstruction.desc,
			scans,
			status: currentStatus,
			labCostKopecks: labCostKop,
			patientPriceKopecks: patientPriceKop,
			marginKopecks: marginKop,
			marginPercent,
			specialInstructions: specialInstructions.trim() || undefined,
			createdAtIso: new Date().toISOString(),
		};
	}, [
		patientId,
		patientName,
		doctorId,
		doctorName,
		selectedLabName,
		selectedWorkType,
		activeConstruction,
		selectedTeeth,
		selectedShade,
		selectedStumpShade,
		selectedBleachShade,
		selected3dMaster,
		selectedImplantSystem,
		selectedAbutmentType,
		scans,
		currentStatus,
		labCostKop,
		patientPriceKop,
		marginKop,
		marginPercent,
		specialInstructions,
	]);

	const handleSave = useCallback(() => {
		if (onSaveOrder) {
			onSaveOrder(assembledOrder);
		}
		showToast(`Заказ-наряд ${assembledOrder.orderNumberRu} сохранен в базу ЗТЛ`, "success");
	}, [assembledOrder, onSaveOrder]);

	const handleExportPdf = useCallback(() => {
		if (onExportPdf) {
			onExportPdf(assembledOrder);
		}
		showToast(`PDF бланк заказ-наряда ${assembledOrder.orderNumberRu} сформирован`, "success");
	}, [assembledOrder, onExportPdf]);

	const handleSendToChat = useCallback(() => {
		const teethStr = selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "Не указаны";
		const textSummary =
			`ЗАКАЗ-НАРЯД ${assembledOrder.orderNumberRu}\n` +
			`Пациент: ${patientName}\n` +
			`Врач: ${doctorName}\n` +
			`Зубы (FDI): ${teethStr}\n` +
			`Конструкция: ${activeConstruction.title}\n` +
			`Цвет: ${selectedShade} (Культя: ${selectedStumpShade || "—"})\n` +
			`Абатмент/Имплант: ${selectedAbutmentType} (${selectedImplantSystem})\n` +
			`3D STL сканы: ${scans.length} файла(ов)\n` +
			`Примечание: ${specialInstructions}`;

		if (onSendToChat) {
			onSendToChat(assembledOrder, textSummary);
		}
		showToast("Сводка заказ-наряда отправлена в чат с зубным техником", "success");
	}, [
		assembledOrder,
		patientName,
		doctorName,
		selectedTeeth,
		activeConstruction,
		selectedShade,
		selectedStumpShade,
		selectedAbutmentType,
		selectedImplantSystem,
		scans,
		specialInstructions,
		onSendToChat,
	]);

	if (!isOpen) return null;

	return (
		<div className="lab-constructor-backdrop" role="dialog" aria-modal="true" aria-labelledby={titleId}>
			<div className={"lab-constructor-modal " + className} data-testid="lab-work-order-constructor-modal">
				{/* Modal Header */}
				<header className="lab-constructor-header">
					<div className="lab-constructor-title-group">
						<div className="lab-constructor-icon-badge">
							<Crown size={24} />
						</div>
						<div>
							<h2 id={titleId} className="lab-constructor-title">
								<span>Конструктор заказ-нарядов ЗТЛ</span>
								<span className="lab-constructor-badge">CAD/CAM & Ортопедия</span>
							</h2>
							<p className="lab-constructor-subtitle">
								Пациент: <span className="font-bold text-slate-800 dark:text-slate-200">{patientName}</span> · Врач: {doctorName} · {selectedLabName}
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="lab-constructor-close-btn"
						aria-label="Закрыть конструктор заказ-нарядов"
						data-testid="lab-constructor-close-btn"
					>
						<X size={20} />
					</button>
				</header>

				{/* Navigation Tabs (Touch-First >= 44px) */}
				<nav className="lab-constructor-nav-bar" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "construction"}
						onClick={() => setActiveTab("construction")}
						className={"lab-constructor-tab-btn " + (activeTab === "construction" ? "active" : "")}
						data-testid="tab-btn-construction"
					>
						<Layers size={16} />
						<span>1. Конструкция & Зубы FDI</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "shades"}
						onClick={() => setActiveTab("shades")}
						className={"lab-constructor-tab-btn " + (activeTab === "shades" ? "active" : "")}
						data-testid="tab-btn-shades"
					>
						<Palette size={16} />
						<span>2. Цвет VITA & Культя</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "abutment"}
						onClick={() => setActiveTab("abutment")}
						className={"lab-constructor-tab-btn " + (activeTab === "abutment" ? "active" : "")}
						data-testid="tab-btn-abutment"
					>
						<Anchor size={16} />
						<span>3. Абатмент & Импланты</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "scans"}
						onClick={() => setActiveTab("scans")}
						className={"lab-constructor-tab-btn " + (activeTab === "scans" ? "active" : "")}
						data-testid="tab-btn-scans"
					>
						<UploadCloud size={16} />
						<span>4. 3D STL Сканы ({scans.length})</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "timeline"}
						onClick={() => setActiveTab("timeline")}
						className={"lab-constructor-tab-btn " + (activeTab === "timeline" ? "active" : "")}
						data-testid="tab-btn-timeline"
					>
						<Clock size={16} />
						<span>5. Таймлайн ЗТЛ</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "summary"}
						onClick={() => setActiveTab("summary")}
						className={"lab-constructor-tab-btn " + (activeTab === "summary" ? "active" : "")}
						data-testid="tab-btn-summary"
					>
						<FileText size={16} />
						<span>6. Сводка & Финансы</span>
					</button>
				</nav>

				{/* Modal Body */}
				<div className="lab-constructor-body">
					{/* TAB 1: Construction & FDI Teeth */}
					{activeTab === "construction" && (
						<div className="flex flex-col gap-5" data-testid="tab-content-construction">
							<div>
								<div className="text-xs font-extrabold uppercase text-slate-500 tracking-wider mb-2">
									Выберите тип ортопедической конструкции:
								</div>
								<div className="lab-constructions-grid">
									{DEFAULT_CONSTRUCTIONS.map((c) => {
										const isSelected = selectedWorkType === c.id;
										return (
											<div
												key={c.id}
												onClick={() => {
													setSelectedWorkType(c.id);
													setPatientPriceKop(c.defaultPriceKop);
													setLabCostKop(c.defaultCostKop);
												}}
												className={"lab-construction-card " + (isSelected ? "selected" : "")}
												data-testid={"construction-card-" + c.id}
											>
												<div className="lab-construction-card-title">
													<span>{c.title}</span>
													{isSelected && <CheckCircle2 size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />}
												</div>
												<div className="lab-construction-card-desc">{c.desc}</div>
												<div className="mt-2 text-[11px] font-bold text-teal-700 dark:text-teal-300 font-mono">
													ЗТЛ: {formatKopecksToRubles(c.defaultCostKop)}
												</div>
											</div>
										);
									})}
								</div>
							</div>

							{/* FDI Teeth Selector */}
							<div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
								<div className="flex items-center justify-between mb-2.5">
									<span className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400">
										Зубы и квадранты (FDI Нотация 11–48):
									</span>
									<span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
										Выбрано: {selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "нет"}
									</span>
								</div>

								{/* Upper Arch (18-28) */}
								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-center gap-1.5 flex-wrap">
										{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((tooth) => {
											const isChecked = selectedTeeth.includes(tooth);
											return (
												<button
													key={tooth}
													type="button"
													onClick={() => handleToggleTooth(tooth)}
													className={
														"min-w-[44px] min-h-[44px] rounded-lg font-bold text-xs cursor-pointer transition-all border " +
														(isChecked
															? "bg-teal-600 text-white border-teal-600 shadow-sm"
															: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-teal-500")
													}
													data-testid={"tooth-btn-" + tooth}
												>
													{tooth}
												</button>
											);
										})}
									</div>

									{/* Lower Arch (48-38) */}
									<div className="flex items-center justify-center gap-1.5 flex-wrap">
										{[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((tooth) => {
											const isChecked = selectedTeeth.includes(tooth);
											return (
												<button
													key={tooth}
													type="button"
													onClick={() => handleToggleTooth(tooth)}
													className={
														"min-w-[44px] min-h-[44px] rounded-lg font-bold text-xs cursor-pointer transition-all border " +
														(isChecked
															? "bg-teal-600 text-white border-teal-600 shadow-sm"
															: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-teal-500")
													}
													data-testid={"tooth-btn-" + tooth}
												>
													{tooth}
												</button>
											);
										})}
									</div>
								</div>
							</div>
						</div>
					)}

					{/* TAB 2: VITA Shades & Stump */}
					{activeTab === "shades" && (
						<div className="flex flex-col gap-5" data-testid="tab-content-shades">
							{/* VITA Classical */}
							<div>
								<div className="text-xs font-extrabold uppercase text-slate-500 tracking-wider mb-2">
									Шкала VITA Classical (A1–D4):
								</div>
								<div className="lab-shade-palette">
									{VITA_CLASSICAL_SHADES.map((s) => {
										const isSel = selectedShade === s;
										return (
											<button
												key={s}
												type="button"
												onClick={() => setSelectedShade(s)}
												className={"lab-shade-chip " + (isSel ? "selected" : "")}
												data-testid={"shade-chip-" + s}
											>
												{s}
											</button>
										);
									})}
								</div>
							</div>

							{/* VITA Bleach */}
							<div>
								<div className="text-xs font-extrabold uppercase text-slate-500 tracking-wider mb-2">
									Bleach Оттенки (Ультра-белые):
								</div>
								<div className="lab-shade-palette">
									{VITA_BLEACH_SHADES.map((b) => {
										const isSel = selectedShade === b;
										return (
											<button
												key={b}
												type="button"
												onClick={() => setSelectedShade(b)}
												className={"lab-shade-chip " + (isSel ? "selected" : "")}
												data-testid={"shade-bleach-" + b}
											>
												{b}
											</button>
										);
									})}
								</div>
							</div>

							{/* Stump Shade (Культя зуба) */}
							<div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
								<div className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400 mb-2">
									Цвет культи зуба (Шкала Natural Die ND1–ND9 для безметалловой керамики):
								</div>
								<div className="lab-shade-palette">
									{STUMP_SHADES.map((st) => {
										const isSel = selectedStumpShade === st;
										return (
											<button
												key={st}
												type="button"
												onClick={() => setSelectedStumpShade(st)}
												className={"lab-shade-chip " + (isSel ? "selected" : "")}
												data-testid={"stump-shade-" + st}
											>
												{st}
											</button>
										);
									})}
								</div>
							</div>

							{/* 3D Master */}
							<div>
								<div className="text-xs font-extrabold uppercase text-slate-500 tracking-wider mb-2">
									VITA 3D-Master (Опционально):
								</div>
								<div className="lab-shade-palette">
									{VITA_3D_MASTER_SHADES.map((m) => {
										const isSel = selected3dMaster === m;
										return (
											<button
												key={m}
												type="button"
												onClick={() => setSelected3dMaster(isSel ? "" : m)}
												className={"lab-shade-chip " + (isSel ? "selected" : "")}
											>
												{m}
											</button>
										);
									})}
								</div>
							</div>
						</div>
					)}

					{/* TAB 3: Abutment & Implant Systems */}
					{activeTab === "abutment" && (
						<div className="flex flex-col gap-5" data-testid="tab-content-abutment">
							{/* Implant System Selection */}
							<div>
								<div className="text-xs font-extrabold uppercase text-slate-500 tracking-wider mb-2">
									Имплантационная система:
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
									{IMPLANT_SYSTEMS.map((imp) => {
										const isSel = selectedImplantSystem === imp;
										return (
											<button
												key={imp}
												type="button"
												onClick={() => setSelectedImplantSystem(imp)}
												className={
													"min-h-[48px] px-3.5 py-2.5 rounded-xl text-xs font-bold text-left border cursor-pointer transition-all " +
													(isSel
														? "bg-teal-600 text-white border-teal-600 shadow-sm"
														: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-teal-500")
												}
												data-testid={"implant-btn-" + imp.replace(/\s+/g, "_")}
											>
												{imp}
											</button>
										);
									})}
								</div>
							</div>

							{/* Abutment Type Selection */}
							<div>
								<div className="text-xs font-extrabold uppercase text-slate-500 tracking-wider mb-2">
									Тип абатмента и платформы:
								</div>
								<div className="lab-abutment-grid">
									{ABUTMENT_TYPES.map((ab) => {
										const isSel = selectedAbutmentType === ab;
										return (
											<div
												key={ab}
												onClick={() => setSelectedAbutmentType(ab)}
												className={"lab-abutment-card " + (isSel ? "selected" : "")}
												data-testid={"abutment-card-" + ab.slice(0, 10)}
											>
												<div className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{ab}</div>
												<div className="text-[11px] text-slate-500 mt-1">Оригинальный интерфейс / CAD-CAM</div>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					)}

					{/* TAB 4: 3D STL Scans */}
					{activeTab === "scans" && (
						<div className="flex flex-col gap-4" data-testid="tab-content-scans">
							<div className="flex items-center justify-between">
								<div className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
									3D Цифровые сканы челюстей (STL / PLY):
								</div>
								<span className="text-xs font-bold text-teal-600 dark:text-teal-400">
									Всего файлов: {scans.length} ({(scans.reduce((s, f) => s + (f.fileSizeBytes ?? 0), 0) / 1024 / 1024).toFixed(1)} МБ)
								</span>
							</div>

							<div className="lab-scan-attachment-area">
								{scans.map((scan) => (
									<div key={scan.id} className="lab-scan-slot attached" data-testid={"scan-slot-" + (scan.archType || scan.type || "scan")}>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<FileCode size={18} className="text-teal-600 dark:text-teal-400 shrink-0" />
												<div>
													<div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
														{scan.fileName}
													</div>
													<div className="text-[10px] text-slate-500 font-mono">
														{(((scan.fileSizeBytes ?? 0)) / 1024 / 1024).toFixed(1)} МБ · {scan.archType || scan.type || "scan"}
													</div>
												</div>
											</div>
											<span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300">
												STL 3D
											</span>
										</div>
									</div>
								))}
							</div>

							{/* Special Instructions for Lab */}
							<div className="flex flex-col gap-1.5 mt-2">
								<label htmlFor="lab-instructions" className="text-xs font-bold text-slate-700 dark:text-slate-300">
									Клинические указания зубному технику (окклюзия, контактные пункты, гирлянда):
								</label>
								<textarea
									id="lab-instructions"
									rows={3}
									value={specialInstructions}
									onChange={(e) => setSpecialInstructions(e.target.value)}
									className="p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-teal-500 resize-none font-medium"
									data-testid="lab-special-instructions-input"
								/>
							</div>
						</div>
					)}

					{/* TAB 5: Timeline & Stages */}
					{activeTab === "timeline" && (
						<div className="flex flex-col gap-5" data-testid="tab-content-timeline">
							<div className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">
								Статус прохождения заказ-наряда в ЗТЛ:
							</div>

							<div className="lab-status-timeline" role="list">
								{TIMELINE_STAGES.map((st) => {
									const isCurrent = currentStatus === st.id;
									return (
										<div
											key={st.id}
											onClick={() => setCurrentStatus(st.id)}
											className={"lab-timeline-step " + (isCurrent ? "active" : "")}
											role="listitem"
											data-testid={"timeline-stage-" + st.id}
										>
											<div className="lab-timeline-dot">
												{isCurrent ? <Check size={18} strokeWidth={3} /> : st.step}
											</div>
											<span className="lab-timeline-label">{st.labelRu}</span>
										</div>
									);
								})}
							</div>

							<div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
								<div className="font-extrabold text-slate-800 dark:text-slate-200 mb-1">
									Текущий статус: {TIMELINE_STAGES.find((s) => s.id === currentStatus)?.labelRu}
								</div>
								<div className="text-slate-500 leading-relaxed">
									Сроки изготовления: стандартный срок 5 рабочих дней. При отправке формируется штрихкод партии и электронный наряд.
								</div>
							</div>
						</div>
					)}

					{/* TAB 6: Summary & Financials */}
					{activeTab === "summary" && (
						<div className="flex flex-col gap-5" data-testid="tab-content-summary">
							{/* Financial P&L Card */}
							<div className="lab-financial-card" data-testid="lab-financial-stats-card">
								<div className="lab-financial-stat">
									<span className="lab-financial-stat-label">Стоимость для пациента:</span>
									<span className="lab-financial-stat-val text-slate-900 dark:text-slate-100">
										{formatKopecksToRubles(patientPriceKop)}
									</span>
								</div>
								<div className="lab-financial-stat">
									<span className="lab-financial-stat-label">Себестоимость ЗТЛ:</span>
									<span className="lab-financial-stat-val text-amber-600 dark:text-amber-400">
										{formatKopecksToRubles(labCostKop)}
									</span>
								</div>
								<div className="lab-financial-stat">
									<span className="lab-financial-stat-label">Маржа клиники:</span>
									<span className="lab-financial-stat-val text-emerald-600 dark:text-emerald-400">
										{formatKopecksToRubles(marginKop)} ({marginPercent}%)
									</span>
								</div>
							</div>

							{/* Summary Breakdown Grid */}
							<div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex flex-col gap-2">
								<div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
									<span className="text-slate-500 font-bold">Конструкция:</span>
									<span className="font-extrabold text-slate-900 dark:text-slate-100">{activeConstruction.title}</span>
								</div>
								<div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
									<span className="text-slate-500 font-bold">Зубы (FDI):</span>
									<span className="font-mono font-bold text-slate-900 dark:text-slate-100">
										{selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "—"}
									</span>
								</div>
								<div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
									<span className="text-slate-500 font-bold">Цвет VITA / Культя:</span>
									<span className="font-bold text-teal-600 dark:text-teal-400">
										{selectedShade} {selectedStumpShade ? `(Культя: ${selectedStumpShade})` : ""}
									</span>
								</div>
								<div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
									<span className="text-slate-500 font-bold">Абатмент / Имплант:</span>
									<span className="font-bold text-slate-900 dark:text-slate-100">
										{selectedAbutmentType} · {selectedImplantSystem}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-slate-500 font-bold">Лаборатория:</span>
									<span className="font-bold text-slate-900 dark:text-slate-100">{selectedLabName}</span>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Modal Footer (Touch-First >= 48px) */}
				<footer className="lab-constructor-footer">
					<div className="text-xs text-slate-500 dark:text-slate-400">
						<span>{activeConstruction.title} · </span>
						<span className="font-bold text-teal-600 dark:text-teal-400">
							Цвет {selectedShade}
						</span>
					</div>

					<div className="lab-footer-btn-group">
						<button
							type="button"
							onClick={handleExportPdf}
							className="lab-action-btn lab-action-btn-secondary"
							data-testid="lab-export-pdf-btn"
						>
							<Printer size={16} />
							<span>Печать PDF бланка</span>
						</button>

						<button
							type="button"
							onClick={handleSendToChat}
							className="lab-action-btn lab-action-btn-secondary"
							data-testid="lab-send-chat-btn"
						>
							<MessageSquare size={16} />
							<span>Отправить в чат ЗТЛ</span>
						</button>

						<button
							type="button"
							onClick={handleSave}
							className="lab-action-btn lab-action-btn-primary"
							data-testid="lab-save-order-btn"
						>
							<CheckCircle2 size={18} />
							<span>Сохранить заказ-наряд</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default LabWorkOrderConstructorModal;
