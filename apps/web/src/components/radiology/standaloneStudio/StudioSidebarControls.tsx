import React from "react";
import { CbctRightSidebar } from "../mpr/CbctRightSidebar.js";
import type { StudioSidebarControlsProps } from "./types.js";

export const StudioSidebarControls: React.FC<StudioSidebarControlsProps> = (props) => {
	return <CbctRightSidebar {...(props as any)} />;
};
