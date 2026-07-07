import type { CINETypes } from '../../types';
type StopClipOptions = {
    stopDynamicCine: boolean;
    viewportId?: string;
};
declare function playClip(element: HTMLDivElement, playClipOptions: CINETypes.PlayClipOptions): void;
declare function stopClip(element: HTMLDivElement, options?: StopClipOptions): void;
export { playClip, stopClip };
