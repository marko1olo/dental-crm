import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	DENTAL_HARDWARE_PRESETS,
	detectHardwareVendorFromPath,
	generateEzDentLinkContent,
	generateRomexisCliArgs,
	generateSlidaIniContent,
	generateSlidaXmlContent,
	getHardwarePresetByVendor,
	type SlidaPatientDescriptor,
} from "../hardware/dentalHardwareBridge.js";

describe("Dental Multi-Vendor Hardware Bridge (Mandates 2, 8e, 8k, 8n)", () => {
	test("1. Presets include top dental vendors and scanners in RF/CIS with default paths", () => {
		assert.equal(DENTAL_HARDWARE_PRESETS.length, 8);

		const vendors = DENTAL_HARDWARE_PRESETS.map((p) => p.vendor);
		assert.ok(vendors.includes("vatech"), "Must include Vatech");
		assert.ok(vendors.includes("sirona"), "Must include Sirona");
		assert.ok(vendors.includes("planmeca"), "Must include Planmeca");
		assert.ok(vendors.includes("carestream"), "Must include Carestream");
		assert.ok(vendors.includes("kavo"), "Must include KaVo");
		assert.ok(vendors.includes("xpect_vision"), "Must include Xpect Vision");
		assert.ok(vendors.includes("runyes"), "Must include Runyes");
		assert.ok(vendors.includes("pantum"), "Must include Pantum");

		const vatech = getHardwarePresetByVendor("vatech");
		assert.ok(vatech);
		assert.ok(vatech.defaultPaths.some((p) => p.includes("EzDent-i")));

		const sirona = getHardwarePresetByVendor("sirona");
		assert.ok(sirona);
		assert.equal(sirona.protocol, "slida");
		assert.equal(sirona.exchangeFileName, "sidexis.ini");

		const runyes = getHardwarePresetByVendor("runyes");
		assert.ok(runyes);
		assert.equal(runyes.protocol, "watch_folder");
		assert.ok(runyes.defaultPaths.some((p) => p.includes("Runyes")));

		const pantum = getHardwarePresetByVendor("pantum");
		assert.ok(pantum);
		assert.equal(pantum.protocol, "watch_folder");
		assert.ok(pantum.defaultPaths.some((p) => p.includes("Pantum")));
	});

	test("2. detectHardwareVendorFromPath classifies real clinical paths correctly", () => {
		// Vatech
		assert.equal(detectHardwareVendorFromPath("C:\\EzDent-i\\Capture\\tooth_16.dcm"), "vatech");
		assert.equal(detectHardwareVendorFromPath("C:/Vatech/Data/P10293.vth"), "vatech");
		assert.equal(detectHardwareVendorFromPath("EasyDent4_patient_001.dcm"), "vatech");

		// Sirona Sidexis
		assert.equal(detectHardwareVendorFromPath("C:\\Sidexis\\incoming\\scan01.dcm"), "sirona");
		assert.equal(detectHardwareVendorFromPath("C:/PDATA/patient_images/"), "sirona");
		assert.equal(detectHardwareVendorFromPath("galileos_cbct_export.dcm"), "sirona");

		// Planmeca Romexis
		assert.equal(detectHardwareVendorFromPath("C:\\Planmeca\\Romexis\\Images\\46.dcm"), "planmeca");
		assert.equal(detectHardwareVendorFromPath("prosensor_hd_test.dcm"), "planmeca");

		// Carestream / Trophy / Kodak
		assert.equal(detectHardwareVendorFromPath("C:\\Trophy\\Data\\RVG_21.tif"), "carestream");
		assert.equal(detectHardwareVendorFromPath("C:/Program Files (x86)/Carestream/CSImaging/Data/"), "carestream");
		assert.equal(detectHardwareVendorFromPath("kodak_rvg6200_exp.dcm"), "carestream");

		// KaVo / Gendex / Instrumentarium
		assert.equal(detectHardwareVendorFromPath("C:\\VixWin\\Images\\001.jpg"), "kavo");
		assert.equal(detectHardwareVendorFromPath("C:\\CliniView\\PatientData\\"), "kavo");
		assert.equal(detectHardwareVendorFromPath("op300_axial_I0000001"), "kavo");

		// Xpect Vision CdTe
		assert.equal(detectHardwareVendorFromPath("C:\\Program Files (x86)\\XVSensor\\XVSensor\\Images\\"), "xpect_vision");
		assert.equal(detectHardwareVendorFromPath("xvsensor_11_2026.dcm"), "xpect_vision");

		// Runyes 3D Intraoral Scanner
		assert.equal(detectHardwareVendorFromPath("C:\\Runyes\\Scans\\patient_maxilla.stl"), "runyes");
		assert.equal(detectHardwareVendorFromPath("quickscan_mandible.ply"), "runyes");

		// Pantum Network Document Scanner
		assert.equal(detectHardwareVendorFromPath("C:\\Pantum\\Scan\\doc_001.pdf"), "pantum");
		assert.equal(detectHardwareVendorFromPath("pantum_scan_consent.jpg"), "pantum");

		// Generic fallback
		assert.equal(detectHardwareVendorFromPath("D:\\UnsortedScans\\scan.dcm"), "generic");
		assert.equal(detectHardwareVendorFromPath(""), "generic");
	});

	test("3. generateSlidaIniContent generates valid SLIDA INI standard", () => {
		const patient: SlidaPatientDescriptor = {
			patientId: "PID-98765",
			lastName: "Петров",
			firstName: "Алексей",
			middleName: "Сергеевич",
			birthDate: "1990-05-24",
			gender: "M",
			toothCode: "16",
			command: "OpenPatient",
			modality: "IO",
		};

		const ini = generateSlidaIniContent(patient);
		assert.ok(ini.includes("[Patient]"));
		assert.ok(ini.includes("Id=PID-98765"));
		assert.ok(ini.includes("LastName=Петров"));
		assert.ok(ini.includes("FirstName=Алексей"));
		assert.ok(ini.includes("BirthDate=19900524"));
		assert.ok(ini.includes("Sex=M"));
		assert.ok(ini.includes("[Destination]"));
		assert.ok(ini.includes("Application=Sidexis"));
		assert.ok(ini.includes("Action=OpenPatient"));
		assert.ok(ini.includes("[Picture]"));
		assert.ok(ini.includes("Tooth=16"));
		assert.ok(ini.includes("Modality=IO"));
	});

	test("4. generateSlidaXmlContent generates valid SLIDA XML", () => {
		const patient: SlidaPatientDescriptor = {
			patientId: "PID-4521",
			lastName: "Смирнова & Ко",
			firstName: "Елена",
			birthDate: "19881115",
			gender: "F",
			toothCode: "26",
			command: "NewImage",
		};

		const xml = generateSlidaXmlContent(patient);
		assert.ok(xml.includes("<SlidaRequest version=\"1.0\">"));
		assert.ok(xml.includes("<Patient id=\"PID-4521\">"));
		assert.ok(xml.includes("<LastName>Смирнова &amp; Ко</LastName>"));
		assert.ok(xml.includes("<Sex>F</Sex>"));
		assert.ok(xml.includes("<BirthDate>1988-11-15</BirthDate>"));
		assert.ok(xml.includes("<Command action=\"NewImage\" tooth=\"26\" />"));
	});

	test("5. generateEzDentLinkContent and generateRomexisCliArgs for Vatech and Planmeca", () => {
		const patient: SlidaPatientDescriptor = {
			patientId: "P-101",
			lastName: "Кузнецов",
			firstName: "Игорь",
			middleName: "Петрович",
			birthDate: "19750802",
			gender: "M",
			toothCode: "46",
		};

		const ezDent = generateEzDentLinkContent(patient);
		assert.ok(ezDent.includes("ChartNo=P-101"));
		assert.ok(ezDent.includes("Name=Кузнецов Игорь Петрович"));
		assert.ok(ezDent.includes("ToothNo=46"));
		assert.ok(ezDent.includes("Execute=PatientView"));

		const romexisArgs = generateRomexisCliArgs(patient);
		assert.deepEqual(romexisArgs, [
			"-p",
			"P-101",
			"-l",
			"Кузнецов",
			"-f",
			"Игорь",
			"-b",
			"19750802",
		]);
	});
});
