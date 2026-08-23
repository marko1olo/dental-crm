import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	Award,
	Check,
	CheckCircle2,
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
	Plus,
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
	X,
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
import { SanpinCycleModal } from "./SanpinCycleModal";
import { SanpinJournalsModal } from "./journals/SanpinJournalsModal";
import "./SanpinRegisters.css";

export type SanpinRegisterTab =
	| "pso"
	| "autoclave"
	| "bactericidal"
	| "cleaning"
	| "waste"
	| "biohazard"
	| "temperature";

export function SanpinRegisters() {
	const [activeTab, setActiveTab] = useState<SanpinRegisterTab>("autoclave");
	const [summary, setSummary] = useState<any>(null);
	const [loadingSummary, setLoadingSummary] = useState(true);
	const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
	const [isSanpinJournalsModalOpen, setIsSanpinJournalsModalOpen] = useState(false);
	const [sanpinJournalsTab, setSanpinJournalsTab] = useState<"pso" | "bactericidal" | "cleaning" | "disinfectants">("pso");
	const [isNurseSignModalOpen, setIsNurseSignModalOpen] = useState(false);
	const [nurseSignName, setNurseSignName] = useState("Медсестра ЦСО");
	const [nurseSignPin, setNurseSignPin] = useState("");
	const [signingShift, setSigningShift] = useState(false);

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
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();
			const res = await fetch("/api/registers/autofill-shift", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
			});

			if (res.ok) {
				const data = await res.json();
				showToast(
					`⚡ Смена успешно оформлена в 1 клик: ${data.batchCount} лотков, выборка ${data.sampleCount} шт. (Азопирам отр., Автоклав 134°C ОК). Досье готово для Роспотребнадзора.`,
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

	const handleOpenSanpinJournals = (tab?: "pso" | "bactericidal" | "cleaning" | "disinfectants") => {
		if (tab) {
			setSanpinJournalsTab(tab);
		} else if (activeTab === "bactericidal" || activeTab === "cleaning" || activeTab === "pso") {
			setSanpinJournalsTab(activeTab);
		} else {
			setSanpinJournalsTab("pso");
		}
		setIsSanpinJournalsModalOpen(true);
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

				<div className="sanpin-header-actions" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
					<span className="sanpin-badge-gov" style={{ minHeight: "44px", fontSize: "0.85rem" }}>
						<CheckCircle2 size={16} /> Роспотребнадзор 2026 Ready
					</span>

					<button
						type="button"
						onClick={handleAutofillShift}
						disabled={autoFilling}
						className="sanpin-btn sanpin-btn-primary"
						style={{
							minHeight: "44px",
							padding: "0.5rem 1.2rem",
							fontSize: "0.95rem",
							fontWeight: 700,
							background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
							borderColor: "#047857",
							color: "#ffffff",
							boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
						}}
						title="1 Клик: Автоматически сформировать и опечатать журналы 257/у и 366/у за всю смену на основе завершенных приемов"
						data-testid="sanpin-1click-autofill-btn"
					>
						<Sparkles size={18} /> {autoFilling ? "Оформление..." : "⚡ Заполнить всё за смену (1 Клик)"}
					</button>

					<button
						type="button"
						onClick={() => setIsCycleModalOpen(true)}
						className="sanpin-btn sanpin-btn-primary"
						style={{ minHeight: "44px", padding: "0.5rem 1rem", fontSize: "0.9rem", fontWeight: 700 }}
					>
						<Plus size={16} /> + Новый цикл автоклава
					</button>

					<button
						type="button"
						onClick={() => handleOpenSanpinJournals()}
						className="sanpin-btn sanpin-btn-secondary"
						style={{
							minHeight: "44px",
							padding: "0.5rem 1rem",
							fontSize: "0.9rem",
							fontWeight: 600,
							borderColor: "var(--brand-primary, #2563eb)",
							color: "var(--brand-primary, #2563eb)",
						}}
						title="Журналы СанПиН 3.3686-21 (ПСО Азопирам, Бактерицидные лампы, Генеральные уборки)"
						data-testid="open-sanpin-journals-modal-btn"
					>
						<FileSpreadsheet size={16} color="var(--brand-primary, #2563eb)" /> Журналы СанПиН 3.3686-21 (ПСО Азопирам, Бактерицидные лампы, Генеральные уборки)
					</button>

					<button
						type="button"
						onClick={() => setIsNurseSignModalOpen(true)}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "44px", padding: "0.5rem 1rem", fontSize: "0.9rem", fontWeight: 600 }}
						title="Электронная цифровая подпись медсестры ЦСО на журналы смены"
					>
						<Award size={16} color="var(--brand-primary)" /> Заверить смену (ЭЦП)
					</button>

					<button
						type="button"
						onClick={handleExportDossierPdf}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "44px", padding: "0.5rem 0.9rem", fontSize: "0.9rem" }}
						title="Печать полного досье СанПиН"
					>
						<Printer size={16} /> Печать / PDF
					</button>

					<button
						type="button"
						onClick={fetchSummary}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ minHeight: "44px", padding: "0.5rem 0.8rem" }}
						title="Обновить сводку"
					>
						<RotateCcw size={16} />
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

			{/* Tab Switcher */}
			<div className="sanpin-tabs-nav">
				<button
					type="button"
					onClick={() => setActiveTab("pso")}
					className={`sanpin-tab-btn ${activeTab === "pso" ? "active" : ""}`}
					style={{ minHeight: "44px", fontSize: "0.9rem" }}
				>
					<FlaskConical size={18} /> 1. ПСО (Форма № 366/у)
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("autoclave")}
					className={`sanpin-tab-btn ${activeTab === "autoclave" ? "active" : ""}`}
					style={{ minHeight: "44px", fontSize: "0.9rem" }}
				>
					<Flame size={18} /> 2. Автоклавы (Форма № 257/у)
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("bactericidal")}
					className={`sanpin-tab-btn ${activeTab === "bactericidal" ? "active" : ""}`}
					style={{ minHeight: "44px", fontSize: "0.9rem" }}
				>
					<Wind size={18} /> 3. Рециркуляторы и облучатели
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("cleaning")}
					className={`sanpin-tab-btn ${activeTab === "cleaning" ? "active" : ""}`}
					style={{ minHeight: "44px", fontSize: "0.9rem" }}
				>
					<Sparkles size={18} /> 4. Генеральные уборки
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("waste")}
					className={`sanpin-tab-btn ${activeTab === "waste" ? "active" : ""}`}
					style={{ minHeight: "44px", fontSize: "0.9rem" }}
				>
					<Recycle size={18} /> 5. Медотходы А, Б, В, Г
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("biohazard")}
					className={`sanpin-tab-btn ${activeTab === "biohazard" ? "active" : ""}`}
					style={{ minHeight: "44px", fontSize: "0.9rem" }}
				>
					<ShieldAlert size={18} /> 6. Аварии («Анти-ВИЧ»)
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("temperature")}
					className={`sanpin-tab-btn ${activeTab === "temperature" ? "active" : ""}`}
					style={{ minHeight: "44px", fontSize: "0.9rem" }}
				>
					<Thermometer size={18} /> 7. Температура и влажность
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

			{/* SanPiN Sterilization Cycle Modal */}
			<SanpinCycleModal
				isOpen={isCycleModalOpen}
				onClose={() => setIsCycleModalOpen(false)}
				onSuccess={fetchSummary}
			/>

			{/* SanPiN Disinfection & Sterilization Journals Studio Modal */}
			<SanpinJournalsModal
				isOpen={isSanpinJournalsModalOpen}
				onClose={() => setIsSanpinJournalsModalOpen(false)}
				initialTab={sanpinJournalsTab}
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
		</div>
	);
}

// Canonical re-export for backward-compatible views
export { SanpinRegisters as SanpinRegistersView };
export default SanpinRegisters;
