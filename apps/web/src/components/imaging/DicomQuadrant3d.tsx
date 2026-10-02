/**
 * DENTE CRM — Compatibility Shim for DicomQuadrant3d
 * 3D Volume Rendering is integrated canonically inside CbctMprImplantStudioModal.
 */

import React from "react";

export interface DicomQuadrant3dProps {
	readonly [key: string]: unknown;
}

export const DicomQuadrant3d: React.FC<DicomQuadrant3dProps> = () => null;
export const Ez3dQuadrant3d = DicomQuadrant3d;
export default DicomQuadrant3d;
