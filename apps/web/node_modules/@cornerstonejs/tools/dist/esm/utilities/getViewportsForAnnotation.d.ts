import type { Types } from '@cornerstonejs/core';
import type { Annotation } from '../types';
export default function getViewportsForAnnotation(annotation: Annotation): (Types.IStackViewport | Types.IVolumeViewport)[];
