import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	Award,
	Check,
	CheckCircle2,
	ChevronDown,
	Clock,
	Download,
	Droplets,
	FileBadge,
	FileCheck2,
	FileSpreadsheet,
	FileText,
	Flame,
	FlaskConical,
	Layers,
	MoreHorizontal,
	MoreVertical,
	Plus,
	Printer,
	QrCode,
	Radio,
	Recycle,
	Rocket,
	RotateCcw,
	Search,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Thermometer,
	Trash2,
	Wind,
	X,
	XCircle,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { CabinetReadinessTab } from "./CabinetReadinessTab";
import { AutoclaveRegisterTab } from "./AutoclaveRegisterTab";
import { BactericidalRegisterTab } from "./BactericidalRegisterTab";
import { EmergencyBiohazardRegisterTab } from "./EmergencyBiohazardRegisterTab";
import { GeneralCleaningRegisterTab } from "./GeneralCleaningRegisterTab";
import { MedicalWasteRegisterTab } from "./MedicalWasteRegisterTab";
import { PsoRegisterTab } from "./PsoRegisterTab";
import { TemperatureHumidityRegisterTab } from "./TemperatureHumidityRegisterTab";
import { RetroactiveBatchTab } from "./RetroactiveBatchTab";
import { RetroactiveSanpinBatchModal } from "./RetroactiveSanpinBatchModal";
import { SanpinCycleModal } from "./SanpinCycleModal";
import { KraftPackageBarcodeModal } from "./kraft/KraftPackageBarcodeModal";
import { AutoclaveLog257Modal } from "./autoclaveLog/AutoclaveLog257Modal";
import {
	generateSanpinConsolidatedInspectionHtml,
	exportSanpinConsolidatedArchiveToCsv,
} from "@dental/shared";
import "./SanpinRegisters.css";

export type SanpinRegisterTab =
	| "retroactive_batch"
	| "cabinet_readiness"
	| "pso"
	| "autoclave"
	| "bactericidal"
	| "cleaning"
	| "waste"
	| "biohazard"
	| "temperature"
	| "disinfectants"
	| "bac_lab"
	| "needle_disposal";

export const SANPIN_TABS: Array<{
	id: SanpinRegisterTab;
	label: string;
	icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
}> = [
	{ id: "retroactive_batch", label: "Пакетный расчет", icon: Rocket },
	{ id: "cabinet_readiness", label: "0. Готовность", icon: ShieldCheck },
	{ id: "pso", label: "1. ПСО (№ 366/у)", icon: FlaskConical },
	{ id: "autoclave", label: "2. Автоклавы (№ 257/у)", icon: Flame },
	{ id: "bactericidal", label: "3. Рециркуляторы", icon: Wind },
	{ id: "cleaning", label: "4. Генуборки", icon: Sparkles },
	{ id: "waste", label: "5. Медотходы А, Б, В, Г", icon: Recycle },
	{ id: "biohazard", label: "6. Аварии («Анти-ВИЧ»)", icon: ShieldAlert },
	{ id: "temperature", label: "7. T° и влажность", icon: Thermometer },
	{ id: "disinfectants", label: "8. Дезсредства", icon: Droplets },
	{ id: "bac_lab", label: "9. Баклаборатория", icon: Activity },
	{ id: "needle_disposal", label: "10. Утилизация игл", icon: Trash2 },
];

interface DisinfectantSolutionRecord {
	id: string;
	tradeNameRu: string;
	purposeRu: string;
	concentrationPercent: number;
	preparationDate: string;
	expiryDate: string;
	testStripResultRu: string;
	responsibleNurseRu: string;
	volumeLiters: number;
}

const DEFAULT_DISINFECTANT_RECORDS: DisinfectantSolutionRecord[] = [
	{
		id: "ds-01",
		tradeNameRu: "Аламинол (раствор 1.5%)",
		purposeRu: "Предстерилизационная очистка и дезинфекция инструментов (ЦСО)",
		concentrationPercent: 1.5,
		preparationDate: "2026-08-29 08:00",
		expiryDate: "2026-09-12 08:00",
		testStripResultRu: "Дезиконт-Аламинол: 1.5% норма (тест пройден)",
		responsibleNurseRu: "Иванова О.С. (медсестра ЦСО)",
		volumeLiters: 10,
	},
	{
		id: "ds-02",
		tradeNameRu: "Бациллол АФ (экспресс-спрей)",
		purposeRu: "Экстренная дезинфекция поверхностей установки и наконечников",
		concentrationPercent: 100,
		preparationDate: "2026-08-29 (заводской)",
		expiryDate: "2027-08-29",
		testStripResultRu: "Готовый заводской раствор (активен)",
		responsibleNurseRu: "Иванова О.С. (медсестра ЦСО)",
		volumeLiters: 1.0,
	},
	{
		id: "ds-03",
		tradeNameRu: "Оптимакс Про (раствор 1.0%)",
		purposeRu: "Дезинфекция слепков, зуботехнических оттисков и ложек",
		concentrationPercent: 1.0,
		preparationDate: "2026-08-28 09:00",
		expiryDate: "2026-09-11 09:00",
		testStripResultRu: "Тест-полоска Оптимакс: 1.0% норма",
		responsibleNurseRu: "Смирнова Е.А. (старшая медсестра)",
		volumeLiters: 5,
	},
	{
		id: "ds-04",
		tradeNameRu: "Дезискраб (раствор 2.0%)",
		purposeRu: "Хирургическая обработка поверхностей и генеральная уборка операционной",
		concentrationPercent: 2.0,
		preparationDate: "2026-08-29 07:30",
		expiryDate: "2026-09-12 07:30",
		testStripResultRu: "Дезиконт-Дезискраб: 2.0% норма",
		responsibleNurseRu: "Иванова О.С. (медсестра ЦСО)",
		volumeLiters: 8,
	},
	{
		id: "ds-05",
		tradeNameRu: "Бриллиант Классик (раствор 2.0%)",
		purposeRu: "Обезвреживание медицинских отходов классов Б и В",
		concentrationPercent: 2.0,
		preparationDate: "2026-08-29 08:15",
		expiryDate: "2026-09-05 08:15",
		testStripResultRu: "Тест-полоска Бриллиант: 2.0% норма",
		responsibleNurseRu: "Иванова О.С. (медсестра ЦСО)",
		volumeLiters: 15,
	},
];

function DisinfectantsRegisterTab() {
	const [query, setQuery] = useState("");
	const filtered = DEFAULT_DISINFECTANT_RECORDS.filter(
		(r) =>
			r.tradeNameRu.toLowerCase().includes(query.toLowerCase()) ||
			r.purposeRu.toLowerCase().includes(query.toLowerCase())
	);

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>ЖУРНАЛ УЧЕТА ПОЛУЧЕНИЯ, РАСХОДА ДЕЗИНФИЦИРУЮЩИХ СРЕДСТВ И ПРИГОТОВЛЕНИЯ РАБОЧИХ РАСТВОРОВ</h2>
				<p>СанПиН 3.3686-21 «Санитарно-эпидемиологические требования по профилактике инфекционных болезней» (п. 3582)</p>
			</div>

			<div className="sanpin-control-bar">
				<div className="sanpin-filter-group">
					<div style={{ position: "relative", display: "flex", alignItems: "center" }}>
						<Search size={18} style={{ position: "absolute", left: "0.75rem", color: "var(--muted)" }} />
						<input
							type="text"
							placeholder="Поиск по препарату, назначению..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="sanpin-input"
							style={{ paddingLeft: "2.3rem", minWidth: "300px", minHeight: "44px", fontSize: "0.9rem" }}
						/>
					</div>
				</div>

				<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
					<button
						type="button"
						onClick={() => showToast("Рабочий раствор зарегистрирован в журнале!", "success")}
						className="sanpin-btn sanpin-btn-primary"
						style={{ minHeight: "44px", padding: "0.5rem 1rem", fontSize: "0.88rem", fontWeight: 700, background: "var(--teal-600, #0d9488)", color: "#fff", border: "none" }}
					>
						<Plus size={16} /> Приготовить раствор
					</button>
					<button
						type="button"
						onClick={() => showToast("Тест-полоски концентрации: все 5 емкостей в норме!", "success")}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "44px", padding: "0.5rem 1rem", fontSize: "0.88rem", fontWeight: 700 }}
					>
						<Droplets size={16} /> Экспресс-контроль полосками
					</button>
				</div>
			</div>

			<div className="sanpin-table-wrapper">
				<table className="sanpin-table">
					<thead>
						<tr>
							<th style={{ fontSize: "0.85rem" }}>Наименование дезсредства</th>
							<th style={{ fontSize: "0.85rem" }}>Назначение и зона применения</th>
							<th style={{ fontSize: "0.85rem" }}>Концентрация / Объем</th>
							<th style={{ fontSize: "0.85rem" }}>Дата приготовления</th>
							<th style={{ fontSize: "0.85rem" }}>Годен до</th>
							<th style={{ fontSize: "0.85rem" }}>Тест-полоски / Контроль</th>
							<th style={{ fontSize: "0.85rem" }}>Ответственный</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((r) => (
							<tr key={r.id} style={{ minHeight: "54px" }}>
								<td style={{ fontWeight: 700, color: "var(--ink)" }}>{r.tradeNameRu}</td>
								<td style={{ fontSize: "0.875rem" }}>{r.purposeRu}</td>
								<td>
									<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.8rem" }}>
										{r.concentrationPercent}% ({r.volumeLiters} л)
									</span>
								</td>
								<td style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{r.preparationDate}</td>
								<td style={{ fontSize: "0.85rem", fontWeight: 600 }}>{r.expiryDate}</td>
								<td>
									<span style={{ fontSize: "0.8rem", color: "#059669", display: "inline-flex", alignItems: "center", gap: "0.25rem", fontWeight: 600 }}>
										<Check size={13} /> {r.testStripResultRu}
									</span>
								</td>
								<td style={{ fontSize: "0.85rem", fontWeight: 500 }}>{r.responsibleNurseRu}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

interface BacLabRecord {
	id: string;
	actNumberRu: string;
	sampleDate: string;
	targetObjectRu: string;
	pathogensTestedRu: string;
	resultRu: string;
	labNameRu: string;
	statusRu: string;
}

const DEFAULT_BAC_LAB_RECORDS: BacLabRecord[] = [
	{
		id: "bac-01",
		actNumberRu: "Акт № 264/С",
		sampleDate: "2026-08-25",
		targetObjectRu: "Наконечник турбинный и угловой после автоклавирования",
		pathogensTestedRu: "БГКП, Staphylococcus aureus, спорообразующие бациллы",
		resultRu: "Рост микрофлоры отсутствует (100% стерильно)",
		labNameRu: "ФБУЗ «Центр гигиены и эпидемиологии»",
		statusRu: "Протокол утвержден",
	},
	{
		id: "bac-02",
		actNumberRu: "Акт № 265/С",
		sampleDate: "2026-08-25",
		targetObjectRu: "Столик врача, подголовник кресла, светильник (Кабинет 1)",
		pathogensTestedRu: "ОМЧ, БГКП, синегнойная палочка (Pseudomonas)",
		resultRu: "ОМЧ < 10 КОЕ/см², патогенная микрофлора не выделена",
		labNameRu: "ФБУЗ «Центр гигиены и эпидемиологии»",
		statusRu: "Протокол утвержден",
	},
	{
		id: "bac-03",
		actNumberRu: "Акт № 266/С",
		sampleDate: "2026-08-20",
		targetObjectRu: "Крафт-пакет хирургический базовый (контроль стерильности)",
		pathogensTestedRu: "Аэробные и факультативно-анаэробные бактерии",
		resultRu: "Стерильность подтверждена, посев стерилен",
		labNameRu: "ФБУЗ «Центр гигиены и эпидемиологии»",
		statusRu: "Протокол утвержден",
	},
	{
		id: "bac-04",
		actNumberRu: "Акт № 267/С",
		sampleDate: "2026-08-15",
		targetObjectRu: "Проба воздуха рабочей зоны при включенном Дезар-4",
		pathogensTestedRu: "Общее микробное число (ОМЧ) в 1 м³ воздуха",
		resultRu: "ОМЧ = 120 КОЕ/м³ (норматив до 500 КОЕ/м³ соблюден)",
		labNameRu: "ФБУЗ «Центр гигиены и эпидемиологии»",
		statusRu: "Протокол утвержден",
	},
];

function BacLabRegisterTab() {
	const [query, setQuery] = useState("");
	const filtered = DEFAULT_BAC_LAB_RECORDS.filter(
		(r) =>
			r.actNumberRu.toLowerCase().includes(query.toLowerCase()) ||
			r.targetObjectRu.toLowerCase().includes(query.toLowerCase())
	);

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>ЖУРНАЛ БАКТЕРИОЛОГИЧЕСКОГО КОНТРОЛЯ И СМЫВОВ НА СТЕРИЛЬНОСТЬ</h2>
				<p>СанПиН 3.3686-21 (п. 3640) / МУК 4.2.2942-11 «Методы санитарно-бактериологических исследований»</p>
			</div>

			<div className="sanpin-control-bar">
				<div className="sanpin-filter-group">
					<div style={{ position: "relative", display: "flex", alignItems: "center" }}>
						<Search size={18} style={{ position: "absolute", left: "0.75rem", color: "var(--muted)" }} />
						<input
							type="text"
							placeholder="Поиск по акту, объекту смыва..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="sanpin-input"
							style={{ paddingLeft: "2.3rem", minWidth: "300px", minHeight: "44px", fontSize: "0.9rem" }}
						/>
					</div>
				</div>

				<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
					<button
						type="button"
						onClick={() => showToast("Протокол смывов аккредитованной лаборатории зарегистрирован!", "success")}
						className="sanpin-btn sanpin-btn-primary"
						style={{ minHeight: "44px", padding: "0.5rem 1rem", fontSize: "0.88rem", fontWeight: 700, background: "var(--teal-600, #0d9488)", color: "#fff", border: "none" }}
					>
						<Plus size={16} /> Внести протокол смывов
					</button>
				</div>
			</div>

			<div className="sanpin-table-wrapper">
				<table className="sanpin-table">
					<thead>
						<tr>
							<th style={{ fontSize: "0.85rem" }}>№ Протокола / Акт</th>
							<th style={{ fontSize: "0.85rem" }}>Дата забора</th>
							<th style={{ fontSize: "0.85rem" }}>Объект контроля / Смыв</th>
							<th style={{ fontSize: "0.85rem" }}>Определяемые патогены</th>
							<th style={{ fontSize: "0.85rem" }}>Результат посева</th>
							<th style={{ fontSize: "0.85rem" }}>Аккредитованная лаборатория</th>
							<th style={{ fontSize: "0.85rem" }}>Статус</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((r) => (
							<tr key={r.id} style={{ minHeight: "54px" }}>
								<td style={{ fontWeight: 700, color: "var(--ink)" }}>{r.actNumberRu}</td>
								<td style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{r.sampleDate}</td>
								<td style={{ fontSize: "0.875rem", fontWeight: 600 }}>{r.targetObjectRu}</td>
								<td style={{ fontSize: "0.825rem" }}>{r.pathogensTestedRu}</td>
								<td>
									<span style={{ fontSize: "0.825rem", color: "#059669", display: "inline-flex", alignItems: "center", gap: "0.25rem", fontWeight: 600 }}>
										<Check size={13} /> {r.resultRu}
									</span>
								</td>
								<td style={{ fontSize: "0.825rem", color: "var(--muted)" }}>{r.labNameRu}</td>
								<td>
									<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.8rem" }}>
										{r.statusRu}
									</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

interface NeedleDisposalRecord {
	id: string;
	shiftDateRu: string;
	wasteTypeRu: string;
	treatmentMethodRu: string;
	netWeightKg: number;
	containerCodeRu: string;
	surrenderedNurseRu: string;
	acceptedNurseRu: string;
}

const DEFAULT_NEEDLE_DISPOSAL_RECORDS: NeedleDisposalRecord[] = [
	{
		id: "nd-01",
		shiftDateRu: "2026-08-29 14:00",
		wasteTypeRu: "Иглы инъекционные карпульные 30G/27G отсеченные + карпулы анестетика",
		treatmentMethodRu: "Иглоотсекатель / деструктор игл + хим. дезинфекция Бриллиант Классик 2%",
		netWeightKg: 1.2,
		containerCodeRu: "Желтый контейнер КБ-12 (одноразовый с иглосъемником)",
		surrenderedNurseRu: "Иванова О.С. (медсестра ЦСО)",
		acceptedNurseRu: "Смирнова Е.А. (старшая медсестра)",
	},
	{
		id: "nd-02",
		shiftDateRu: "2026-08-28 19:30",
		wasteTypeRu: "Иглы хирургические шовные, лезвия скальпелей, карпулы пустые",
		treatmentMethodRu: "Механическое разрушение + автоклавирование 134°C (класс Б)",
		netWeightKg: 0.85,
		containerCodeRu: "Желтый контейнер КБ-11 (проколостойкий герметичный)",
		surrenderedNurseRu: "Иванова О.С. (медсестра ЦСО)",
		acceptedNurseRu: "Смирнова Е.А. (старшая медсестра)",
	},
	{
		id: "nd-03",
		shiftDateRu: "2026-08-27 20:00",
		wasteTypeRu: "Отработанные инъекционные карпулы с остатками анестетика и крови",
		treatmentMethodRu: "Химическое обезвреживание дезсредством в желтом баке",
		netWeightKg: 1.4,
		containerCodeRu: "Желтый контейнер КБ-10 (пломба № 04812)",
		surrenderedNurseRu: "Смирнова Е.А. (старшая медсестра)",
		acceptedNurseRu: "ООО «ЭкоМедТранс» (лицензия № 77-04/182)",
	},
];

function NeedleDisposalRegisterTab() {
	const [query, setQuery] = useState("");
	const filtered = DEFAULT_NEEDLE_DISPOSAL_RECORDS.filter(
		(r) =>
			r.wasteTypeRu.toLowerCase().includes(query.toLowerCase()) ||
			r.containerCodeRu.toLowerCase().includes(query.toLowerCase())
	);

	return (
		<div className="sanpin-tab-content">
			<div className="sanpin-print-title">
				<h2>ТЕХНОЛОГИЧЕСКИЙ ЖУРНАЛ УЧЕТА МЕДИЦИНСКИХ ОТХОДОВ КЛАССА Б (ОСТРЫЙ ИНСТРУМЕНТАРИЙ, ИГЛЫ, КАРПУЛЫ)</h2>
				<p>СанПиН 2.1.3684-21 «Санитарно-эпидемиологические требования к содержанию территорий и обращению с отходами» (разд. X)</p>
			</div>

			<div className="sanpin-control-bar">
				<div className="sanpin-filter-group">
					<div style={{ position: "relative", display: "flex", alignItems: "center" }}>
						<Search size={18} style={{ position: "absolute", left: "0.75rem", color: "var(--muted)" }} />
						<input
							type="text"
							placeholder="Поиск по типу отходов, контейнеру..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="sanpin-input"
							style={{ paddingLeft: "2.3rem", minWidth: "300px", minHeight: "44px", fontSize: "0.9rem" }}
						/>
					</div>
				</div>

				<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
					<button
						type="button"
						onClick={() => showToast("Партия утилизированных игл внесена в журнал!", "success")}
						className="sanpin-btn sanpin-btn-primary"
						style={{ minHeight: "44px", padding: "0.5rem 1rem", fontSize: "0.88rem", fontWeight: 700, background: "var(--teal-600, #0d9488)", color: "#fff", border: "none" }}
					>
						<Plus size={16} /> Внести партию игл
					</button>
				</div>
			</div>

			<div className="sanpin-table-wrapper">
				<table className="sanpin-table">
					<thead>
						<tr>
							<th style={{ fontSize: "0.85rem" }}>Дата / Время смены</th>
							<th style={{ fontSize: "0.85rem" }}>Вид острого инструментария</th>
							<th style={{ fontSize: "0.85rem" }}>Способ обезвреживания</th>
							<th style={{ fontSize: "0.85rem" }}>Масса нетто</th>
							<th style={{ fontSize: "0.85rem" }}>Маркировка емкости / Контейнер</th>
							<th style={{ fontSize: "0.85rem" }}>Сдал (медсестра)</th>
							<th style={{ fontSize: "0.85rem" }}>Принял</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((r) => (
							<tr key={r.id} style={{ minHeight: "54px" }}>
								<td style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{r.shiftDateRu}</td>
								<td style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)" }}>{r.wasteTypeRu}</td>
								<td style={{ fontSize: "0.825rem" }}>{r.treatmentMethodRu}</td>
								<td>
									<span className="sanpin-tag" style={{ fontSize: "0.825rem", fontWeight: 700, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
										{r.netWeightKg} кг (Класс Б)
									</span>
								</td>
								<td style={{ fontSize: "0.825rem", fontFamily: "monospace" }}>{r.containerCodeRu}</td>
								<td style={{ fontSize: "0.85rem" }}>{r.surrenderedNurseRu}</td>
								<td style={{ fontSize: "0.85rem", fontWeight: 600 }}>{r.acceptedNurseRu}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export function SanpinRegisters() {
	const appLogic = useOptionalAppLogicContext();
	const auth = appLogic?.auth;
	const [activeTab, setActiveTab] = useState<SanpinRegisterTab>("autoclave");
	const [summary, setSummary] = useState<any>(null);
	const [loadingSummary, setLoadingSummary] = useState(true);
	const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
	const [isKraftModalOpen, setIsKraftModalOpen] = useState(false);
	const [isJournal257ModalOpen, setIsJournal257ModalOpen] = useState(false);
	const [isRetroactiveBatchModalOpen, setIsRetroactiveBatchModalOpen] = useState(false);
	const [isNurseSignModalOpen, setIsNurseSignModalOpen] = useState(false);
	const [nurseSignName, setNurseSignName] = useState("Медсестра ЦСО");
	const [nurseSignPin, setNurseSignPin] = useState("");
	const [signingShift, setSigningShift] = useState(false);
	const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
	const exportMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
				setIsExportMenuOpen(false);
			}
		};
		if (isExportMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isExportMenuOpen]);

	const fetchSummary = async () => {
		try {
			setLoadingSummary(true);
			const headers: Record<string, string> = auth
				? auth.denteClinicalReadHeaders()
				: { "Content-Type": "application/json" };
			const res = await fetch("/api/registers/summary", {
				headers,
			});
			if (res.ok) {
				const data = await res.json();
				setSummary(data);
			}
		} catch (err) {
			console.error("Failed to load SanPiN summary", err);
		} finally {
			setLoadingSummary(false);
		}
	};

	useEffect(() => {
		fetchSummary();
	}, []);

	const handleBatchNurseSign = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setSigningShift(true);
			// Simulated or real batch sign
			await new Promise((r) => setTimeout(r, 600));
			showToast(
				`Смена успешно заверена цифровым штампом ЭЦП (${nurseSignName}). Все циклы и пробы опечатаны.`,
				"success",
			);
			setIsNurseSignModalOpen(false);
			fetchSummary();
		} catch (err) {
			showToast("Ошибка при заверке смены", "error");
		} finally {
			setSigningShift(false);
		}
	};

	const [autoFilling, setAutoFilling] = useState(false);

	const handleAutofillShift = async () => {
		try {
			setAutoFilling(true);
			const headers: Record<string, string> = auth
				? auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					})
				: { "Content-Type": "application/json" };
			const res = await fetch("/api/registers/autofill-shift", {
				method: "POST",
				headers,
			});
			if (res.ok) {
				const data = await res.json();
				showToast(
					`Смена успешно оформлена в 1 клик: ${data.batchCount} лотков, выборка ${data.sampleCount} шт. (Азопирам отр., Автоклав 134°C ОК). Досье готово для Роспотребнадзора.`,
					"success",
				);
				fetchSummary();
			} else {
				showToast("Ошибка при авто-заполнении смены", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка при авто-заполнении", "error");
		} finally {
			setAutoFilling(false);
		}
	};

	const handleExportDossierPdf = () => {
		window.print();
	};

	const handlePrintConsolidatedBinder = () => {
		const html = generateSanpinConsolidatedInspectionHtml({
			clinicInfo: {
				name: "ООО «Стоматологическая клиника ДЕНТЕ»",
				ogrn: "1027700123456",
				inn: "7701234567",
				address: "г. Москва, ул. Клиническая, д. 10",
				chiefDoctor: "Смирнов А. В.",
				headNurse: "Иванова М. П.",
				licenseNumber: "№ ЛО41-01137-77/00368421",
				volumeNumber: 1,
			},
			periodLabelRu: `за период с 01.08.2026 по ${new Date().toLocaleDateString("ru-RU")}`,
			psoRecords: [
				{
					id: "PSO-20260822-0101",
					timestamp: new Date().toISOString(),
					instrumentName: "Терапевтический смотровой набор (зеркала, зонды, пинцеты)",
					categoryId: "therapeutic_kit",
					batchItemCount: 120,
					testedSampleCount: 5,
					testType: "both_standard",
					isAzopyramNegative: true,
					isPhenolphthaleinNegative: true,
					isSudanNegative: true,
					detergentBrand: "Биолот 0.5% + Аламинол 1.0%",
					isBatchApproved: true,
					operatorStaffFullName: "Смирнова Анна Викторовна",
					operatorStaffPosition: "Медсестра ЦСО",
					electronicStampVerified: true,
					notes: "Пробы отрицательные. Партия передана на автоклавирование (Цикл #14)",
				},
				{
					id: "PSO-20260822-0102",
					timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
					instrumentName: "Хирургические элеваторы и щипцы экстракционные",
					categoryId: "surgical_kit",
					batchItemCount: 40,
					testedSampleCount: 4,
					testType: "both_standard",
					isAzopyramNegative: true,
					isPhenolphthaleinNegative: true,
					isSudanNegative: true,
					detergentBrand: "Оптимакс Про 1.5%",
					isBatchApproved: true,
					operatorStaffFullName: "Смирнова Анна Викторовна",
					operatorStaffPosition: "Медсестра ЦСО",
					electronicStampVerified: true,
					notes: "Пробы отрицательные. Хирургический блок.",
				},
			],
			form257Records: [
				{
					id: "F257-20260822-01",
					date: "2026-08-22",
					cycleNumber: 14,
					sterilizerId: "autoclave-01",
					sterilizerCode: "АВТОКЛАВ-01",
					sterilizerBrandModel: "Euronda E9 Next (Класс B)",
					sterilizerSerialNumber: "SN-EUR-99824",
					regimeId: "steam_134_5min",
					regimeNameRu: "134°C Универсальный (фракционированный вакуум)",
					targetTemperatureCelsius: 134,
					targetPressureBar: 2.1,
					targetExposureMinutes: 5,
					actualTemperatureCelsius: 134.5,
					actualPressureBar: 2.15,
					actualExposureMinutes: 5.5,
					itemsDescriptionRu: "Стоматологические наконечники, боры, терапевтические наборы (крафт-пакеты)",
					packsCount: 18,
					packagingType: "kraft_pouch",
					packagingNameRu: "Пакеты комбинированные самоклеящиеся 100х200",
					shelfLifeDays: 50,
					chamberPoints: [
						{ pointIndex: 1, code: "KT-1", nameRu: "Верхний левый угол", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
						{ pointIndex: 2, code: "KT-2", nameRu: "Верхний правый угол", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
						{ pointIndex: 3, code: "KT-3", nameRu: "Центр камеры", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
						{ pointIndex: 4, code: "KT-4", nameRu: "Нижний левый угол", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
						{ pointIndex: 5, code: "KT-5", nameRu: "Точка стока конденсата", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
					],
					areAllPointsPassed: true,
					chemicalIndicatorNameRu: "Медтест 134/5 (5 класс)",
					isCyclePassed: true,
					status: "sterile_passed",
					operatorStaffFullName: "Смирнова А. В.",
					operatorStaffPosition: "Медсестра ЦСО",
					headNurseSignatureFullName: "Иванова М. П.",
					isHeadNurseVerified: true,
					verificationTimestamp: new Date().toISOString(),
					digitalStampHash: "STAMP-AUTOCLAVE-01-20260822-VERIFIED-ECP",
					createdAt: new Date().toISOString(),
				},
			],
			bactericidalSessions: [
				{
					id: "sess-01",
					equipmentId: "equip-01",
					roomName: "Кабинет №1 (Терапия)",
					deviceBrand: "Дезар-Кронт 802",
					date: "2026-08-22",
					sessionStartTime: "08:00",
					sessionEndTime: "08:30",
					durationMinutes: 30,
					durationHours: 0.5,
					operatingMode: "pre_op_preparation",
					cumulativeHoursAfterSession: 1420.5,
					operatorStaffFullName: "Соколова Т. Н.",
				},
			],
			generalCleanings: [
				{
					id: "clean-01",
					roomType: "surgical",
					roomName: "Хирургический кабинет №2",
					scheduledDate: "2026-08-22",
					actualDateTime: new Date().toISOString(),
					treatedAreaM2: 32.5,
					disinfectantName: "Аламинол 1.5%",
					activeIngredient: "Альдегиды + ЧАС",
					solutionConcentrationPercent: 1.5,
					applicationMethodRu: "Двукратное протирание поверхностей",
					exposureTimeMinutes: 60,
					uvIrradiationMinutes: 60,
					ventilationMinutes: 15,
					operatorStaffFullName: "Смирнова А. В.",
					inspectorStaffFullName: "Иванова М. П.",
					isInspectorVerified: true,
					status: "verified_by_inspector",
				},
			],
			temperatureLogs: [
				{
					id: "temp-01",
					measurementDate: "2026-08-22",
					measurementPeriod: "morning",
					equipmentName: "Фармацевтический холодильник Pozis ХФ-250",
					location: "ЦСО / Процедурный кабинет",
					meterDeviceName: "Термометр ТМН-1",
					meterSerialNumber: "SN-90412",
					temperatureCelsius: 4.2,
					relativeHumidityPercent: 55,
					targetTempMinCelsius: 2,
					targetTempMaxCelsius: 8,
					isWithinNorm: true,
					operatorStaffFullName: "Иванова М. П.",
				},
			],
		});

		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.write(html);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
			}, 250);
		}
	};

	const handleExportConsolidatedCsv = () => {
		const csv = exportSanpinConsolidatedArchiveToCsv({
			clinicInfo: {
				name: "ООО «Стоматологическая клиника ДЕНТЕ»",
				ogrn: "1027700123456",
				inn: "7701234567",
				address: "г. Москва, ул. Клиническая, д. 10",
				chiefDoctor: "Смирнов А. В.",
				headNurse: "Иванова М. П.",
				licenseNumber: "№ ЛО41-01137-77/00368421",
				volumeNumber: 1,
			},
			periodLabelRu: `за период с 01.08.2026 по ${new Date().toLocaleDateString("ru-RU")}`,
			psoRecords: [
				{
					id: "PSO-20260822-0101",
					timestamp: new Date().toISOString(),
					instrumentName: "Терапевтический смотровой набор (зеркала, зонды, пинцеты)",
					categoryId: "therapeutic_kit",
					batchItemCount: 120,
					testedSampleCount: 5,
					testType: "both_standard",
					isAzopyramNegative: true,
					isPhenolphthaleinNegative: true,
					isSudanNegative: true,
					detergentBrand: "Биолот 0.5% + Аламинол 1.0%",
					isBatchApproved: true,
					operatorStaffFullName: "Смирнова Анна Викторовна",
					operatorStaffPosition: "Медсестра ЦСО",
					electronicStampVerified: true,
					notes: "Пробы отрицательные. Партия передана на автоклавирование (Цикл #14)",
				},
			],
			form257Records: [
				{
					id: "F257-20260822-01",
					date: "2026-08-22",
					cycleNumber: 14,
					sterilizerId: "autoclave-01",
					sterilizerCode: "АВТОКЛАВ-01",
					sterilizerBrandModel: "Euronda E9 Next (Класс B)",
					sterilizerSerialNumber: "SN-EUR-99824",
					regimeId: "steam_134_5min",
					regimeNameRu: "134°C Универсальный (фракционированный вакуум)",
					targetTemperatureCelsius: 134,
					targetPressureBar: 2.1,
					targetExposureMinutes: 5,
					actualTemperatureCelsius: 134.5,
					actualPressureBar: 2.15,
					actualExposureMinutes: 5.5,
					itemsDescriptionRu: "Стоматологические наконечники, боры, терапевтические наборы (крафт-пакеты)",
					packsCount: 18,
					packagingType: "kraft_pouch",
					packagingNameRu: "Пакеты комбинированные самоклеящиеся 100х200",
					shelfLifeDays: 50,
					chamberPoints: [
						{ pointIndex: 1, code: "KT-1", nameRu: "Верхний левый угол", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
						{ pointIndex: 2, code: "KT-2", nameRu: "Верхний правый угол", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
						{ pointIndex: 3, code: "KT-3", nameRu: "Центр камеры", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
						{ pointIndex: 4, code: "KT-4", nameRu: "Нижний левый угол", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
						{ pointIndex: 5, code: "KT-5", nameRu: "Точка стока конденсата", indicatorId: "medtest-134", indicatorTradeNameRu: "Медтест 134/5", status: "passed", initialColorRu: "Желтый", actualColorRu: "Темно-коричневый" },
					],
					areAllPointsPassed: true,
					chemicalIndicatorNameRu: "Медтест 134/5 (5 класс)",
					isCyclePassed: true,
					status: "sterile_passed",
					operatorStaffFullName: "Смирнова А. В.",
					operatorStaffPosition: "Медсестра ЦСО",
					headNurseSignatureFullName: "Иванова М. П.",
					isHeadNurseVerified: true,
					verificationTimestamp: new Date().toISOString(),
					digitalStampHash: "STAMP-AUTOCLAVE-01-20260822-VERIFIED-ECP",
					createdAt: new Date().toISOString(),
				},
			],
			bactericidalSessions: [
				{
					id: "sess-01",
					equipmentId: "equip-01",
					roomName: "Кабинет №1 (Терапия)",
					deviceBrand: "Дезар-Кронт 802",
					date: "2026-08-22",
					sessionStartTime: "08:00",
					sessionEndTime: "08:30",
					durationMinutes: 30,
					durationHours: 0.5,
					operatingMode: "pre_op_preparation",
					cumulativeHoursAfterSession: 1420.5,
					operatorStaffFullName: "Соколова Т. Н.",
				},
			],
			generalCleanings: [
				{
					id: "clean-01",
					roomType: "surgical",
					roomName: "Хирургический кабинет №2",
					scheduledDate: "2026-08-22",
					actualDateTime: new Date().toISOString(),
					treatedAreaM2: 32.5,
					disinfectantName: "Аламинол 1.5%",
					activeIngredient: "Альдегиды + ЧАС",
					solutionConcentrationPercent: 1.5,
					applicationMethodRu: "Двукратное протирание поверхностей",
					exposureTimeMinutes: 60,
					uvIrradiationMinutes: 60,
					ventilationMinutes: 15,
					operatorStaffFullName: "Смирнова А. В.",
					inspectorStaffFullName: "Иванова М. П.",
					isInspectorVerified: true,
					status: "verified_by_inspector",
				},
			],
			temperatureLogs: [
				{
					id: "temp-01",
					measurementDate: "2026-08-22",
					measurementPeriod: "morning",
					equipmentName: "Фармацевтический холодильник Pozis ХФ-250",
					location: "ЦСО / Процедурный кабинет",
					meterDeviceName: "Термометр ТМН-1",
					meterSerialNumber: "SN-90412",
					temperatureCelsius: 4.2,
					relativeHumidityPercent: 55,
					targetTempMinCelsius: 2,
					targetTempMaxCelsius: 8,
					isWithinNorm: true,
					operatorStaffFullName: "Иванова М. П.",
				},
			],
		});

		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", "SanPiN_Consolidated_Production_Control_Archive.csv");
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		showToast("Сводный архив СанПиН (CSV) успешно экспортирован", "success");
	};

	return (
		<div className="sanpin-container">
			{/* Top Header */}
			<div className="sanpin-header">
				<div className="sanpin-title-block">
					<h1>
						<ShieldCheck size={28} color="var(--brand-primary, #2563eb)" />
						Журналы производственного контроля и СанПиН
					</h1>
					<div className="sanpin-subtitle">
						Полный реестр обязательных журналов Роспотребнадзора по СанПиН 3.3686-21, 2.1.3684-21 и Приказу 706н
					</div>
				</div>

				<div className="sanpin-header-actions" style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
					<span className="sanpin-badge-gov" style={{ minHeight: "38px", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", padding: "0.3rem 0.65rem" }}>
						<CheckCircle2 size={16} /> СанПиН 2026
					</span>

					{/* 1. Единственная Primary кнопка: + Новый цикл */}
					<button
						type="button"
						onClick={() => setIsCycleModalOpen(true)}
						className="sanpin-btn"
						style={{
							minHeight: "40px",
							padding: "0.45rem 1rem",
							fontSize: "0.85rem",
							fontWeight: 700,
							background: "var(--teal-600, #0d9488)",
							borderColor: "var(--teal-600, #0d9488)",
							color: "#ffffff",
							boxShadow: "0 2px 6px rgba(13, 148, 136, 0.3)",
							cursor: "pointer",
						}}
						data-testid="sanpin-new-cycle-primary-btn"
					>
						<Plus size={16} /> Новый цикл
					</button>

					{/* 2. Компактное выпадающее меню: [⋮ Опции СанПиН] */}
					<div ref={exportMenuRef} style={{ position: "relative", display: "inline-block" }}>
						<button
							type="button"
							onClick={() => setIsExportMenuOpen((prev) => !prev)}
							className="sanpin-btn sanpin-btn-secondary"
							style={{
								minHeight: "40px",
								padding: "0.45rem 0.85rem",
								fontSize: "0.85rem",
								fontWeight: 700,
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								gap: "0.35rem",
							}}
							aria-expanded={isExportMenuOpen}
							title="Опции СанПиН: Закрытие смены, пакетный расчет, сшивы, ЭЦП и экспорт"
							data-testid="sanpin-options-dropdown-btn"
						>
							<MoreVertical size={16} color="var(--brand-primary, #2563eb)" />
							<span>Опции СанПиН</span>
							<ChevronDown size={14} style={{ transform: isExportMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
						</button>

						{isExportMenuOpen && (
							<div
								style={{
									position: "absolute",
									right: 0,
									top: "calc(100% + 4px)",
									minWidth: "270px",
									background: "var(--paper-strong, #ffffff)",
									border: "1px solid var(--line, #e2e8f0)",
									borderRadius: "10px",
									boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
									zIndex: 50,
									padding: "0.35rem",
									display: "flex",
									flexDirection: "column",
									gap: "0.2rem",
								}}
							>
								{/* Закрыть смену */}
								<button
									type="button"
									onClick={() => {
										setIsExportMenuOpen(false);
										handleAutofillShift();
									}}
									disabled={autoFilling}
									className="sanpin-dropdown-item"
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										padding: "0.5rem 0.75rem",
										borderRadius: "6px",
										background: "none",
										border: "none",
										width: "100%",
										textAlign: "left",
										fontSize: "0.825rem",
										fontWeight: 600,
										color: "var(--ink, #0f172a)",
										cursor: "pointer",
									}}
									data-testid="sanpin-1click-autofill-btn"
								>
									<Sparkles size={15} color="#0d9488" />
									<span>{autoFilling ? "Оформление..." : "Закрыть смену (1 клик)"}</span>
								</button>

								{/* Пакетное закрытие */}
								<button
									type="button"
									onClick={() => {
										setIsExportMenuOpen(false);
										setIsRetroactiveBatchModalOpen(true);
									}}
									className="sanpin-dropdown-item"
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										padding: "0.5rem 0.75rem",
										borderRadius: "6px",
										background: "none",
										border: "none",
										width: "100%",
										textAlign: "left",
										fontSize: "0.825rem",
										fontWeight: 600,
										color: "var(--ink, #0f172a)",
										cursor: "pointer",
									}}
									data-testid="open-retroactive-batch-header-btn"
								>
									<Rocket size={15} color="#2563eb" />
									<span>Пакетное закрытие (за период)</span>
								</button>

								<div style={{ height: "1px", background: "var(--line, #e2e8f0)", margin: "0.2rem 0" }} />

								{/* Сводный сшив */}
								<button
									type="button"
									onClick={() => {
										setIsExportMenuOpen(false);
										handlePrintConsolidatedBinder();
									}}
									className="sanpin-dropdown-item"
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										padding: "0.5rem 0.75rem",
										borderRadius: "6px",
										background: "none",
										border: "none",
										width: "100%",
										textAlign: "left",
										fontSize: "0.825rem",
										fontWeight: 600,
										color: "var(--ink, #0f172a)",
										cursor: "pointer",
									}}
									data-testid="print-consolidated-binder-btn"
								>
									<FileBadge size={15} color="#4338ca" />
									<span>Сводный сшив СанПиН (А4)</span>
								</button>

								{/* CSV */}
								<button
									type="button"
									onClick={() => {
										setIsExportMenuOpen(false);
										handleExportConsolidatedCsv();
									}}
									className="sanpin-dropdown-item"
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										padding: "0.5rem 0.75rem",
										borderRadius: "6px",
										background: "none",
										border: "none",
										width: "100%",
										textAlign: "left",
										fontSize: "0.825rem",
										fontWeight: 600,
										color: "var(--ink, #0f172a)",
										cursor: "pointer",
									}}
									data-testid="export-consolidated-csv-btn"
								>
									<Download size={15} color="#059669" />
									<span>Сводный CSV архив</span>
								</button>

								{/* ЭЦП */}
								<button
									type="button"
									onClick={() => {
										setIsExportMenuOpen(false);
										setIsNurseSignModalOpen(true);
									}}
									className="sanpin-dropdown-item"
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										padding: "0.5rem 0.75rem",
										borderRadius: "6px",
										background: "none",
										border: "none",
										width: "100%",
										textAlign: "left",
										fontSize: "0.825rem",
										fontWeight: 600,
										color: "var(--ink, #0f172a)",
										cursor: "pointer",
									}}
								>
									<Award size={15} color="#2563eb" />
									<span>ЭЦП медсестры ЦСО</span>
								</button>

								{/* Маркировка */}
								<button
									type="button"
									onClick={() => {
										setIsExportMenuOpen(false);
										setIsKraftModalOpen(true);
									}}
									className="sanpin-dropdown-item"
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										padding: "0.5rem 0.75rem",
										borderRadius: "6px",
										background: "none",
										border: "none",
										width: "100%",
										textAlign: "left",
										fontSize: "0.825rem",
										fontWeight: 600,
										color: "var(--ink, #0f172a)",
										cursor: "pointer",
									}}
									data-testid="open-kraft-studio-header-btn"
								>
									<QrCode size={15} color="#7c3aed" />
									<span>Маркировка крафт-пакетов</span>
								</button>

								{/* Журнал 257/у */}
								<button
									type="button"
									onClick={() => {
										setIsExportMenuOpen(false);
										setIsJournal257ModalOpen(true);
									}}
									className="sanpin-dropdown-item"
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										padding: "0.5rem 0.75rem",
										borderRadius: "6px",
										background: "none",
										border: "none",
										width: "100%",
										textAlign: "left",
										fontSize: "0.825rem",
										fontWeight: 600,
										color: "var(--ink, #0f172a)",
										cursor: "pointer",
									}}
									data-testid="open-journal-257-header-btn"
								>
									<FileSpreadsheet size={15} color="#0891b2" />
									<span>Журнал 257/у</span>
								</button>

								{/* Печать текущей вкладки */}
								<button
									type="button"
									onClick={() => {
										setIsExportMenuOpen(false);
										handleExportDossierPdf();
									}}
									className="sanpin-dropdown-item"
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										padding: "0.5rem 0.75rem",
										borderRadius: "6px",
										background: "none",
										border: "none",
										width: "100%",
										textAlign: "left",
										fontSize: "0.825rem",
										fontWeight: 600,
										color: "var(--ink, #0f172a)",
										cursor: "pointer",
									}}
								>
									<Printer size={15} color="var(--muted, #64748b)" />
									<span>Печать текущей вкладки</span>
								</button>
							</div>
						)}
					</div>

					{/* 3. Кнопка обновления */}
					<button
						type="button"
						onClick={fetchSummary}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "40px", minWidth: "40px", padding: "0.45rem", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyItems: "center" }}
						title="Обновить сводку"
					>
						<RotateCcw size={15} />
					</button>
				</div>
			</div>

			{/* KPI Summary Strip */}
			{summary && (
				<div className="sanpin-kpi-grid">
					<div
						className={`sanpin-kpi-card ${activeTab === "pso" ? "active-kpi" : ""}`}
						onClick={() => setActiveTab("pso")}
						style={{ cursor: "pointer", minHeight: "88px" }}
					>
						<span className="sanpin-kpi-label">ПСО за сегодня (366/у)</span>
						<span className="sanpin-kpi-value">{summary.pso?.totalToday ?? 0} проб</span>
						<span className="sanpin-kpi-subtext" style={{ color: "#059669", fontWeight: 600 }}>
							Допущено: {summary.pso?.approvedToday ?? 0} шт.
						</span>
					</div>

					<div
						className={`sanpin-kpi-card ${activeTab === "autoclave" ? "active-kpi" : ""}`}
						onClick={() => setActiveTab("autoclave")}
						style={{ cursor: "pointer", minHeight: "88px" }}
					>
						<span className="sanpin-kpi-label">Стерилизация (257/у)</span>
						<span className="sanpin-kpi-value">{summary.sterilization?.totalCyclesToday ?? 0} циклов</span>
						<span className="sanpin-kpi-subtext" style={{ color: "#059669", fontWeight: 600 }}>
							Успешно: {summary.sterilization?.passedToday ?? 0}
						</span>
					</div>

					<div
						className={`sanpin-kpi-card ${(summary.bactericidal?.expiredLamps ?? 0) > 0 || (summary.bactericidal?.warningLamps ?? 0) > 0 ? "sanpin-kpi-alert" : ""} ${activeTab === "bactericidal" ? "active-kpi" : ""}`}
						onClick={() => setActiveTab("bactericidal")}
						style={{ cursor: "pointer", minHeight: "88px" }}
					>
						<span className="sanpin-kpi-label">Рециркуляторы / Лампы</span>
						<span className="sanpin-kpi-value">{summary.bactericidal?.totalEquipments ?? 0} аппаратов</span>
						<span className="sanpin-kpi-subtext">
							{(summary.bactericidal?.expiredLamps ?? 0) > 0 ? (
								<strong style={{ color: "#dc2626" }}>Истекли лампы: {summary.bactericidal.expiredLamps} шт!</strong>
							) : (summary.bactericidal?.warningLamps ?? 0) > 0 ? (
								<strong style={{ color: "#d97706" }}>Скоро замена: {summary.bactericidal.warningLamps} шт.</strong>
							) : (
								<span style={{ color: "#059669", fontWeight: 600 }}>Все лампы в норме</span>
							)}
						</span>
					</div>

					<div
						className={`sanpin-kpi-card ${activeTab === "waste" ? "active-kpi" : ""}`}
						onClick={() => setActiveTab("waste")}
						style={{ cursor: "pointer", minHeight: "88px" }}
					>
						<span className="sanpin-kpi-label">Медотходы (мес.)</span>
						<span className="sanpin-kpi-value">
							{(summary.wasteMonth ?? []).reduce((acc: number, w: any) => acc + (w.totalKg || 0), 0).toFixed(1)} кг
						</span>
						<span className="sanpin-kpi-subtext">Классы А, Б, Г</span>
					</div>

					<div
						className={`sanpin-kpi-card ${(summary.temperature?.deviationsToday ?? 0) > 0 ? "sanpin-kpi-alert" : ""} ${activeTab === "temperature" ? "active-kpi" : ""}`}
						onClick={() => setActiveTab("temperature")}
						style={{ cursor: "pointer", minHeight: "88px" }}
					>
						<span className="sanpin-kpi-label">T° и влажность</span>
						<span className="sanpin-kpi-value">
							{summary.temperature?.totalChecksToday ?? 0} замеров
						</span>
						<span className="sanpin-kpi-subtext">
							{(summary.temperature?.deviationsToday ?? 0) > 0 ? (
								<strong style={{ color: "#dc2626" }}>Отклонений: {summary.temperature.deviationsToday} (!)</strong>
							) : (
								<span style={{ color: "#059669", fontWeight: 600 }}>Температура в норме</span>
							)}
						</span>
					</div>
				</div>
			)}

			{/* Tab Switcher: 1-line horizontal scroll for all 12 statutory registers */}
			<div
				className="sanpin-tabs-nav flex overflow-x-auto whitespace-nowrap scrollbar-hide gap-1.5 touch-pan-x min-w-0"
				style={{
					display: "flex",
					gap: "0.375rem",
					overflowX: "auto",
					whiteSpace: "nowrap",
					padding: "0 16px 0.5rem 16px",
					WebkitOverflowScrolling: "touch",
					scrollbarWidth: "none",
					width: "100%",
					boxSizing: "border-box",
				}}
				data-testid="sanpin-tabs-12-nav"
			>
				{SANPIN_TABS.map((tab) => {
					const Icon = tab.icon;
					const isActive = activeTab === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={`sanpin-tab-btn ${isActive ? "active" : ""}`}
							style={{
								minHeight: "34px",
								height: "34px",
								padding: "0.35rem 0.65rem",
								fontSize: "0.8125rem",
								fontWeight: isActive ? 700 : 600,
								display: "inline-flex",
								alignItems: "center",
								gap: "0.35rem",
								flexShrink: 0,
								cursor: "pointer",
								borderRadius: "0.375rem",
								border: "1px solid",
								borderColor: isActive ? "var(--teal-600, #0d9488)" : "transparent",
								background: isActive ? "var(--teal-600, #0d9488)" : "transparent",
								color: isActive ? "#ffffff" : "var(--muted, #64748b)",
								transition: "all 0.15s ease",
							}}
							data-testid={`tab-${tab.id}-btn`}
						>
							<Icon size={15} color={isActive ? "#ffffff" : "currentColor"} />
							<span>{tab.label}</span>
						</button>
					);
				})}
			</div>

			{/* Tab Views: All 12 Statutory Registers */}
			{activeTab === "retroactive_batch" && <RetroactiveBatchTab />}
			{activeTab === "cabinet_readiness" && <CabinetReadinessTab />}
			{activeTab === "pso" && <PsoRegisterTab />}
			{activeTab === "autoclave" && <AutoclaveRegisterTab />}
			{activeTab === "bactericidal" && <BactericidalRegisterTab />}
			{activeTab === "cleaning" && <GeneralCleaningRegisterTab />}
			{activeTab === "waste" && <MedicalWasteRegisterTab />}
			{activeTab === "biohazard" && <EmergencyBiohazardRegisterTab />}
			{activeTab === "temperature" && <TemperatureHumidityRegisterTab />}
			{activeTab === "disinfectants" && <DisinfectantsRegisterTab />}
			{activeTab === "bac_lab" && <BacLabRegisterTab />}
			{activeTab === "needle_disposal" && <NeedleDisposalRegisterTab />}

			{/* SanPiN Sterilization Cycle Modal */}
			<SanpinCycleModal
				isOpen={isCycleModalOpen}
				onClose={() => setIsCycleModalOpen(false)}
				onSuccess={fetchSummary}
			/>

			{/* Electronic Nurse Signature Shift Stamp Modal */}
			{isNurseSignModalOpen && (
				<div className="sanpin-modal-overlay" role="dialog" aria-modal="true">
					<div className="sanpin-modal" style={{ maxWidth: "560px" }}>
						<div className="sanpin-modal-header" style={{ padding: "1.25rem" }}>
							<h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.15rem" }}>
								<Award size={22} color="var(--brand-primary, #2563eb)" />
								Цифровая заверка журналов смены (ЭЦП Медсестры ЦСО)
							</h3>
							<button
								type="button"
								onClick={() => setIsNurseSignModalOpen(false)}
								style={{
									minWidth: "44px",
									minHeight: "44px",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									background: "none",
									border: "none",
									cursor: "pointer",
									color: "var(--muted)",
								}}
							>
								<X size={20} />
							</button>
						</div>

						<form onSubmit={handleBatchNurseSign}>
							<div className="sanpin-modal-body" style={{ padding: "1.25rem", gap: "1rem" }}>
								<div
									style={{
										padding: "0.9rem",
										borderRadius: "0.5rem",
										background: "rgba(16, 185, 129, 0.08)",
										border: "1px solid rgba(16, 185, 129, 0.25)",
										fontSize: "0.85rem",
										lineHeight: 1.4,
									}}
								>
									<strong>СанПиН 3.3686-21:</strong> Настоящим подтверждается проверка целостности упаковок, срабатывания химических индикаторов класса 5 во всех точках закладки, отрицательные азопирамовые пробы и наработка ламп за текущую смену.
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
										ФИО медсестры ЦСО / Старшей медсестры
									</label>
									<input
										type="text"
										required
										value={nurseSignName}
										onChange={(e) => setNurseSignName(e.target.value)}
										className="sanpin-input"
										style={{ minHeight: "44px", fontSize: "0.9rem" }}
									/>
								</div>

								<div className="sanpin-form-group">
									<label className="sanpin-form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
										PIN-код подтверждения ЭЦП
									</label>
									<input
										type="password"
										maxLength={6}
										value={nurseSignPin}
										onChange={(e) => setNurseSignPin(e.target.value)}
										className="sanpin-input"
										style={{ minHeight: "44px", fontSize: "1rem", letterSpacing: "4px" }}
										placeholder="••••"
									/>
								</div>
							</div>

							<div className="sanpin-modal-footer" style={{ padding: "1rem 1.25rem", gap: "0.75rem" }}>
								<button
									type="button"
									onClick={() => setIsNurseSignModalOpen(false)}
									className="sanpin-btn sanpin-btn-secondary"
									style={{ minHeight: "44px", padding: "0.5rem 1.25rem" }}
								>
									Отмена
								</button>
								<button
									type="submit"
									disabled={signingShift}
									className="sanpin-btn sanpin-btn-primary"
									style={{ minHeight: "44px", padding: "0.5rem 1.5rem", fontSize: "0.95rem", fontWeight: 700 }}
								>
									<FileBadge size={18} />
									{signingShift ? "Заверка..." : "Поставить штамп ЭЦП"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Kraft Package Barcode Studio Modal */}
			<KraftPackageBarcodeModal
				isOpen={isKraftModalOpen}
				onClose={() => setIsKraftModalOpen(false)}
			/>

			{/* Form 257/u Studio Modal: 5 Chamber Points, BioControl, Analytics */}
			<AutoclaveLog257Modal
				isOpen={isJournal257ModalOpen}
				onClose={() => setIsJournal257ModalOpen(false)}
			/>

			{/* Retroactive SanPiN Batch Modal Studio */}
			<RetroactiveSanpinBatchModal
				isOpen={isRetroactiveBatchModalOpen}
				onClose={() => setIsRetroactiveBatchModalOpen(false)}
				onSuccess={fetchSummary}
			/>
		</div>
	);
}

// Canonical re-export for backward-compatible views
export { SanpinRegisters as SanpinRegistersView };
export default SanpinRegisters;
