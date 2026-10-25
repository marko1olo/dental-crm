import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { SmartOpgViewerModal } from "../SmartOpgViewerModal";
import { OdontogramToolbarMoreMenu } from "../../odontogram/OdontogramToolbarMoreMenu";

const expect = (actual: any) => ({
	toContain: (substr: string) => assert.ok(typeof actual === "string" && actual.includes(substr)),
});

describe("SMART-OPG-03: UI Modal & Odontogram Toolbar Integration", () => {
	it("renders SmartOpgViewerModal with patient name and clinical controls", () => {
		const html = renderToString(
			<SmartOpgViewerModal
				isOpen={true}
				onClose={() => {}}
				patientName="Темур"
			/>,
		);
		expect(html).toContain("Smart OPG");
		expect(html).toContain("Темур");
		expect(html).toContain("Номера FDI");
		expect(html).toContain("Патологии");
		expect(html).toContain("Для пациента");
		expect(html).toContain("Принять в зубную формулу");
	});

	it("renders Smart OPG trigger button in OdontogramToolbarMoreMenu", () => {
		const html = renderToString(
			<OdontogramToolbarMoreMenu
				isMoreMenuOpen={true}
				setIsMoreMenuOpen={() => {}}
				activeStampTool={null}
				setActiveStampTool={() => {}}
				isFastExtractMode={false}
				setIsFastExtractMode={() => {}}
				isOrthoCephOpen={false}
				setIsOrthoCephOpen={() => {}}
				isSmartOpgOpen={false}
				setIsSmartOpgOpen={() => {}}
				handleMarkIntactDentition={() => {}}
				handleMarkWisdomTeethMissing={() => {}}
				setIsPlanWizardOpen={() => {}}
				toggleVoiceEngine={() => {}}
				isVoiceListening={false}
				isPediatricEffective={false}
				setContextDrawerTooth={() => {}}
				showWisdomTeeth={true}
				setShowWisdomTeeth={() => {}}
				activeMode="anatomical_svg"
				showPulpAndCanals={false}
				setShowPulpAndCanals={() => {}}
			/>,
		);
		expect(html).toContain("btn-open-smart-opg");
		expect(html).toContain("Панорама ОПТГ AI");
	});
});
