import type { Types } from '@cornerstonejs/core';
import type { Synchronizer } from '../../store';
export default function cameraSyncCallback(synchronizerInstance: Synchronizer, sourceViewport: Types.IViewportId, targetViewport: Types.IViewportId, cameraModifiedEvent: CustomEvent): void;
