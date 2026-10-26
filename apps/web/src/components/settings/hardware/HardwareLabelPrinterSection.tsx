import React, { useState } from "react";
import { HardwarePrinter } from "../../../services/hardware/HardwarePrinter.js";
import { showToast } from "../../GlobalToast.js";
import { type LabelPresetType, type PackageType, getValidityDays } from "./printer/printerTypes.js";
import { PrinterHeaderAndTabs } from "./printer/PrinterHeaderAndTabs.js";
import { PrinterModelConfig } from "./printer/PrinterModelConfig.js";
import { PrinterSanpinForm } from "./printer/PrinterSanpinForm.js";
import { PrinterPrpForm } from "./printer/PrinterPrpForm.js";
import { PrinterPreviewAndActions } from "./printer/PrinterPreviewAndActions.js";

export function HardwareLabelPrinterSection() {
	const [activePreset, setActivePreset] = useState<LabelPresetType>("kraft_sanpin");
	const [printerModel, setPrinterModel] = useState("xprinter_365");
	const [labelSize, setLabelSize] = useState("58x40");
	const [isPrinting, setIsPrinting] = useState(false);

	const [autoclaveName, setAutoclaveName] = useState("Euronda E9 (Автоклав №1)");
	const [sterilizationMode, setSterilizationMode] = useState("134°C / 2.1 bar / 5 мин (Универсальный)");
	const [cycleNumber, setCycleNumber] = useState("142");
	const [responsibleStaff, setResponsibleStaff] = useState("Смирнова В. П. (Медсестра ЦСО)");
	const [packageType, setPackageType] = useState<PackageType>("combined_heat_seal");

	const [patientName, setPatientName] = useState("Иванов Иван Иванович");
	const [tubeVolume, setTubeVolume] = useState("PRP Гепарин 9.0 мл");
	const [clinicRoom, setClinicRoom] = useState("Кабинет №1 (Хирургия / Имплантация)");

	const validityDays = getValidityDays(packageType);
	const now = new Date();
	const expirationDate = new Date(now.getTime() + validityDays * 24 * 3600 * 1000);

	const handlePrintLabel = async () => {
		setIsPrinting(true);
		try {
			const printer = new HardwarePrinter();
			const testLabelHtml = `
				<div style="font-family: monospace; width: 220px; padding: 6px; border: 1px dashed black; font-size: 11px;">
					<div style="text-align: center; font-weight: bold; font-size: 12px; margin-bottom: 4px;">
						${activePreset === "kraft_sanpin" ? "СТЕРИЛЬНО (Стерилизация упаковки)" : "ПРОБИРКА PRP / PRF"}
					</div>
					${activePreset === "kraft_sanpin" ? `
						<div>Стерилизатор: ${autoclaveName}</div>
						<div>Режим: ${sterilizationMode}</div>
						<div>Партия/Цикл: №${cycleNumber}</div>
						<div>Дата: ${now.toLocaleDateString("ru-RU")} ${now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
						<div>Срок: до ${expirationDate.toLocaleDateString("ru-RU")} (${validityDays} сут.)</div>
						<div>Ответственный: ${responsibleStaff}</div>
						<div style="text-align: center; margin-top: 6px; font-weight: bold;">*SANPIN-CSO-BATCH-${cycleNumber}*</div>
					` : `
						<div>Пациент: <strong>${patientName}</strong></div>
						<div>Биоматериал: ${tubeVolume}</div>
						<div>Кабинет: ${clinicRoom}</div>
						<div>Забор: ${now.toLocaleDateString("ru-RU")} ${now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
						<div style="text-align: center; margin-top: 6px; font-weight: bold;">*PRP-TUBE-${now.getTime().toString().slice(-6)}*</div>
					`}
				</div>
			`;

			await printer.printThermalLabelHtml(testLabelHtml, {
				title: activePreset === "kraft_sanpin" ? "Этикетка упаковки" : "Этикетка PRP",
				downloadFilename: `${activePreset}_label.html`,
			});
			showToast(activePreset === "kraft_sanpin" ? "Этикетка крафт-пакета (Стерилизация) отправлена на принтер" : "Этикетка пробирки плазмолифтинга (PRP) отправлена на принтер", "success");
		} catch (err) {
			showToast(`Ошибка печати этикетки: ${err instanceof Error ? err.message : String(err)}`, "error");
		} finally {
			setIsPrinting(false);
		}
	};

	return (
		<div className="hw-label-printer-section" data-testid="hardware-label-printer-section" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
			<PrinterHeaderAndTabs activePreset={activePreset} onPresetChange={setActivePreset} />
			<PrinterModelConfig printerModel={printerModel} labelSize={labelSize} onPrinterModelChange={setPrinterModel} onLabelSizeChange={setLabelSize} />
			{activePreset === "kraft_sanpin" ? (
				<PrinterSanpinForm autoclaveName={autoclaveName} sterilizationMode={sterilizationMode} cycleNumber={cycleNumber} packageType={packageType} responsibleStaff={responsibleStaff} onAutoclaveNameChange={setAutoclaveName} onSterilizationModeChange={setSterilizationMode} onCycleNumberChange={setCycleNumber} onPackageTypeChange={setPackageType} onResponsibleStaffChange={setResponsibleStaff} />
			) : (
				<PrinterPrpForm patientName={patientName} tubeVolume={tubeVolume} clinicRoom={clinicRoom} onPatientNameChange={setPatientName} onTubeVolumeChange={setTubeVolume} onClinicRoomChange={setClinicRoom} />
			)}
			<PrinterPreviewAndActions activePreset={activePreset} labelSize={labelSize} autoclaveName={autoclaveName} sterilizationMode={sterilizationMode} cycleNumber={cycleNumber} responsibleStaff={responsibleStaff} validityDays={validityDays} expirationDate={expirationDate} patientName={patientName} tubeVolume={tubeVolume} clinicRoom={clinicRoom} now={now} isPrinting={isPrinting} onPrintLabel={handlePrintLabel} />
		</div>
	);
}
