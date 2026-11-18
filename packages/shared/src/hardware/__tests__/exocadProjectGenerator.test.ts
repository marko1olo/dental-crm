/**
 * @dental/shared/hardware - Exocad Lab Project Generator Unit Tests.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	generateExocadDentalProjectXml,
	generateExocadConstructionInfoJson,
	type ExocadProjectOptions,
} from "../exocadProjectGenerator.js";

describe("Exocad DentalProject XML and JSON Generator", () => {
	const sampleProject: ExocadProjectOptions = {
		projectId: "proj-scan-12345",
		patientFullName: "Иванов Иван Иванович",
		patientExternalId: "pat-999",
		doctorFullName: "Д-р Смирнов А.В.",
		technicianFullName: "Техник Орлов М.С.",
		clinicName: "Клиника ДЕНТЕ Элит",
		notes: "Анатомическая коронка на оксиде циркония с индивидуализацией",
		upperMeshFileName: "UpperJaw_Scan.stl",
		lowerMeshFileName: "LowerJaw_Scan.stl",
		biteMeshFileName: "VestibularBite.stl",
		prepMeshFileName: "PrepDie_16.stl",
		scanbodyMeshFileName: "Scanbody_26.stl",
		occlusionMatrix: [
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1,
		],
		teeth: [
			{
				toothFdi: 16,
				restorationType: "anatomic_crown",
				material: "zirconia",
				shade: "A2",
				antagonistToothFdi: 46,
				marginLinePoints: [
					[10.5, 5.2, -1.3],
					[11.2, 5.4, -1.4],
					[11.8, 5.1, -1.5],
				],
			},
			{
				toothFdi: 21,
				restorationType: "veneer",
				material: "emax_cad",
				shade: "A1",
			},
			{
				toothFdi: 26,
				restorationType: "implant_abutment",
				material: "titanium",
				shade: "A2",
			},
		],
	};

	it("1. Generates valid XML with all metadata, meshes, teeth, and margin lines", () => {
		const xml = generateExocadDentalProjectXml(sampleProject);

		assert.ok(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>'));
		assert.ok(xml.includes('<DentalProject Version="2.0">'));
		assert.ok(xml.includes("<ProjectId>proj-scan-12345</ProjectId>"));
		assert.ok(xml.includes('Patient Name="Иванов Иван Иванович" ExternalId="pat-999"'));
		assert.ok(xml.includes('Practice Name="Клиника ДЕНТЕ Элит" Doctor="Д-р Смирнов А.В."'));
		assert.ok(xml.includes('Scan Type="UpperJaw" FileName="UpperJaw_Scan.stl"'));
		assert.ok(xml.includes('Scan Type="LowerJaw" FileName="LowerJaw_Scan.stl"'));
		assert.ok(xml.includes('Scan Type="PreparationDie" FileName="PrepDie_16.stl"'));

		// Tooth 16 (Crown)
		assert.ok(xml.includes('Tooth Number="16" ReconstructionType="anatomic_crown" Material="zirconia" Shade="A2" AntagonistNumber="46"'));
		assert.ok(xml.includes('<MarginLine Count="3">'));
		assert.ok(xml.includes('Point X="10.500" Y="5.200" Z="-1.300"'));

		// Tooth 21 (Veneer)
		assert.ok(xml.includes('Tooth Number="21" ReconstructionType="veneer" Material="emax_cad" Shade="A1"'));

		// Tooth 26 (Abutment)
		assert.ok(xml.includes('Tooth Number="26" ReconstructionType="implant_abutment" Material="titanium"'));

		// Matrix
		assert.ok(xml.includes("<OcclusionTransformationMatrix>"));
	});

	it("2. Escapes special XML characters in patient names and notes", () => {
		const xml = generateExocadDentalProjectXml({
			projectId: "escape-test",
			patientFullName: "Тест <&> 'Кавычки' \"Двойные\"",
			notes: "Заметка 1 < Заметка 2 & 3 > 0",
			teeth: [{ toothFdi: 11, restorationType: "healthy" }],
		});

		assert.ok(xml.includes('Patient Name="Тест &lt;&amp;&gt; &apos;Кавычки&apos; &quot;Двойные&quot;"'));
		assert.ok(xml.includes("<Notes>Заметка 1 &lt; Заметка 2 &amp; 3 &gt; 0</Notes>"));
	});

	it("3. Generates parseable constructionInfo JSON structure", () => {
		const jsonStr = generateExocadConstructionInfoJson(sampleProject);
		const parsed = JSON.parse(jsonStr);

		assert.equal(parsed.projectId, "proj-scan-12345");
		assert.equal(parsed.patientName, "Иванов Иван Иванович");
		assert.equal(parsed.files.upper, "UpperJaw_Scan.stl");
		assert.equal(parsed.files.lower, "LowerJaw_Scan.stl");
		assert.equal(parsed.teeth.length, 3);
		assert.equal(parsed.teeth[0].toothNumber, 16);
		assert.equal(parsed.teeth[0].type, "anatomic_crown");
		assert.equal(parsed.teeth[0].material, "zirconia");
		assert.equal(parsed.teeth[0].marginLineCount, 3);
	});
});
