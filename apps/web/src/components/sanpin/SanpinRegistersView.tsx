import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	CheckCircle2,
	Clock,
	Download,
	Droplets,
	FileCheck2,
	FileSpreadsheet,
	FileText,
	Flame,
	FlaskConical,
	Layers,
	Printer,
	QrCode,
	Radio,
	Recycle,
	RotateCcw,
	Search,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Thermometer,
	Trash2,
	Wind,
	XCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { AutoclaveRegisterTab } from "./AutoclaveRegisterTab";
import { BactericidalRegisterTab } from "./BactericidalRegisterTab";
import { EmergencyBiohazardRegisterTab } from "./EmergencyBiohazardRegisterTab";
import { GeneralCleaningRegisterTab } from "./GeneralCleaningRegisterTab";
import { MedicalWasteRegisterTab } from "./MedicalWasteRegisterTab";
import { PsoRegisterTab } from "./PsoRegisterTab";
import { TemperatureHumidityRegisterTab } from "./TemperatureHumidityRegisterTab";
import "./SanpinRegisters.css";

export type SanpinRegisterTab =
	| "pso"
	| "autoclave"
	| "bactericidal"
	| "cleaning"
	| "waste"
	| "biohazard"
	| "temperature";

export function SanpinRegistersView() {
	const [activeTab, setActiveTab] = useState<SanpinRegisterTab>("pso");
	const [summary, setSummary] = useState<any>(null);
	const [loadingSummary, setLoadingSummary] = useState(true);

	const fetchSummary = async () => {
		try {
			setLoadingSummary(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch("/api/registers/summary", {
				headers: {
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
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

				<div className="sanpin-header-actions">
					<span className="sanpin-badge-gov">
						<CheckCircle2 size={13} /> Роспотребнадзор 2026 Ready
					</span>
					<button
						type="button"
						onClick={fetchSummary}
						className="sanpin-btn sanpin-btn-secondary"
						title="Обновить сводку"
					>
						<RotateCcw size={14} /> Обновить
					</button>
				</div>
			</div>

			{/* KPI Summary Strip */}
			{summary && (
				<div className="sanpin-kpi-grid">
					<div
						className="sanpin-kpi-card"
						onClick={() => setActiveTab("pso")}
						style={{ cursor: "pointer" }}
					>
						<span className="sanpin-kpi-label">ПСО за сегодня</span>
						<span className="sanpin-kpi-value">{summary.pso.totalToday} проб</span>
						<span className="sanpin-kpi-subtext" style={{ color: "#059669" }}>
							Допущено: {summary.pso.approvedToday} шт.
						</span>
					</div>

					<div
						className="sanpin-kpi-card"
						onClick={() => setActiveTab("autoclave")}
						style={{ cursor: "pointer" }}
					>
						<span className="sanpin-kpi-label">Стерилизация сегодня</span>
						<span className="sanpin-kpi-value">{summary.sterilization.totalCyclesToday} циклов</span>
						<span className="sanpin-kpi-subtext" style={{ color: "#059669" }}>
							Успешно: {summary.sterilization.passedToday}
						</span>
					</div>

					<div
						className={`sanpin-kpi-card ${summary.bactericidal.expiredLamps > 0 || summary.bactericidal.warningLamps > 0 ? "sanpin-kpi-alert" : ""}`}
						onClick={() => setActiveTab("bactericidal")}
						style={{ cursor: "pointer" }}
					>
						<span className="sanpin-kpi-label">Рециркуляторы / Лампы</span>
						<span className="sanpin-kpi-value">{summary.bactericidal.totalEquipments} аппаратов</span>
						<span className="sanpin-kpi-subtext">
							{summary.bactericidal.expiredLamps > 0 ? (
								<strong style={{ color: "#dc2626" }}>Истекли лампы: {summary.bactericidal.expiredLamps} шт!</strong>
							) : summary.bactericidal.warningLamps > 0 ? (
								<strong style={{ color: "#d97706" }}>Скоро замена: {summary.bactericidal.warningLamps} шт.</strong>
							) : (
								"Все лампы в норме"
							)}
						</span>
					</div>

					<div
						className="sanpin-kpi-card"
						onClick={() => setActiveTab("waste")}
						style={{ cursor: "pointer" }}
					>
						<span className="sanpin-kpi-label">Отходы (за месяц)</span>
						<span className="sanpin-kpi-value">
							{summary.wasteMonth.reduce((acc: number, w: any) => acc + (w.totalKg || 0), 0).toFixed(1)} кг
						</span>
						<span className="sanpin-kpi-subtext">Классы А, Б, Г</span>
					</div>

					<div
						className={`sanpin-kpi-card ${summary.temperature.deviationsToday > 0 ? "sanpin-kpi-alert" : ""}`}
						onClick={() => setActiveTab("temperature")}
						style={{ cursor: "pointer" }}
					>
						<span className="sanpin-kpi-label">T° и влажность</span>
						<span className="sanpin-kpi-value">
							{summary.temperature.totalChecksToday} замеров
						</span>
						<span className="sanpin-kpi-subtext">
							{summary.temperature.deviationsToday > 0 ? (
								<strong style={{ color: "#dc2626" }}>Отклонений: {summary.temperature.deviationsToday} (!)</strong>
							) : (
								"Температура в норме"
							)}
						</span>
					</div>
				</div>
			)}

			{/* Tab Switcher */}
			<div className="sanpin-tabs-nav">
				<button
					type="button"
					onClick={() => setActiveTab("pso")}
					className={`sanpin-tab-btn ${activeTab === "pso" ? "active" : ""}`}
				>
					<FlaskConical size={16} /> 1. ПСО (Форма № 366/у)
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("autoclave")}
					className={`sanpin-tab-btn ${activeTab === "autoclave" ? "active" : ""}`}
				>
					<Flame size={16} /> 2. Автоклавы (Форма № 257/у)
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("bactericidal")}
					className={`sanpin-tab-btn ${activeTab === "bactericidal" ? "active" : ""}`}
				>
					<Wind size={16} /> 3. Рециркуляторы и облучатели
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("cleaning")}
					className={`sanpin-tab-btn ${activeTab === "cleaning" ? "active" : ""}`}
				>
					<Sparkles size={16} /> 4. Генеральные уборки
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("waste")}
					className={`sanpin-tab-btn ${activeTab === "waste" ? "active" : ""}`}
				>
					<Recycle size={16} /> 5. Медотходы А, Б, В, Г
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("biohazard")}
					className={`sanpin-tab-btn ${activeTab === "biohazard" ? "active" : ""}`}
				>
					<ShieldAlert size={16} /> 6. Аварии («Анти-ВИЧ»)
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("temperature")}
					className={`sanpin-tab-btn ${activeTab === "temperature" ? "active" : ""}`}
				>
					<Thermometer size={16} /> 7. Температура и влажность
				</button>
			</div>

			{/* Tab Views */}
			{activeTab === "pso" && <PsoRegisterTab />}
			{activeTab === "autoclave" && <AutoclaveRegisterTab />}
			{activeTab === "bactericidal" && <BactericidalRegisterTab />}
			{activeTab === "cleaning" && <GeneralCleaningRegisterTab />}
			{activeTab === "waste" && <MedicalWasteRegisterTab />}
			{activeTab === "biohazard" && <EmergencyBiohazardRegisterTab />}
			{activeTab === "temperature" && <TemperatureHumidityRegisterTab />}
		</div>
	);
}
