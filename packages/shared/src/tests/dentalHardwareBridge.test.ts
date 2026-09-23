import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	DENTAL_HARDWARE_PRESETS,
	DENTAL_PHOTO_PROTOCOL_12,
	detectHardwareVendorFromPath,
	formatCommandLineBridge,
	generateEzDentLinkContent,
	generateRomexisCliArgs,
	generateSlidaIniContent,
	generateSlidaXmlContent,
	generateVddsMediaContent,
	getHardwarePresetById,
	getHardwarePresetByVendor,
	getPresetsByFamily,
	getTwainDeviceCatalog,
	getVendorCliTemplate,
	matchPhotoProtocolSlot,
	parseHotFolderFilenameMetadata,
	parseSlidaIniResponse,
	parseSlidaResponse,
	parseSlidaXmlResponse,
	parseVddsMediaResponse,
	type SlidaPatientDescriptor,
	type VddsMediaDescriptor,
} from "../hardware/dentalHardwareBridge.js";

describe("Dental Multi-Vendor Hardware Bridge (Mandates 2, 8e, 8k, 8n)", () => {
	test("1. Presets include all 5 dental equipment families across RF/CIS (37 presets total)", () => {
		assert.equal(DENTAL_HARDWARE_PRESETS.length, 37);

		const rvgPresets = getPresetsByFamily("rvg");
		assert.ok(rvgPresets.length >= 10, "Must have at least 10 RVG presets");

		const cbctPresets = getPresetsByFamily("cbct_opg");
		assert.ok(cbctPresets.length >= 9, "Must have at least 9 CBCT/OPG presets");

		const scannerPresets = getPresetsByFamily("scanner_3d");
		assert.ok(scannerPresets.length >= 7, "Must have at least 7 3D Scanner presets");

		const docPresets = getPresetsByFamily("document_scanner");
		assert.ok(docPresets.length >= 7, "Must have at least 7 Document Scanner presets");

		const photoPresets = getPresetsByFamily("photo_protocol");
		assert.ok(photoPresets.length >= 3, "Must have at least 3 Photo Protocol presets");

		// Test lookups by ID and vendor
		const vatech = getHardwarePresetByVendor("vatech");
		assert.ok(vatech);
		assert.ok(vatech.defaultPaths.some((p) => p.includes("EzDent-i")));

		const medit = getHardwarePresetById("preset-medit-link");
		assert.ok(medit);
		assert.equal(medit.family, "scanner_3d");
		assert.equal(medit.defaultModality, "3D_SCAN");

		const sirona = getHardwarePresetByVendor("sirona");
		assert.ok(sirona);
		assert.equal(sirona.protocol, "slida");
		assert.equal(sirona.exchangeFileName, "sidexis.ini");

		const kyocera = getHardwarePresetById("preset-kyocera-taskalfa");
		assert.ok(kyocera);
		assert.equal(kyocera.family, "document_scanner");

		const canonPhoto = getHardwarePresetById("preset-canon-eos-photo");
		assert.ok(canonPhoto);
		assert.equal(canonPhoto.family, "photo_protocol");
	});

	test("2. detectHardwareVendorFromPath classifies real clinical paths correctly across all vendors", () => {
		// RVG
		assert.equal(detectHardwareVendorFromPath("C:\\EzDent-i\\Capture\\tooth_16.dcm"), "vatech");
		assert.equal(detectHardwareVendorFromPath("C:/Vatech/Data/P10293.vth"), "vatech");
		assert.equal(detectHardwareVendorFromPath("EasyDent4_patient_001.dcm"), "vatech");
		assert.equal(detectHardwareVendorFromPath("C:\\Sidexis\\incoming\\scan01.dcm"), "sirona");
		assert.equal(detectHardwareVendorFromPath("C:\\Planmeca\\Romexis\\Images\\46.dcm"), "planmeca");
		assert.equal(detectHardwareVendorFromPath("C:\\Trophy\\Data\\RVG_21.tif"), "carestream");
		assert.equal(detectHardwareVendorFromPath("C:\\VixWin\\Images\\001.jpg"), "kavo");
		assert.equal(detectHardwareVendorFromPath("woodpecker_isensor_tooth26.dcm"), "woodpecker");
		assert.equal(detectHardwareVendorFromPath("nanopix_sensor_h1.dcm"), "eighteeth");
		assert.equal(detectHardwareVendorFromPath("quickvision_export.dcm"), "owandy");
		assert.equal(detectHardwareVendorFromPath("xvsensor_11_2026.dcm"), "xpect_vision");
		assert.equal(detectHardwareVendorFromPath("handydentist_hdr600.jpg"), "handy");
		assert.equal(detectHardwareVendorFromPath("trident_iview_tooth36.dcm"), "trident");

		// CBCT / OPG
		assert.equal(detectHardwareVendorFromPath("C:\\NNT\\Data\\cbct_full.dcm"), "newtom");
		assert.equal(detectHardwareVendorFromPath("C:\\i-Dixel\\Data\\morita_x800.dcm"), "morita");
		assert.equal(detectHardwareVendorFromPath("point3d_combi_pan.dcm"), "pointnix");
		assert.equal(detectHardwareVendorFromPath("papaya3d_triana_volume.dcm"), "genoray");

		// 3D Scanners
		assert.equal(detectHardwareVendorFromPath("C:\\Medit\\Medit Link\\Scans\\case.obj"), "medit");
		assert.equal(detectHardwareVendorFromPath("C:\\3Shape\\DentalDesktop\\order.stl"), "threeshape");
		assert.equal(detectHardwareVendorFromPath("shining3d_aoralscan_upper.ply"), "shining3d");
		assert.equal(detectHardwareVendorFromPath("pandascan_bamboo_model.stl"), "panda");
		assert.equal(detectHardwareVendorFromPath("alliedstar_as200_lower.ply"), "alliedstar");
		assert.equal(detectHardwareVendorFromPath("C:\\Runyes\\Scans\\patient_maxilla.stl"), "runyes");

		// Document Scanners & MFPs
		assert.equal(detectHardwareVendorFromPath("C:\\Kyocera\\Scan\\passport.pdf"), "kyocera");
		assert.equal(detectHardwareVendorFromPath("C:\\ScanJet\\Data\\doc.tif"), "hp");
		assert.equal(detectHardwareVendorFromPath("C:\\imageRUNNER\\Data\\consent.pdf"), "canon_scanner");
		assert.equal(detectHardwareVendorFromPath("C:\\WorkCentre\\Data\\card.pdf"), "xerox");
		assert.equal(detectHardwareVendorFromPath("C:\\Brother\\Scan\\id.pdf"), "brother");
		assert.equal(detectHardwareVendorFromPath("C:\\Pantum\\Scan\\doc_001.pdf"), "pantum");
		assert.equal(detectHardwareVendorFromPath("scansnap_ix1600_agreement.pdf"), "fujitsu_avision");

		// Photo Protocol
		assert.equal(detectHardwareVendorFromPath("D:\\DCIM\\100CANON\\IMG_0001.JPG"), "canon_photo");
		assert.equal(detectHardwareVendorFromPath("E:\\DCIM\\100NIKON\\DSC_0005.JPG"), "nikon_photo");
		assert.equal(detectHardwareVendorFromPath("F:\\DCIM\\100MSDCF\\DSC00010.JPG"), "sony_photo");

		// Generic fallback
		assert.equal(detectHardwareVendorFromPath("D:\\UnsortedScans\\scan.dcm"), "generic");
		assert.equal(detectHardwareVendorFromPath(""), "generic");
	});

	test("3. generateSlidaIniContent and generateSlidaXmlContent generate valid descriptors", () => {
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

		const xml = generateSlidaXmlContent({
			patientId: "PID-4521",
			lastName: "Смирнова & Ко",
			firstName: "Елена",
			birthDate: "19881115",
			gender: "F",
			toothCode: "26",
			command: "NewImage",
		});
		assert.ok(xml.includes("<SlidaRequest version=\"1.0\">"));
		assert.ok(xml.includes("<Patient id=\"PID-4521\">"));
		assert.ok(xml.includes("<LastName>Смирнова &amp; Ко</LastName>"));
		assert.ok(xml.includes("<Sex>F</Sex>"));
		assert.ok(xml.includes("<BirthDate>1988-11-15</BirthDate>"));
		assert.ok(xml.includes("<Command action=\"NewImage\" tooth=\"26\" />"));
	});

	test("4. parseSlidaIniResponse and parseSlidaXmlResponse parse responses accurately", () => {
		const ini = `[Patient]
Id=P-7001
Tooth=46
Modality=IO
Status=OK
File=C:\\Sidexis\\Data\\P7001_46.dcm
File=C:\\Sidexis\\Data\\P7001_46.jpg`;

		const parsedIni = parseSlidaIniResponse(ini);
		assert.equal(parsedIni.success, true);
		assert.equal(parsedIni.patientId, "P-7001");
		assert.equal(parsedIni.toothCode, "46");
		assert.equal(parsedIni.modality, "IO");
		assert.equal(parsedIni.imagePaths.length, 2);

		const xml = `<?xml version="1.0" encoding="utf-8"?>
<SlidaResponse status="SUCCESS">
  <Patient id="P-8002">
    <LastName>Волков</LastName>
  </Patient>
  <Tooth>21</Tooth>
  <Modality>DX</Modality>
  <File>C:\\Romexis\\P8002_21.dcm</File>
</SlidaResponse>`;

		const parsedXml = parseSlidaResponse(xml);
		assert.equal(parsedXml.success, true);
		assert.equal(parsedXml.patientId, "P-8002");
		assert.equal(parsedXml.toothCode, "21");
		assert.equal(parsedXml.modality, "DX");
		assert.equal(parsedXml.imagePaths[0], "C:\\Romexis\\P8002_21.dcm");
	});

	test("5. generateVddsMediaContent and parseVddsMediaResponse implement VDDS-Media 5/6", () => {
		const patient: VddsMediaDescriptor = {
			patientId: "PID-2026",
			lastName: "Васильев",
			firstName: "Сергей",
			birthDate: "19850320",
			gender: "M",
			toothCode: "36",
			command: "NewImage",
			modality: "IO",
		};

		const content = generateVddsMediaContent(patient, { returnFilePath: "C:\\Temp\\return.ini" });
		assert.ok(content.includes("[VDDS]"));
		assert.ok(content.includes("Version=5.0"));
		assert.ok(content.includes("ID=PID-2026"));
		assert.ok(content.includes("NAME=Васильев"));
		assert.ok(content.includes("VORNAME=Сергей"));
		assert.ok(content.includes("GEBDAT=20.03.1985"));
		assert.ok(content.includes("GESCHL=1"));
		assert.ok(content.includes("AUFNAHMEART=IO"));
		assert.ok(content.includes("AKTION=ACQUIRE"));
		assert.ok(content.includes("ZAHN=36"));
		assert.ok(content.includes("RUECKGABE=C:\\Temp\\return.ini"));

		// Response parsing
		const response = `[VDDS]
Status=SUCCESS
ID=PID-2026
ZAHN=36
AUFNAHMEART=IO
DATEI=C:\\Data\\xray_36.dcm`;

		const parsed = parseVddsMediaResponse(response);
		assert.equal(parsed.success, true);
		assert.equal(parsed.patientId, "PID-2026");
		assert.equal(parsed.toothCode, "36");
		assert.equal(parsed.imagePaths[0], "C:\\Data\\xray_36.dcm");
	});

	test("6. formatCommandLineBridge formats templates across various vendors", () => {
		const template = getVendorCliTemplate("planmeca");
		const cmd = formatCommandLineBridge(template, {
			patientId: "PAT-007",
			lastName: "Бонд",
			firstName: "Джеймс",
			birthDate: "19700101",
		}, { exePath: "C:\\Romexis\\Romexis.exe" });

		assert.equal(cmd, '"C:\\Romexis\\Romexis.exe" -p PAT-007 -l "Бонд" -f "Джеймс" -b 19700101');

		// URL scheme format (Medit Link)
		const meditTpl = getVendorCliTemplate("medit");
		const meditCmd = formatCommandLineBridge(meditTpl, {
			patientId: "MED-555",
			lastName: "Lee",
			firstName: "Min",
		});
		assert.equal(meditCmd, "meditlink://open?patientId=MED-555");
	});

	test("7. parseHotFolderFilenameMetadata and 12-shot dental photo protocol", () => {
		// DICOM
		const dcm = parseHotFolderFilenameMetadata("CS9600_patient-901_tooth_24.dcm");
		assert.equal(dcm.fileCategory, "dicom");
		assert.equal(dcm.modality, "IO");
		assert.equal(dcm.toothCode, "24");
		assert.equal(dcm.patientId, "901");
		assert.equal(dcm.vendor, "carestream");

		// Mesh
		const mesh = parseHotFolderFilenameMetadata("maxillary_arch_patient-44.ply");
		assert.equal(mesh.fileCategory, "mesh");
		assert.equal(mesh.modality, "3D_SCAN");
		assert.equal(mesh.patientId, "44");

		// Document
		const doc = parseHotFolderFilenameMetadata("kyocera_scan_p-12_agreement.pdf");
		assert.equal(doc.fileCategory, "document");
		assert.equal(doc.modality, "DOC");
		assert.equal(doc.patientId, "12");
		assert.equal(doc.vendor, "kyocera");

		// Photo Protocol 12 Slots
		assert.equal(DENTAL_PHOTO_PROTOCOL_12.length, 12);

		const p1 = matchPhotoProtocolSlot("01_portrait_rest.jpg");
		assert.ok(p1);
		assert.equal(p1.index, 1);
		assert.equal(p1.category, "extraoral");

		const p2 = matchPhotoProtocolSlot("smile_macro_02.png");
		assert.ok(p2);

		const p10 = matchPhotoProtocolSlot("slot10_lower_arch.jpg");
		assert.ok(p10);
		assert.equal(p10.index, 10);
		assert.equal(p10.id, "intraoral_occlusal_mandibular");
	});

	test("8. getTwainDeviceCatalog returns multi-vendor sensors, scanners and document devices", () => {
		const devices = getTwainDeviceCatalog();
		assert.ok(devices.length >= 15);

		const rvg = devices.filter((d) => d.family === "rvg");
		assert.ok(rvg.length >= 8);

		const docScanners = devices.filter((d) => d.family === "document_scanner");
		assert.ok(docScanners.length >= 5);

		const pantum = devices.find((d) => d.vendor === "pantum");
		assert.ok(pantum);
		assert.equal(pantum.type, "document_scanner");
	});

	test("9. generateEzDentLinkContent and generateRomexisCliArgs for Vatech and Planmeca", () => {
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
