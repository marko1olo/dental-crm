import type { CPUFallbackViewport } from '../../../../types';
interface Shift {
    x: number;
    y: number;
}
export default function (shift: Shift, viewportOrientation: CPUFallbackViewport): Shift;
export {};
