import React from "react";
import { CbctRightSidebar } from "../mpr/CbctRightSidebar.js";
import type { CbctRightSidebarProps } from "../mpr/sidebar/CbctSidebarTypes.js";

export const StudioSidebarControls: React.FC<CbctRightSidebarProps> = (props) => {
	return <CbctRightSidebar {...props} />;
};
