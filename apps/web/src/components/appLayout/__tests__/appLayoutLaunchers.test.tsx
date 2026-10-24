import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderSpecializedClinicalLaunchers } from "../modalsContainerModules/standalone/SpecializedClinicalLaunchers";
import { renderSpecializedAdministrativeLaunchers } from "../modalsContainerModules/standalone/SpecializedAdministrativeLaunchers";
import type { StandaloneLaunchersProps } from "../modalsContainerModules/modalsContainerTypes";

/**
 * Лаунчеры — тонкие URL-роутеры: пациент и данные приходят из ?patientId= и API,
 * а не из пропсов (старые patientId/patientName-пропсы выжжены как фейки).
 * Дефолтный роут без токенов обязан возвращать null и не ронять рендер.
 */
const baseProps: StandaloneLaunchersProps = {
	isCbctTunerOpen: false,
	setIsCbctTunerOpen: () => {},
	isCbctDirectModalOpen: false,
	setIsCbctDirectModalOpen: () => {},
	isConsentDirectModalOpen: false,
	setIsConsentDirectModalOpen: () => {},
	isCephDirectModalOpen: false,
	setIsCephDirectModalOpen: () => {},
	isEgiszRemdModalOpen: false,
	setIsEgiszRemdModalOpen: () => {},
};

describe("Specialized Launchers Unit Tests", () => {
	it("renderSpecializedClinicalLaunchers executes cleanly in default route", () => {
		const result = renderSpecializedClinicalLaunchers({ ...baseProps });
		assert.equal(result, null);
	});

	it("renderSpecializedAdministrativeLaunchers executes cleanly in default route", () => {
		const result = renderSpecializedAdministrativeLaunchers({
			...baseProps,
			isSbpDirectModalOpen: false,
			setIsSbpDirectModalOpen: () => {},
		});
		assert.equal(result, null);
	});
});
