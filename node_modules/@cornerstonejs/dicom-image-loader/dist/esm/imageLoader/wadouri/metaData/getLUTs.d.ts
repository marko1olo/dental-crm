import type { Element } from 'dicom-parser';
import type { LutType } from '../../../types';
declare function getLUTs(pixelRepresentation: number, lutSequence: Element): LutType[];
export default getLUTs;
