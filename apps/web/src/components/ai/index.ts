export { DentalAgentCockpit } from "./DentalAgentCockpit";
export {
	isClinicalProtocol,
	parseSoapSectionsFromText,
	detectWorkstationEnvironment,
	getHumanToolMeta,
} from "./dentalAgentCockpitLogic";
export type {
	AgentChatMessage,
	DentalAgentCockpitProps,
	ToolCallItem,
} from "./DentalAgentCockpit";
export type SoapSectionsPatch = Record<string, string>;
export type {
	ToolMeta,
} from "./dentalAgentCockpitLogic";

import { DentalAgentCockpit } from "./DentalAgentCockpit";
export default DentalAgentCockpit;
