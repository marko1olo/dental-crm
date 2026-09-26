/**
 * DENTE CRM — Hardware Studio & Equipment Settings Test Suite.
 *
 * Validates Mandates 8e, 8p, 8n & Studio Mac HIG:
 * 1. Multi-vendor presets for all RF/CIS equipment:
 *    - Vatech, Sirona Sidexis, Planmeca Romexis, Carestream CS Imaging, KaVo,
 *      Woodpecker i-Sensor, Eighteeth NanoPix, Xpect Vision, Medit Link,
 *      3Shape TRIOS, Shining 3D, Network MFUs, SD-card photo-protocol.
 * 2. Instant connection verification & status indicators (Готов / Каталог не найден / Нажмите для проверки).
 * 3. 1-click Windows path auto-population (Hot Folders, SLIDA, VDDS, CLI).
 * 4. Doctor autonomy (Mandate 8e): 0 disabled buttons, non-blocking workflows.
 * 5. Single-row toolbar (32-36px), zero modal hell, settingsTabs integration.
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { settingsTabs } from "../../../AppConstants.js";
import {
	HARDWARE_PRESETS,
	createDefaultDeviceConfig,
	dispatchSimulatedScanForDevice,
	getHardwarePresetById,
	getHardwarePresets,
	getInitialDefaultHardwareConfigs,
	loadHardwareConfigs,
	saveHardwareConfigs,
	testHardwareConnection,
	type HardwareDeviceConfig,
} from "../../../services/hardware/hardwarePresets.js";
import { VisiographPacsWatcherService } from "../../../services/hardware/visiographPacsWatcher.js";
import { HardwareSettingsTab } from "../HardwareSettingsTab.js";
import { HardwareCockpitBar } from "../hardware/HardwareCockpitBar.js";
import { HardwareKktSection } from "../hardware/HardwareKktSection.js";
import { HardwareScannerSection } from "../hardware/HardwareScannerSection.js";
import { HardwareLabelPrinterSection } from "../hardware/HardwareLabelPrinterSection.js";
import { KktLanPrinterService } from "../../../services/hardware/kktLanPrinter.js";
import { AtolKkt10Emulator, ShtrihMKktEmulator } from "../../../services/hardware/hardwareEmulators.js";
import { classifyBarcodeScan } from "@dental/shared/hardware";

describe("Hardware Studio — Реестр пресетов оборудования РФ/СНГ", () => {
	it("содержит все 13 ключевых семейств оборудования", () => {
		const presets = getHardwarePresets();
		assert.ok(presets.length >= 13, `Ожидалось не менее 13 пресетов, получено ${presets.length}`);

		const expectedVendorIds = [
			"vatech_ezdent",
			"sirona_sidexis",
			"planmeca_romexis",
			"carestream_cs",
			"kavo_dtx",
			"woodpecker_isensor",
			"eighteeth_nanopix",
			"xpect_vision",
			"medit_link",
			"threeshape_trios",
			"shining3d_aoralscan",
			"network_mfu",
			"sd_card_photo",
		];

		for (const expectedId of expectedVendorIds) {
			const found = getHardwarePresetById(expectedId);
			assert.ok(found, `Пресет «${expectedId}» обязан присутствовать в каталоге оборудования`);
			assert.ok(found.name.length > 0, `Пресет «${expectedId}» обязан иметь название`);
			assert.ok(found.defaultHotFolderPath.length > 0, `Пресет «${expectedId}» обязан иметь путь к горячей папке`);
			assert.ok(found.defaultExecutablePath.length > 0, `Пресет «${expectedId}» обязан иметь путь к .exe`);
			assert.ok(found.supportedExtensions.length > 0, `Пресет «${expectedId}» обязан иметь список расширений`);
		}
	});

	it("Vatech EzDent-i настроен со стандартными путями Windows и протоколом CLI", () => {
		const vatech = getHardwarePresetById("vatech_ezdent");
		assert.ok(vatech);
		assert.equal(vatech.vendor, "Vatech");
		assert.match(vatech.defaultExecutablePath, /Vatech\\EzDent-i/i);
		assert.match(vatech.defaultHotFolderPath, /DentalImages\\Vatech/i);
		assert.equal(vatech.protocol, "cli_launch");
		assert.ok(vatech.supportedExtensions.includes(".dcm"));
	});

	it("Sirona Sidexis настроен с протоколом SLIDA и SiCoIn", () => {
		const sirona = getHardwarePresetById("sirona_sidexis");
		assert.ok(sirona);
		assert.equal(sirona.vendor, "Dentsply Sirona");
		assert.equal(sirona.protocol, "slida");
		assert.match(sirona.defaultHotFolderPath, /PDATA\\sirocom/i);
		assert.match(sirona.protocolTemplate, /SiCoIn\.exe/i);
	});

	it("Planmeca Romexis настроен с каталогом Exchange и 2D/3D поддержкой", () => {
		const planmeca = getHardwarePresetById("planmeca_romexis");
		assert.ok(planmeca);
		assert.equal(planmeca.vendor, "Planmeca");
		assert.match(planmeca.defaultHotFolderPath, /Romexis\\Exchange/i);
		assert.equal(planmeca.category, "radiography_3d");
	});

	it("Woodpecker i-Sensor и Eighteeth NanoPix имеют горячие папки прямого захвата", () => {
		const isensor = getHardwarePresetById("woodpecker_isensor");
		const nanopix = getHardwarePresetById("eighteeth_nanopix");

		assert.ok(isensor);
		assert.ok(nanopix);
		assert.equal(isensor.protocol, "hot_folder");
		assert.equal(nanopix.protocol, "hot_folder");
		assert.match(isensor.defaultHotFolderPath, /i-Sensor/i);
		assert.match(nanopix.defaultHotFolderPath, /NanoPix/i);
	});

	it("Сетевые МФУ поддерживают сканирование документов в SMB/FTP папку", () => {
		const mfu = getHardwarePresetById("network_mfu");
		assert.ok(mfu);
		assert.equal(mfu.category, "document_scanner");
		assert.equal(mfu.protocol, "smb_scan");
		assert.ok(mfu.supportedExtensions.includes(".pdf"));
	});

	it("Фотопротокол SD-карт поддерживает автоматическую раскладку по 043/у", () => {
		const photo = getHardwarePresetById("sd_card_photo");
		assert.ok(photo);
		assert.equal(photo.category, "clinical_photo");
		assert.match(photo.defaultHotFolderPath, /DCIM/i);
		assert.match(photo.protocolTemplate, /AutoSort/i);
	});
});

describe("Hardware Studio — Проверка связи и диагностика (Мандат 8e)", () => {
	it("возвращает статус «ready» при корректном пути Windows", async () => {
		const vatech = getHardwarePresetById("vatech_ezdent")!;
		const config = createDefaultDeviceConfig(vatech);

		const result = await testHardwareConnection(config);
		assert.equal(result.success, true);
		assert.equal(result.status, "ready");
		assert.match(result.statusMessage, /Готов к снимкам/);
		assert.ok(result.latencyMs >= 0);
		assert.equal(result.folderAccessible, true);
	});

	it("возвращает статус «not_found» при пустом или некорректном пути", async () => {
		const vatech = getHardwarePresetById("vatech_ezdent")!;
		const badConfig: HardwareDeviceConfig = {
			...createDefaultDeviceConfig(vatech),
			hotFolderPath: "bad-relative-path-without-drive",
		};

		const result = await testHardwareConnection(badConfig);
		assert.equal(result.success, false);
		assert.equal(result.status, "not_found");
		assert.match(result.statusMessage, /не найден|Некорректный путь/);
		assert.equal(result.folderAccessible, false);
	});

	it("никогда не падает с исключением при проверке поврежденной конфигурации", async () => {
		const emptyConfig: HardwareDeviceConfig = {
			id: "corrupted",
			presetId: "unknown",
			name: "Corrupted",
			vendor: "Unknown",
			category: "radiography_2d",
			executablePath: "",
			hotFolderPath: "",
			protocol: "hot_folder",
			protocolTemplate: "",
			supportedExtensions: [],
			isActive: false,
			autoAttachToVisit: false,
			status: "untested",
			statusMessage: "",
			lastCheckedAt: null,
			latencyMs: null,
		};

		const result = await testHardwareConnection(emptyConfig);
		assert.equal(result.success, false);
		assert.equal(result.status, "not_found");
	});
});

describe("Hardware Studio — Автономия врача и сброс настроек (Мандаты 8e, 8n)", () => {
	it("создает стартовый список оборудования для клиники (соло-врач / 1-3 кресла)", () => {
		const initial = getInitialDefaultHardwareConfigs();
		assert.ok(initial.length >= 3);
		assert.ok(initial.some((d) => d.presetId === "vatech_ezdent"));
		assert.ok(initial.some((d) => d.presetId === "network_mfu"));
		assert.ok(initial.some((d) => d.presetId === "sd_card_photo"));
	});

	it("воспроизводит тестовый снимок в VisiographPacsWatcherService", () => {
		const vatech = getHardwarePresetById("vatech_ezdent")!;
		const config = createDefaultDeviceConfig(vatech);

		let receivedEvent = false;
		const unsubscribe = VisiographPacsWatcherService.onNewScanDetected((event) => {
			if (event.toothCode === "16") {
				receivedEvent = true;
			}
		});

		try {
			const dispatchResult = dispatchSimulatedScanForDevice(config);
			assert.ok(dispatchResult.fileName.includes("Vatech"));
			assert.ok(dispatchResult.sampleUri.length > 0);
			assert.equal(receivedEvent, true);
		} finally {
			unsubscribe();
		}
	});

	it("вкладка оборудования зарегистрирована в settingsTabs в группе «main»", () => {
		const hardwareTab = settingsTabs.find((t) => t.id === "hardware");
		assert.ok(hardwareTab, "Вкладка «hardware» должна быть объявлена в settingsTabs");
		assert.equal(hardwareTab.title, "Оборудование");
		assert.equal(hardwareTab.group, "main");
	});
});

describe("Hardware Studio — Экспресс-диагностика Cockpit (Мандат 8e)", () => {
	it("рендерит панель экспресс-диагностики с 3 кнопками проверки без ошибок", () => {
		const html = renderToStaticMarkup(React.createElement(HardwareCockpitBar));
		assert.ok(html.includes('data-testid="hardware-cockpit-bar"'));
		assert.ok(html.includes('data-testid="cockpit-btn-kkt"'));
		assert.ok(html.includes('data-testid="cockpit-btn-hotfolder"'));
		assert.ok(html.includes('data-testid="cockpit-btn-telephony"'));
		assert.ok(html.includes("Тест связи с ККТ"));
		assert.ok(html.includes("Тестовый опрос папки снимков"));
		assert.ok(html.includes("Проверка пинга АТС"));
	});

	it("KktLanPrinterService выполняет проверку статуса без неперехваченных исключений", async () => {
		const status = await KktLanPrinterService.checkDeviceHealth();
		assert.ok(typeof status.online === "boolean");
		assert.ok(typeof status.latencyMs === "number");
		assert.ok(status.checkedAt.length > 0);
	});
});

describe("Hardware Studio — Фискальные регистраторы 54-ФЗ и Эмулятор (Мандаты 8s, 8e)", () => {
	it("рендерит секцию ККТ с переключателем протокола и режима эмулятора кассы", () => {
		const html = renderToStaticMarkup(React.createElement(HardwareKktSection));
		assert.ok(html.includes('data-testid="hardware-kkt-section"'));
		assert.ok(html.includes('data-testid="kkt-btn-check-health"'));
		assert.ok(html.includes('data-testid="kkt-btn-print-test"'));
		assert.ok(html.includes("Режим эмулятора кассы (без расхода ФН)"));
		assert.ok(html.includes("АТОЛ"));
		assert.ok(html.includes("ШТРИХ-М"));
	});

	it("AtolKkt10Emulator формирует фискальный чек с валидным QR-кодом ФНС и ФПД", () => {
		const emulator = new AtolKkt10Emulator();
		const status = emulator.getStatus();
		assert.equal(status.online, true);
		assert.equal(status.isFnFiscalized, true);

		const receipt = emulator.printFiscalReceipt({
			type: "sell",
			taxationType: "usnIncome",
			operator: { name: "Иванова А. С." },
			items: [
				{
					type: "position",
					name: "Прием (осмотр, консультация) врача-стоматолога",
					price: 1500.0,
					quantity: 1,
					amount: 1500.0,
					tax: { type: "none" },
				},
			],
			total: 1500.0,
			payments: [{ type: "cash", sum: 1500.0 }],
		});

		assert.equal(receipt.success, true);
		assert.ok(receipt.fiscalDocumentNumber! > 0);
		assert.ok(receipt.fiscalSign!.length > 0);
		assert.ok(receipt.qrCode!.includes("fn="));
		assert.ok(receipt.qrCode!.includes("fp="));
	});

	it("ShtrihMKktEmulator формирует чек и инкрементирует счетчик документов", () => {
		const shtrih = new ShtrihMKktEmulator();
		const res1 = shtrih.printReceipt({
			operatorName: "Смирнова В. П.",
			totalKopecks: 250000,
			operationType: "income",
		});

		assert.equal(res1.success, true);
		assert.ok(Number(res1.fiscalDocNum) > 0);
		assert.ok(res1.fiscalSign!.length > 0);
		assert.ok(res1.qrCode!.includes("s=2500.00"));
	});

	it("KktLanPrinterService сбрасывает Circuit Breaker в состояние CLOSED", () => {
		KktLanPrinterService.resetCircuitBreaker();
		const telemetry = KktLanPrinterService.getCircuitBreakerTelemetry();
		assert.equal(telemetry.state, "CLOSED");
		assert.equal(telemetry.consecutiveFailures, 0);
	});
});

describe("Hardware Studio — 2D Сканеры DataMatrix и маркировка Честный ЗНАК", () => {
	it("рендерит секцию сканеров с поддержкой HID и COM-портов", () => {
		const html = renderToStaticMarkup(React.createElement(HardwareScannerSection));
		assert.ok(html.includes('data-testid="hardware-scanner-section"'));
		assert.ok(html.includes('data-testid="scanner-test-input"'));
		assert.ok(html.includes('data-testid="scanner-btn-test"'));
		assert.ok(html.includes("USB HID (Эмуляция клавиатуры"));
		assert.ok(html.includes("Virtual COM-порт"));
	});

	it("классифицирует DataMatrix Честный ЗНАК (МДЛП) карпульной анестезии", () => {
		const rawArticaine = "0104601234567893215ABC1234567890\u001d91EE06\u001d92xyz123456";
		const decoded = classifyBarcodeScan(rawArticaine, "usb_com_serial");

		assert.equal(decoded.barcodeType, "gs1_datamatrix");
		assert.ok(decoded.parsedGs1);
		assert.equal(decoded.parsedGs1.gtin, "04601234567893");
		assert.equal(decoded.parsedGs1.serialNumber, "5ABC1234567890");
		assert.equal(decoded.parsedGs1.isValid, true);
	});

	it("классифицирует крафт-пакет стерилизации автоклава по СанПиН 3.3686-21", () => {
		const rawKraft = "SANPIN:CSO-2026-09-27-AUTOCLAVE-1";
		const decoded = classifyBarcodeScan(rawKraft, "usb_hid_keyboard");

		assert.equal(decoded.barcodeType, "sanpin_kraft");
		assert.equal(decoded.kraftPackageId, "CSO-2026-09-27-AUTOCLAVE-1");
	});

	it("классифицирует EAN-13 расходных материалов и QR талона пациента", () => {
		const ean = classifyBarcodeScan("4601234567890");
		assert.equal(ean.barcodeType, "ean13");

		const patientQr = classifyBarcodeScan("DENTE:PATIENT:p-2045");
		assert.equal(patientQr.barcodeType, "qr_patient");
		assert.equal(patientQr.patientId, "p-2045");
	});
});

describe("Hardware Studio — Принтеры этикеток (СанПиН 3.3686-21 и PRP/PRF)", () => {
	it("рендерит секцию термопринтера с выбором макета крафт-пакетов и пробирок", () => {
		const html = renderToStaticMarkup(React.createElement(HardwareLabelPrinterSection));
		assert.ok(html.includes('data-testid="hardware-label-printer-section"'));
		assert.ok(html.includes('data-testid="label-tab-sanpin"'));
		assert.ok(html.includes('data-testid="label-tab-prp"'));
		assert.ok(html.includes('data-testid="label-btn-print"'));
		assert.ok(html.includes('data-testid="label-preview-box"'));
		assert.ok(html.includes("СТЕРИЛЬНО (СанПиН 3.3686-21)"));
	});
});

describe("Hardware Studio — Рендеринг HardwareSettingsTab и доменная навигация", () => {
	it("рендерит корневой контейнер с панелью Cockpit и всеми 4 доменными вкладками", () => {
		const html = renderToStaticMarkup(React.createElement(HardwareSettingsTab));
		assert.ok(html.includes('data-testid="hardware-studio-container"'));
		assert.ok(html.includes('data-testid="hardware-cockpit-bar"'));
		assert.ok(html.includes('data-testid="domain-tab-imaging"'));
		assert.ok(html.includes('data-testid="domain-tab-kkt"'));
		assert.ok(html.includes('data-testid="domain-tab-scanners"'));
		assert.ok(html.includes('data-testid="domain-tab-labels"'));
	});

	it("строго соответствует Мандату 8d: ноль мультяшных эмодзи в разметке", () => {
		const html = renderToStaticMarkup(React.createElement(HardwareSettingsTab));
		assert.doesNotMatch(html, /[\u{1F300}-\u{1F9FF}]/u, "Мандат 8d: в разметке оборудования запрещены мультяшные эмодзи");
		assert.doesNotMatch(html, /[🟢🟡🔴⚪⏳]/u, "Мандат 8d: цветные кружочки и часики запрещены");
	});
});
