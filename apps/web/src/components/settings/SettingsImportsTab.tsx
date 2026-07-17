import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { ImagingImportStudio } from "./ImagingImportStudio";
import { LegacyMigrationStudio } from "./LegacyMigrationStudio";
import { SmartImportStudio } from "./SmartImportStudio";

export function SettingsImportsTab() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	const { settingsTab } = mergedProps;

	return (
		<>
			{settingsTab === "imports" ? <SmartImportStudio /> : null}
			{["imports", "sources"].includes(settingsTab) ? (
				<ImagingImportStudio />
			) : null}
			{settingsTab === "imports" ? <LegacyMigrationStudio /> : null}
		</>
	);
}
