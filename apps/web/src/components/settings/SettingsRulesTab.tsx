import "./SettingsRulesTab.css";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";

import { RulesDashboardSummary } from "./rules/RulesDashboardSummary";
import { RulesBuilderForm } from "./rules/RulesBuilderForm";
import { RulesLibrary } from "./rules/RulesLibrary";

export function SettingsRulesTab() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	const { dashboard } = mergedProps;

	return (
		<div className="rules-studio-container animate-fade-in">
			<RulesDashboardSummary dashboard={dashboard} />
			<RulesBuilderForm mergedProps={mergedProps} derivations={derivations} />
			<RulesLibrary mergedProps={mergedProps} derivations={derivations} />
		</div>
	);
}
