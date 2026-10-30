import React from "react";
import type { ReactElement } from "react";
import { ScheduleUnifiedToolbar } from "../ScheduleUnifiedToolbar";
import type { ScheduleFilterStripProps } from "./types";

export function ScheduleFilterStripContent(props: ScheduleFilterStripProps): ReactElement {
	return <ScheduleUnifiedToolbar {...props} />;
}
