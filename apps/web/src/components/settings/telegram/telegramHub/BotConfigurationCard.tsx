import React from "react";
import type { BotConfigurationCardProps } from "./types";
import { BotConfigurationContainer } from "./botConfiguration/BotConfigurationContainer";

export function BotConfigurationCard(props: BotConfigurationCardProps) {
	return <BotConfigurationContainer {...props} />;
}
