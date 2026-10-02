/**
 * DENTE CRM — Compatibility Shim for DicomMprSidebar
 * Sidebar functionality is integrated canonically inside CbctMprImplantStudioModal.
 */

import React from "react";

export interface DicomMprSidebarProps {
	readonly [key: string]: unknown;
}

export const DicomMprSidebar: React.FC<DicomMprSidebarProps> = () => null;
export const Ez3dMprSidebar = DicomMprSidebar;
export default DicomMprSidebar;
