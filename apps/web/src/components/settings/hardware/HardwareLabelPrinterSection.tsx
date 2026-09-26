import React, { useState } from "react";
import {
	CheckCircle2,
	Eye,
	FileText,
	Printer,
	RefreshCw,
	ShieldCheck,
	Tag,
} from "lucide-react";
import { HardwarePrinter } from "../../../services/hardware/HardwarePrinter.js";
import { showToast } from "../../GlobalToast.js";

type LabelPresetType = "kraft_sanpin" | "prp_tube";

export function HardwareLabelPrinterSection() {
	const [activePreset, setActivePreset] = useState<LabelPresetType>("kraft_sanpin");
	const [printerModel, setPrinterModel] = useState("xprinter_365");
	const [labelSize, setLabelSize] = useState("58x40");
	const [isPrinting, setIsPrinting] = useState(false);

	// SanPiN 3.3686-21 Kraft package fields
	const [autoclaveName, setAutoclaveName] = useState("Euronda E9 (Автоклав №1)");
	const [sterilizationMode, setSterilizationMode] = useState("134°C / 2.1 bar / 5 мин (Универсальный)");
	const [cycleNumber, setCycleNumber] = useState("142");
	const [responsibleStaff, setResponsibleStaff] = useState("Смирнова В. П. (Медсестра ЦСО)");
	const [packageType, setPackageType] = useState<"combined_heat_seal" | "paper_single" | "paper_double">("combined_heat_seal");

	// PRP tube fields
	const [patientName, setPatientName] = useState("Иванов Иван Иванович");
	const [tubeVolume, setTubeVolume] = useState("PRP Гепарин 9.0 мл");
	const [clinicRoom, setClinicRoom] = useState("Кабинет №1 (Хирургия / Имплантация)");

	const getValidityDays = () => {
		switch (packageType) {
			case "combined_heat_seal":
				return 60; // 60 суток для термосвариваемых пакетов
			case "paper_double":
				return 50; // 50 суток
			case "paper_single":
			default:
				return 20; // 20 суток
		}
	};

	const now = new Date();
	const expirationDate = new Date(now.getTime() + getValidityDays() * 24 * 3600 * 1000);

	const handlePrintLabel = async () => {
		setIsPrinting(true);
		try {
			const printer = new HardwarePrinter();
			const testLabelHtml = `
				<div style="font-family: monospace; width: 220px; padding: 6px; border: 1px dashed black; font-size: 11px;">
					<div style="text-align: center; font-weight: bold; font-size: 12px; margin-bottom: 4px;">
						${activePreset === "kraft_sanpin" ? "СТЕРИЛЬНО (СанПиН 3.3686-21)" : "ПРОБИРКА PRP / PRF"}
					</div>
					${
						activePreset === "kraft_sanpin"
							? `
						<div>Стерилизатор: ${autoclaveName}</div>
						<div>Режим: ${sterilizationMode}</div>
						<div>Партия/Цикл: №${cycleNumber}</div>
						<div>Дата: ${now.toLocaleDateString("ru-RU")} ${now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
						<div>Срок: до ${expirationDate.toLocaleDateString("ru-RU")} (${getValidityDays()} сут.)</div>
						<div>Ответственный: ${responsibleStaff}</div>
						<div style="text-align: center; margin-top: 6px; font-weight: bold;">*SANPIN-CSO-BATCH-${cycleNumber}*</div>
					`
							: `
						<div>Пациент: <strong>${patientName}</strong></div>
						<div>Биоматериал: ${tubeVolume}</div>
						<div>Кабинет: ${clinicRoom}</div>
						<div>Забор: ${now.toLocaleDateString("ru-RU")} ${now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
						<div style="text-align: center; margin-top: 6px; font-weight: bold;">*PRP-TUBE-${now.getTime().toString().slice(-6)}*</div>
					`
					}
				</div>
			`;

			await printer.printThermalLabelHtml(testLabelHtml, {
				title: activePreset === "kraft_sanpin" ? "Этикетка СанПиН" : "Этикетка PRP",
				downloadFilename: `${activePreset}_label.html`,
			});

			showToast(
				activePreset === "kraft_sanpin"
					? "Этикетка крафт-пакета (СанПиН 3.3686-21) отправлена на принтер"
					: "Этикетка пробирки плазмолифтинга (PRP) отправлена на принтер",
				"success",
			);
		} catch (err) {
			showToast(`Ошибка печати этикетки: ${err instanceof Error ? err.message : String(err)}`, "error");
		} finally {
			setIsPrinting(false);
		}
	};

	return (
		<div className="hw-label-printer-section" data-testid="hardware-label-printer-section" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
			{/* Header */}
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "12px",
					padding: "12px 14px",
					background: "var(--paper-soft)",
					border: "1px solid var(--line)",
					borderRadius: "8px",
				}}
			>
				<div>
					<div style={{ fontWeight: 600, fontSize: "13px", color: "var(--ink)" }}>
						Принтеры этикеток (СанПиН 3.3686-21 и пробирки PRP/PRF)
					</div>
					<div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
						Прямая термопечать штрихкодов стерилизации для ЦСО и биоматериалов плазмолифтинга.
					</div>
				</div>

				{/* Template Switcher Tabs */}
				<div style={{ display: "flex", gap: "6px" }}>
					<button
						type="button"
						className={`hw-studio-category-tab ${activePreset === "kraft_sanpin" ? "active" : ""}`}
						onClick={() => setActivePreset("kraft_sanpin")}
						data-testid="label-tab-sanpin"
					>
						<ShieldCheck size={13} />
						<span>Крафт-пакеты (СанПиН)</span>
					</button>
					<button
						type="button"
						className={`hw-studio-category-tab ${activePreset === "prp_tube" ? "active" : ""}`}
						onClick={() => setActivePreset("prp_tube")}
						data-testid="label-tab-prp"
					>
						<Tag size={13} />
						<span>Пробирки PRP/PRF</span>
					</button>
				</div>
			</div>

			{/* Hardware Model & Paper Size Selectors */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
					gap: "12px",
				}}
			>
				<div className="hw-field-group">
					<label className="hw-field-label">
						<span>Модель термопринтера</span>
					</label>
					<select
						className="hw-field-select"
						value={printerModel}
						onChange={(e) => setPrinterModel(e.target.value)}
					>
						<option value="xprinter_365">Xprinter XP-365B (TSPL / USB / LAN)</option>
						<option value="godex_g500">Godex G500 / EZ120 (GEPL / USB)</option>
						<option value="tsc_te200">TSC TE200 / TDP-225 (TSPL / USB)</option>
						<option value="zebra_zd220">Zebra ZD220 / GK420t (ZPL)</option>
						<option value="windows_system">Системный драйвер печати Windows</option>
					</select>
				</div>

				<div className="hw-field-group">
					<label className="hw-field-label">
						<span>Формат самоклеящейся ленты</span>
					</label>
					<select
						className="hw-field-select"
						value={labelSize}
						onChange={(e) => setLabelSize(e.target.value)}
					>
						<option value="58x40">58 × 40 мм (Стандартная маркировка)</option>
						<option value="43x25">43 × 25 мм (Компактная для пробирок PRP)</option>
						<option value="58x60">58 × 60 мм (Расширенная для ЦСО)</option>
					</select>
				</div>
			</div>

			{/* Template Specific Form Fields */}
			{activePreset === "kraft_sanpin" ? (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
						gap: "12px",
					}}
				>
					<div className="hw-field-group">
						<label className="hw-field-label">
							<span>Стерилизатор / Автоклав</span>
						</label>
						<input
							type="text"
							className="hw-field-input"
							value={autoclaveName}
							onChange={(e) => setAutoclaveName(e.target.value)}
						/>
					</div>

					<div className="hw-field-group">
						<label className="hw-field-label">
							<span>Режим стерилизации</span>
						</label>
						<input
							type="text"
							className="hw-field-input"
							value={sterilizationMode}
							onChange={(e) => setSterilizationMode(e.target.value)}
						/>
					</div>

					<div className="hw-field-group">
						<label className="hw-field-label">
							<span>Номер цикла / партии</span>
						</label>
						<input
							type="text"
							className="hw-field-input"
							value={cycleNumber}
							onChange={(e) => setCycleNumber(e.target.value)}
						/>
					</div>

					<div className="hw-field-group">
						<label className="hw-field-label">
							<span>Тип упаковки (Срок стерильности)</span>
						</label>
						<select
							className="hw-field-select"
							value={packageType}
							onChange={(e) => setPackageType(e.target.value as any)}
						>
							<option value="combined_heat_seal">Комбинированный пакет (термосварка) — 60 суток</option>
							<option value="paper_double">Двойной крафт-пакет со скрепками — 50 суток</option>
							<option value="paper_single">Одинарный бумажный крафт-пакет — 20 суток</option>
						</select>
					</div>

					<div className="hw-field-group">
						<label className="hw-field-label">
							<span>Ответственный сотрудник ЦСО</span>
						</label>
						<input
							type="text"
							className="hw-field-input"
							value={responsibleStaff}
							onChange={(e) => setResponsibleStaff(e.target.value)}
						/>
					</div>
				</div>
			) : (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
						gap: "12px",
					}}
				>
					<div className="hw-field-group">
						<label className="hw-field-label">
							<span>ФИО пациента</span>
						</label>
						<input
							type="text"
							className="hw-field-input"
							value={patientName}
							onChange={(e) => setPatientName(e.target.value)}
						/>
					</div>

					<div className="hw-field-group">
						<label className="hw-field-label">
							<span>Тип и объем пробирки</span>
						</label>
						<input
							type="text"
							className="hw-field-input"
							value={tubeVolume}
							onChange={(e) => setTubeVolume(e.target.value)}
						/>
					</div>

					<div className="hw-field-group">
						<label className="hw-field-label">
							<span>Кабинет / Назначение</span>
						</label>
						<input
							type="text"
							className="hw-field-input"
							value={clinicRoom}
							onChange={(e) => setClinicRoom(e.target.value)}
						/>
					</div>
				</div>
			)}

			{/* Interactive Label Preview & Print Action */}
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: "16px",
					alignItems: "flex-start",
					padding: "14px",
					background: "var(--paper)",
					border: "1px solid var(--line)",
					borderRadius: "8px",
				}}
			>
				{/* Live Preview Box */}
				<div style={{ flex: 1, minWidth: "260px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, marginBottom: "8px" }}>
						<Eye size={13} />
						<span>Макет этикетки ({labelSize} мм):</span>
					</div>

					<div
						data-testid="label-preview-box"
						style={{
							padding: "10px",
							background: "white",
							color: "black",
							border: "1px dashed var(--line)",
							borderRadius: "4px",
							fontFamily: "monospace",
							fontSize: "11px",
							lineHeight: "1.4",
							maxWidth: "280px",
							boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
						}}
					>
						<div style={{ textAlign: "center", fontWeight: "bold", borderBottom: "1px solid black", paddingBottom: "2px", marginBottom: "4px" }}>
							{activePreset === "kraft_sanpin" ? "СТЕРИЛЬНО (СанПиН 3.3686-21)" : "БИОМАТЕРИАЛ PRP"}
						</div>

						{activePreset === "kraft_sanpin" ? (
							<>
								<div>Стерилизатор: {autoclaveName}</div>
								<div>Режим: {sterilizationMode}</div>
								<div>Цикл/Партия: №{cycleNumber}</div>
								<div>Дата: {now.toLocaleDateString("ru-RU")} {now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
								<div>Годен до: <strong>{expirationDate.toLocaleDateString("ru-RU")}</strong> ({getValidityDays()} сут.)</div>
								<div>Медсестра: {responsibleStaff}</div>
								<div style={{ textAlign: "center", marginTop: "6px", fontWeight: "bold", letterSpacing: "1px" }}>
									*SANPIN-BATCH-{cycleNumber}*
								</div>
							</>
						) : (
							<>
								<div>Пациент: <strong>{patientName}</strong></div>
								<div>Материал: {tubeVolume}</div>
								<div>Кабинет: {clinicRoom}</div>
								<div>Забор: {now.toLocaleDateString("ru-RU")} {now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
								<div style={{ textAlign: "center", marginTop: "6px", fontWeight: "bold", letterSpacing: "1px" }}>
									*PRP-TUBE-00142*
								</div>
							</>
						)}
					</div>
				</div>

				{/* Actions */}
				<div style={{ display: "flex", flexDirection: "column", gap: "8px", alignSelf: "center" }}>
					<button
						type="button"
						className="hw-btn-compact primary"
						onClick={handlePrintLabel}
						data-testid="label-btn-print"
						style={{ height: "34px", padding: "0 14px", fontSize: "13px" }}
					>
						<Printer size={15} className={isPrinting ? "animate-spin" : ""} />
						<span>
							{activePreset === "kraft_sanpin"
								? "Печать тестовой этикетки крафт-пакета"
								: "Печать этикетки пробирки PRP"}
						</span>
					</button>

					<div style={{ fontSize: "11px", color: "var(--muted)", maxWidth: "260px" }}>
						Соответствует ГОСТ Р ИСО 11607-1 и СанПиН 3.3686-21 для стоматологических ЦСО.
					</div>
				</div>
			</div>
		</div>
	);
}
