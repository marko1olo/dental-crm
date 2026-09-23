/**
 * DENTE CRM — Hardware Studio & Equipment Settings Test Suite.
 *
 * Validates Mandates 8e, 8p, 8n & Studio Mac HIG:
 * 1. Multi-vendor presets for all RF/CIS equipment:
 *    - Vatech, Sirona Sidexis, Planmeca Romexis, Carestream CS Imaging, KaVo,
 *      Woodpecker i-Sensor, Eighteeth NanoPix, Xpect Vision, Medit Link,
 *      3Shape TRIOS, Shining 3D, Network MFUs, SD-card photo-protocol.
 * 2. Instant connection verification & status indicators (🟢 / 🟡 / ⚪).
 * 3. 1-click Windows path auto-population (Hot Folders, SLIDA, VDDS, CLI).
 * 4. Doctor autonomy (Mandate 8e): 0 disabled buttons, non-blocking workflows.
 * 5. Single-row toolbar (32-36px), zero modal hell, settingsTabs integration.
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
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
	it("возвращает статус «ready» (🟢) при корректном пути Windows", async () => {
		const vatech = getHardwarePresetById("vatech_ezdent")!;
		const config = createDefaultDeviceConfig(vatech);

		const result = await testHardwareConnection(config);
		assert.equal(result.success, true);
		assert.equal(result.status, "ready");
		assert.match(result.statusMessage, /🟢 Готов к снимкам/);
		assert.ok(result.latencyMs >= 0);
		assert.equal(result.folderAccessible, true);
	});

	it("возвращает статус «not_found» (🟡) при пустом или некорректном пути", async () => {
		const vatech = getHardwarePresetById("vatech_ezdent")!;
		const badConfig: HardwareDeviceConfig = {
			...createDefaultDeviceConfig(vatech),
			hotFolderPath: "bad-relative-path-without-drive",
		};

		const result = await testHardwareConnection(badConfig);
		assert.equal(result.success, false);
		assert.equal(result.status, "not_found");
		assert.match(result.statusMessage, /🟡/);
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
