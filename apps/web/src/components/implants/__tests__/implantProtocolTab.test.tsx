import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ImplantPassportModal } from "../ImplantPassportModal";
import { ImplantProtocolTab } from "../ImplantProtocolTab";

describe("Implant Protocol Tab & Express Protocols", () => {
	it("21. ImplantProtocolTab renders 1-click standard surgical protocol preset banner", () => {
		const html = renderToString(<ImplantPassportModal isOpen={true} onClose={() => {}} initialTooth={46} />);
		assert.ok(html.includes("banner-standard-protocol-preset"));
		assert.ok(html.includes("btn-apply-standard-protocol"));
		assert.ok(html.includes("Хирургический экспресс-протокол"));
		assert.ok(html.includes("1 клик"));
		assert.ok(html.includes("0.9% NaCl"));
		assert.ok(html.includes("Викрил 4-0"));
	});

	it("22. ImplantProtocolTab renders tactile quick torque buttons for gloved operation", () => {
		const html = renderToString(<ImplantPassportModal isOpen={true} onClose={() => {}} initialTooth={46} />);
		assert.ok(html.includes("btn-quick-torque-15"));
		assert.ok(html.includes("btn-quick-torque-25"));
		assert.ok(html.includes("btn-quick-torque-35"));
		assert.ok(html.includes("btn-quick-torque-45"));
		assert.ok(html.includes("btn-quick-torque-50"));
	});

	it("29. ImplantProtocolTab renders 4 distinct 1-click clinical protocol presets", () => {
		const html = renderToString(
			<ImplantProtocolTab
				toothFdi={46} handleToothSelect={() => {}} boneDensity="D2" setBoneDensity={() => {}}
				scannedBarcode="" setScannedBarcode={() => {}} handleApplyBarcode={() => {}}
				isGbrPerformed={false} setIsGbrPerformed={() => {}} capType="fdm" setCapType={() => {}}
				selectedBrand="Osstem" handleBrandSelect={() => {}} diameterMm={4.0} setDiameterMm={() => {}}
				lengthMm={10.0} setLengthMm={() => {}} torqueNcm={35} setTorqueNcm={() => {}}
				lotNumber="24C1208" setLotNumber={() => {}} catalogArticle="TS3S4010S" setCatalogArticle={() => {}}
				serialNumber="SN-884210" setSerialNumber={() => {}} isOverdraftActive={false}
			/>,
		);
		assert.ok(html.includes("btn-apply-standard-protocol"));
		assert.ok(html.includes("btn-apply-immediate-protocol"));
		assert.ok(html.includes("btn-apply-twostage-protocol"));
		assert.ok(html.includes("btn-apply-gbr-protocol"));
		assert.ok(html.includes("Немедленная нагрузка"));
		assert.ok(html.includes("Двухэтапная заглушка"));
		assert.ok(html.includes("Костная пластика (НКР)"));
	});

	it("34. ImplantProtocolTab packaging section supports 1-click default autofill without laser gimmicks", () => {
		const html = renderToString(
			<ImplantProtocolTab
				toothFdi={46} handleToothSelect={() => {}} boneDensity="D2" setBoneDensity={() => {}}
				scannedBarcode="" setScannedBarcode={() => {}} handleApplyBarcode={() => {}}
				isGbrPerformed={false} setIsGbrPerformed={() => {}} capType="fdm" setCapType={() => {}}
				selectedBrand="Osstem" handleBrandSelect={() => {}} diameterMm={4.0} setDiameterMm={() => {}}
				lengthMm={10.0} setLengthMm={() => {}} torqueNcm={35} setTorqueNcm={() => {}}
				lotNumber="24C1208" setLotNumber={() => {}} catalogArticle="TS3S4010S" setCatalogArticle={() => {}}
				serialNumber="SN-884210" setSerialNumber={() => {}} isOverdraftActive={false}
			/>,
		);
		assert.ok(html.includes("btn-autofill-packaging"));
		assert.ok(html.includes("По умолчанию"));
		assert.ok(html.includes("input-lot-number"));
		assert.ok(!html.includes("laser-beam"));
	});
});
