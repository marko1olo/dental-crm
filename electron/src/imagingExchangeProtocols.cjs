/**
 * DENTE Dental CRM — SLIDA, VDDS-Media & CLI Imaging Exchange Protocols
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const VENDOR_CLI_TEMPLATES = {
	vatech: '"{exePath}" -c {patientId}',
	sirona: '"{exePath}" /P:{patientId} /N:"{lastName}^{firstName}" /DOB:{birthDate}',
	planmeca: '"{exePath}" -p {patientId} -l "{lastName}" -f "{firstName}" -b {birthDateRaw}',
	carestream: '"{exePath}" /P:{patientId} /LN:"{lastName}" /FN:"{firstName}" /DOB:{birthDate}',
	kavo: '"{exePath}" /P:{patientId} /N:"{lastName},{firstName}"',
	woodpecker: '"{exePath}" /patient:{patientId} /name:"{lastName}"',
	eighteeth: '"{exePath}" -pid {patientId} -pname "{lastName} {firstName}"',
	owandy: '"{exePath}" -p {patientId} -n "{lastName}"',
	xpect_vision: '"{exePath}" /pid:{patientId} /tooth:{toothCode}',
	handy: '"{exePath}" /ID:{patientId} /Name:"{lastName} {firstName}"',
	trident: '"{exePath}" -patid {patientId} -patname "{lastName}"',
	newtom: '"{exePath}" -id {patientId} -name "{lastName}^{firstName}"',
	morita: '"{exePath}" /ID:{patientId} /N:"{lastName}"',
	pointnix: '"{exePath}" -p {patientId} -n "{lastName}"',
	genoray: '"{exePath}" /P:{patientId} /N:"{lastName}"',
	medit: "meditlink://open?patientId={patientId}",
	threeshape: "3shape://open?patientId={patientId}",
	shining3d: '"{exePath}" --patient-id {patientId} --name "{lastName} {firstName}"',
	panda: '"{exePath}" -pid {patientId}',
	alliedstar: '"{exePath}" /patient:{patientId}',
	runyes: '"{exePath}" -patient {patientId}',
	kyocera: '"{exePath}" /scan /dest:"{outputDir}"',
	hp: '"{exePath}" /scan /output:"{outputDir}"',
	canon_scanner: '"{exePath}" /scan /save:"{outputDir}"',
	xerox: '"{exePath}" -scan -out "{outputDir}"',
	brother: '"{exePath}" /SCAN /DIR:"{outputDir}"',
	pantum: '"{exePath}" /scan /out:"{outputDir}"',
	fujitsu_avision: '"{exePath}" /ScanToFolder:"{outputDir}"',
	canon_photo: '"{exePath}" /download /dest:"{outputDir}"',
	nikon_photo: '"{exePath}" /import /dest:"{outputDir}"',
	sony_photo: '"{exePath}" /import /folder:"{outputDir}"',
	generic: '"{exePath}" /P:{patientId}',
};

function launchSlidaExport({ vendor, targetDir, patient, format = "ini" }) {
	const outDir = targetDir || path.join(os.tmpdir(), "dente_slida_bridge");
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	const rawBirth = (patient?.birthDate || "19800101").replace(/[-.]/g, "");
	const birthDate = rawBirth.slice(0, 8);
	const action = patient?.command || "OpenPatient";
	const genderCode = patient?.gender === "F" ? "F" : "M";

	let fileName = "sidexis.ini";
	let content = "";

	if (vendor === "vatech") {
		fileName = "Link.ini";
		const fullName = [patient?.lastName, patient?.firstName, patient?.middleName].filter(Boolean).join(" ");
		content = `${[
			"[Patient]",
			`ChartNo=${patient?.patientId || "P-001"}`,
			`Name=${fullName || "Пациент"}`,
			`BirthDay=${birthDate}`,
			`Gender=${genderCode}`,
			"",
			"[Command]",
			"Execute=PatientView",
			patient?.toothCode ? `ToothNo=${patient.toothCode}` : "",
		].filter(Boolean).join("\r\n")}\r\n`;
	} else if (vendor === "planmeca" && format === "xml") {
		fileName = "RomexisLink.xml";
		content = `<?xml version="1.0" encoding="UTF-8"?>
<SlidaRequest version="1.0">
  <Patient id="${patient?.patientId || "P-001"}">
    <LastName>${patient?.lastName || ""}</LastName>
    <FirstName>${patient?.firstName || ""}</FirstName>
    <BirthDate>${birthDate}</BirthDate>
    <Sex>${genderCode}</Sex>
  </Patient>
  <Command action="${action}" />
</SlidaRequest>
`;
	} else {
		fileName = "sidexis.ini";
		const lines = [
			"[Patient]",
			`Id=${patient?.patientId || "P-001"}`,
			`LastName=${patient?.lastName || ""}`,
			`FirstName=${patient?.firstName || ""}`,
			`MiddleName=${patient?.middleName || ""}`,
			`BirthDate=${birthDate}`,
			`Sex=${genderCode}`,
			"",
			"[Destination]",
			"Application=Sidexis",
			`Action=${action}`,
		];
		if (patient?.toothCode) {
			lines.push("", "[Picture]", `Tooth=${patient.toothCode}`);
			if (patient?.modality) {
				lines.push(`Modality=${patient.modality}`);
			}
		}
		content = `${lines.join("\r\n")}\r\n`;
	}

	const exportFilePath = path.join(outDir, fileName);
	fs.writeFileSync(exportFilePath, content, "utf8");

	return {
		success: true,
		filePath: exportFilePath,
		content,
		vendor: vendor || "sirona",
	};
}

function parseSlidaIniResponse(iniContent) {
	if (!iniContent || typeof iniContent !== "string") {
		return { success: false, status: "ERROR", imagePaths: [], error: "Empty INI content" };
	}
	const lines = iniContent.split(/\r?\n/);
	let patientId;
	let toothCode;
	let modality;
	let status = "OK";
	const imagePaths = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("#") || trimmed.startsWith("[")) continue;
		const eqIndex = trimmed.indexOf("=");
		if (eqIndex === -1) continue;
		const key = trimmed.slice(0, eqIndex).trim().toLowerCase();
		const val = trimmed.slice(eqIndex + 1).trim();

		if (key === "status") status = val.toUpperCase();
		else if (key === "id" || key === "chartno" || key === "patientid") patientId = val;
		else if (key === "tooth" || key === "toothno") toothCode = val;
		else if (key === "modality") modality = val.toUpperCase();
		else if (key === "file" || key === "image" || key === "path" || key === "filepath") imagePaths.push(val);
	}

	return {
		success: status === "OK" || status === "SUCCESS",
		status,
		patientId,
		toothCode,
		modality,
		imagePaths,
	};
}

function parseSlidaXmlResponse(xmlContent) {
	if (!xmlContent || typeof xmlContent !== "string") {
		return { success: false, status: "ERROR", imagePaths: [], error: "Empty XML content" };
	}
	const statusMatch = xmlContent.match(/status=["']([^"']+)["']/i);
	const status = statusMatch ? statusMatch[1].toUpperCase() : "OK";

	const patMatch = xmlContent.match(/<Patient[^>]*id=["']([^"']+)["']/i) || xmlContent.match(/<Id>([^<]+)<\/Id>/i);
	const patientId = patMatch ? patMatch[1].trim() : undefined;

	const picToothMatch = xmlContent.match(/tooth=["']([^"']+)["']/i) || xmlContent.match(/<Tooth>([^<]+)<\/Tooth>/i);
	const toothCode = picToothMatch ? picToothMatch[1].trim() : undefined;

	const fileMatches = [];
	const fileAttrRegex = /(?:file|path|image)=["']([^"']+)["']/gi;
	let match = fileAttrRegex.exec(xmlContent);
	while (match !== null) {
		fileMatches.push(match[1]);
		match = fileAttrRegex.exec(xmlContent);
	}
	const fileTagRegex = /<(?:File|Path|Image)>([^<]+)<\/(?:File|Path|Image)>/gi;
	match = fileTagRegex.exec(xmlContent);
	while (match !== null) {
		fileMatches.push(match[1].trim());
		match = fileTagRegex.exec(xmlContent);
	}

	const modalityMatch = xmlContent.match(/modality=["']([^"']+)["']/i) || xmlContent.match(/<Modality>([^<]+)<\/Modality>/i);
	const modality = modalityMatch ? modalityMatch[1].trim().toUpperCase() : undefined;

	return {
		success: status === "OK" || status === "SUCCESS",
		status,
		patientId,
		toothCode,
		modality,
		imagePaths: Array.from(new Set(fileMatches)),
	};
}

function parseSlidaResponse(content) {
	if (!content || typeof content !== "string") {
		return { success: false, status: "ERROR", imagePaths: [], error: "Empty content" };
	}
	if (content.trim().startsWith("<")) {
		return parseSlidaXmlResponse(content);
	}
	return parseSlidaIniResponse(content);
}

function generateVddsMediaContent(patient, options = {}) {
	const version = patient?.version || "5.0";
	const returnFile = options.returnFilePath || patient?.returnFilePath || path.join(os.tmpdir(), "dente_vdds_return.ini");
	const action = patient?.action || (patient?.command === "NewImage" ? "ACQUIRE" : "SHOW");
	const rawBirth = (patient?.birthDate || "19800101").replace(/[-.]/g, "");
	let formattedBirth = "01.01.1980";
	if (rawBirth.length === 8) {
		formattedBirth = `${rawBirth.slice(6, 8)}.${rawBirth.slice(4, 6)}.${rawBirth.slice(0, 4)}`;
	}
	const genderCode = patient?.gender === "F" ? "2" : patient?.gender === "M" ? "1" : "0";
	const modalityCode = patient?.modality || "IO";

	const lines = [
		"[VDDS]",
		`Version=${version}`,
		"ProgramName=DENTE Dental CRM",
		"",
		"[Patient]",
		`ID=${patient?.patientId || "P-001"}`,
		`NAME=${patient?.lastName || "Пациент"}`,
		`VORNAME=${patient?.firstName || ""}`,
		`GEBDAT=${formattedBirth}`,
		`GESCHL=${genderCode}`,
		"",
		"[XRay]",
		`AUFNAHMEART=${modalityCode}`,
		`AKTION=${action}`,
		`RUECKGABE=${returnFile}`,
	];

	if (patient?.toothCode) {
		lines.push(`ZAHN=${patient.toothCode}`);
	}

	return `${lines.join("\r\n")}\r\n`;
}

function parseVddsMediaResponse(content) {
	if (!content || typeof content !== "string") {
		return { success: false, status: "ERROR", imagePaths: [], error: "Empty VDDS content" };
	}
	const lines = content.split(/\r?\n/);
	let patientId;
	let toothCode;
	let modality;
	let status = "SUCCESS";
	const imagePaths = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("#") || trimmed.startsWith("[")) continue;
		const eqIndex = trimmed.indexOf("=");
		if (eqIndex === -1) continue;
		const key = trimmed.slice(0, eqIndex).trim().toUpperCase();
		const val = trimmed.slice(eqIndex + 1).trim();

		if (key === "STATUS") status = val.toUpperCase();
		else if (key === "ID" || key === "PATIENTID") patientId = val;
		else if (key === "ZAHN" || key === "TOOTH") toothCode = val;
		else if (key === "AUFNAHMEART" || key === "MODALITY") modality = val.toUpperCase();
		else if (key === "FILE" || key === "DATEI" || key === "BILD" || key === "IMAGE" || key === "PATH") imagePaths.push(val);
	}

	return {
		success: status === "SUCCESS" || status === "OK" || status === "0",
		status,
		patientId,
		toothCode,
		modality,
		imagePaths,
	};
}

function launchVddsExport({ targetDir, patient, systemName, xRayType } = {}) {
	const outDir = targetDir || path.join(os.tmpdir(), "dente_vdds_bridge");
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	const returnFilePath = path.join(outDir, "dente_vdds_return.ini");
	const patientData = {
		...(patient || { patientId: "P-001", lastName: "Пациент", firstName: "Тест" }),
		modality: xRayType || patient?.modality || "IO",
	};
	const content = generateVddsMediaContent(patientData, { returnFilePath });
	const exportFilePath = path.join(outDir, "vdds_media.ini");
	fs.writeFileSync(exportFilePath, content, "utf8");

	return {
		success: true,
		filePath: exportFilePath,
		returnFilePath,
		content,
		systemName: systemName || "DENTE",
	};
}

function getVendorCliTemplate(vendor) {
	return VENDOR_CLI_TEMPLATES[vendor] || VENDOR_CLI_TEMPLATES.generic;
}

function formatCommandLineBridge(template, patient, options = {}) {
	const rawBirth = (patient?.birthDate || "19800101").replace(/[-.]/g, "");
	const birthDate = rawBirth.slice(0, 8);
	const exePath = options.exePath || "imaging_app.exe";
	const outputDir = options.outputDir || "C:\\Scans";

	let result = template
		.replace(/\{exePath\}/g, exePath)
		.replace(/\{patientId\}/g, patient?.patientId || "")
		.replace(/\{lastName\}/g, patient?.lastName || "")
		.replace(/\{firstName\}/g, patient?.firstName || "")
		.replace(/\{middleName\}/g, patient?.middleName || "")
		.replace(/\{birthDateRaw\}/g, rawBirth)
		.replace(/\{birthDate\}/g, birthDate)
		.replace(/\{gender\}/g, patient?.gender || "U")
		.replace(/\{toothCode\}/g, patient?.toothCode || "")
		.replace(/\{modality\}/g, patient?.modality || "IO")
		.replace(/\{outputDir\}/g, outputDir);

	if (options.extraArgs && options.extraArgs.length > 0) {
		result += ` ${options.extraArgs.join(" ")}`;
	}

	return result;
}

async function launchCliBridge({ vendor, exePath, patient, outputDir, extraArgs } = {}) {
	const template = getVendorCliTemplate(vendor || "generic");
	const commandLine = formatCommandLineBridge(
		template,
		patient || { patientId: "P-001", lastName: "Пациент", firstName: "Тест" },
		{ exePath, outputDir, extraArgs },
	);

	return {
		success: true,
		commandLine,
		vendor: vendor || "generic",
		launchedAt: new Date().toISOString(),
	};
}

module.exports = {
	VENDOR_CLI_TEMPLATES,
	launchSlidaExport,
	parseSlidaIniResponse,
	parseSlidaXmlResponse,
	parseSlidaResponse,
	generateVddsMediaContent,
	parseVddsMediaResponse,
	launchVddsExport,
	getVendorCliTemplate,
	formatCommandLineBridge,
	launchCliBridge,
};
