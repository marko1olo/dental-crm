/**
 * ============================================================================
 * SANPIN 3.3686-21 & MINISTRY OF HEALTH FORM № 257/U STUDIO
 * Единый нормативный центр контроля работы стерилизаторов (Автоклав / Сухожар).
 * ============================================================================
 */

import {
	Activity,
	Calendar,
	CheckCircle2,
	FileSpreadsheet,
	FileText,
	FlaskConical,
	Layers,
	Plus,
	Printer,
	ShieldCheck,
	Sparkles,
	X,
} from "lucide-react";
import React, { useState } from "react";
import { AutoclaveJournal257Tab } from "./AutoclaveJournal257Tab.js";
import "./autoclaveLog.css";
import {
	createDefault5ChamberPoints,
	createForm257Record,
	DEFAULT_CLINIC_LEGAL_INFO,
	type BiologicalControlTestRecord,
	type ClinicLegalInfo,
	type Form257Record,
} from "./autoclaveLogEngine.js";
import { AutoclaveNewCycleTab } from "./AutoclaveNewCycleTab.js";

export interface AutoclaveLog257ModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTab?: "new_cycle" | "journal_257" | "chamber_points" | "biocontrol" | "analytics";
	readonly clinicInfo?: ClinicLegalInfo;
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL SEED STATUTORY FORM 257/U RECORDS
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_FORM257_RECORDS: readonly Form257Record[] = [
	createForm257Record({
		date: "2026-08-22",
		cycleNumber: 1,
		sterilizerId: "autoclave-melag-vacuklav-23b",
		regimeId: "steam_134_5min",
		sensors: {
			actualTemperatureCelsius: 134.5,
			actualPressureBar: 2.15,
			actualExposureMinutes: 5.5,
		},
		itemsDescriptionRu:
			"Наконечники турбинные NSK Ti-Max (4 шт), угловые микромоторные (4 шт), смотровые терапевтические лотки (зеркала, зонды, пинцеты - 12 шт)",
		packsCount: 16,
		packagingType: "kraft_pouch_sealed",
		chamberPoints: createDefault5ChamberPoints("intetest_v_134_5", true),
		operatorStaffFullName: "Смирнова Анна Викторовна",
		operatorStaffPosition: "Медсестра ЦСО",
		headNurseSignatureFullName: "Иванова Ольга Николаевна",
		isHeadNurseVerified: true,
		notes: "Утренний цикл, тест Бови-Дика пройден перед сменой",
	}),
	createForm257Record({
		date: "2026-08-22",
		cycleNumber: 2,
		sterilizerId: "autoclave-melag-vacuklav-23b",
		regimeId: "steam_134_20min_prion",
		sensors: {
			actualTemperatureCelsius: 134.2,
			actualPressureBar: 2.12,
			actualExposureMinutes: 20.5,
		},
		itemsDescriptionRu:
			"Хирургический набор: элеваторы Бейна, щипцы экстракционные, костные распаторы Лукаса, хирургические ножницы и иглодержатели",
		packsCount: 8,
		packagingType: "cassette_bipack",
		chamberPoints: createDefault5ChamberPoints("intetest_v_134_5", true),
		operatorStaffFullName: "Смирнова Анна Викторовна",
		operatorStaffPosition: "Медсестра ЦСО",
		headNurseSignatureFullName: "Иванова Ольга Николаевна",
		isHeadNurseVerified: true,
		notes: "Имплантологические кассеты, двойной барьерный шов",
	}),
	createForm257Record({
		date: "2026-08-22",
		cycleNumber: 3,
		sterilizerId: "autoclave-euronda-e9-med",
		regimeId: "steam_121_20min",
		sensors: {
			actualTemperatureCelsius: 121.8,
			actualPressureBar: 1.15,
			actualExposureMinutes: 20.0,
		},
		itemsDescriptionRu:
			"Ретракторы губ и щек OptraGate (10 шт), силиконовые слепочные ложки, слюноотсосы автоклавируемые",
		packsCount: 12,
		packagingType: "kraft_pouch_self_seal",
		chamberPoints: createDefault5ChamberPoints("steritest_v_121", true),
		operatorStaffFullName: "Петрова Елена Сергеевна",
		operatorStaffPosition: "Медсестра стерилизационной",
		isHeadNurseVerified: false,
		notes: "Деликатный режим, термолабильные изделия",
	}),
	createForm257Record({
		date: "2026-08-21",
		cycleNumber: 4,
		sterilizerId: "dryheat-gpk-gp20-spu",
		regimeId: "dry_heat_180_60min",
		sensors: {
			actualTemperatureCelsius: 180.5,
			actualPressureBar: 0,
			actualExposureMinutes: 60.0,
		},
		itemsDescriptionRu:
			"Цельнометаллические стоматологические шпатели, гладилки-штопферы, лотки металлические без оптики",
		packsCount: 6,
		packagingType: "kraft_pouch_sealed",
		chamberPoints: createDefault5ChamberPoints("medis_180", true),
		operatorStaffFullName: "Смирнова Анна Викторовна",
		operatorStaffPosition: "Медсестра ЦСО",
		headNurseSignatureFullName: "Иванова Ольга Николаевна",
		isHeadNurseVerified: true,
		notes: "Сухожаровой метод, индикаторы МедИС-180",
	}),
];

const INITIAL_BIO_RECORDS: readonly BiologicalControlTestRecord[] = [
	{
		id: "BIO-202606-001",
		sterilizerId: "autoclave-melag-vacuklav-23b",
		sterilizerCode: "АК-01",
		datePlaced: "2026-06-15",
		dateReadout: "2026-06-17",
		bioIndicatorId: "bio_geobacillus_stearothermophilus",
		sporeCultureNameRu: "Geobacillus stearothermophilus (штамм ATCC 7953, 10^6 спор)",
		lotNumber: "LOT-GS-202604",
		incubationHours: 48,
		incubationTempCelsius: 55,
		testPointIndex: 3,
		result: "sterile_passed",
		laboratoryName: "ФБУЗ «Центр гигиены и эпидемиологии в г. Москве»",
		protocolNumber: "ПР-БИО-2026/06-892",
		responsibleSpecialistFullName: "Смирнова Анна Викторовна",
		notes: "Плановый полугодовой контроль. Рост микроорганизмов отсутствует.",
	},
	{
		id: "BIO-202601-002",
		sterilizerId: "autoclave-euronda-e9-med",
		sterilizerCode: "АК-02",
		datePlaced: "2026-01-20",
		dateReadout: "2026-01-22",
		bioIndicatorId: "bio_geobacillus_stearothermophilus",
		sporeCultureNameRu: "Geobacillus stearothermophilus (штамм ATCC 7953)",
		lotNumber: "LOT-GS-202511",
		incubationHours: 48,
		incubationTempCelsius: 55,
		testPointIndex: 3,
		result: "sterile_passed",
		laboratoryName: "ФБУЗ «Центр гигиены и эпидемиологии в г. Москве»",
		protocolNumber: "ПР-БИО-2026/01-104",
		responsibleSpecialistFullName: "Смирнова Анна Викторовна",
		notes: "Ввод в эксплуатацию после планового ТО.",
	},
];

export function AutoclaveLog257Modal({
	isOpen,
	onClose,
	initialTab = "new_cycle",
	clinicInfo = DEFAULT_CLINIC_LEGAL_INFO,
}: AutoclaveLog257ModalProps) {
	const [activeTab, setActiveTab] = useState<"new_cycle" | "journal_257">("new_cycle");

	const [records, setRecords] = useState<Form257Record[]>([]);
	const [bioRecords, setBioRecords] = useState<BiologicalControlTestRecord[]>([]);

	if (!isOpen) return null;

	const handleSaveNewRecord = (newRec: Form257Record) => {
		setRecords((prev) => [newRec, ...prev]);
		setActiveTab("journal_257");
	};

	const handleDeleteRecord = (id: string) => {
		setRecords((prev) => prev.filter((r) => r.id !== id));
	};

	const handleVerifyRecord = (id: string, headNurseName: string) => {
		setRecords((prev) =>
			prev.map((r) => {
				if (r.id === id) {
					return {
						...r,
						isHeadNurseVerified: true,
						headNurseSignatureFullName: headNurseName,
						verificationTimestamp: new Date().toISOString(),
					};
				}
				return r;
			}),
		);
	};

	const handleAddBioRecord = (newBio: BiologicalControlTestRecord) => {
		setBioRecords((prev) => [newBio, ...prev]);
	};

	return (
		<div className="autoclave-log-modal-overlay" onClick={onClose}>
			<div className="autoclave-log-modal-container" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div className="autoclave-log-header">
					<div className="autoclave-log-title-group">
						<div className="autoclave-log-title-icon">
							<ShieldCheck size={24} />
						</div>
						<div className="autoclave-log-title-text">
							<h2>Журнал работы стерилизаторов (Форма № 257/у)</h2>
							<p>СанПиН 3.3686-21 • Приказ Минздрава СССР № 1030 • Паровой (Класс B) и воздушный методы</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="autoclave-log-close-btn"
						title="Закрыть студию Формы 257/у"
					>
						<X size={20} />
					</button>
				</div>

				{/* Navigation Tabs */}
				<div className="autoclave-log-tabs-nav">
					<button
						type="button"
						className={`autoclave-log-tab-btn ${activeTab === "new_cycle" ? "active" : ""}`}
						onClick={() => setActiveTab("new_cycle")}
					>
						<Plus size={16} />
						Новый цикл стерилизации
					</button>

					<button
						type="button"
						className={`autoclave-log-tab-btn ${activeTab === "journal_257" ? "active" : ""}`}
						onClick={() => setActiveTab("journal_257")}
					>
						<FileText size={16} />
						Реестр Журнала 257/у ({records.length})
					</button>
				</div>

				{/* Body Content Area */}
				<div className="autoclave-log-body">
					{activeTab === "new_cycle" && (
						<AutoclaveNewCycleTab
							onSaveRecord={handleSaveNewRecord}
							defaultOperatorName={clinicInfo.headNurse}
							defaultHeadNurseName={clinicInfo.chiefDoctor}
							latestCycleNumber={records.length + 1}
						/>
					)}

					{activeTab === "journal_257" && (
						<AutoclaveJournal257Tab
							records={records}
							onDeleteRecord={handleDeleteRecord}
							onVerifyRecord={handleVerifyRecord}
							clinicInfo={clinicInfo}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
