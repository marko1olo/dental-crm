import type { DataSet } from 'dicom-parser';
export default function getOverlayPlaneModule(dataSet: DataSet): {
    overlays: any[];
};
