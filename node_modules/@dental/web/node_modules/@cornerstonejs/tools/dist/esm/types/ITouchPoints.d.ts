import type IPoints from './IPoints';
type ITouchPoints = IPoints & {
    touch: {
        identifier: string;
        radiusX: number;
        radiusY: number;
        force: number;
        rotationAngle: number;
    };
};
export type { ITouchPoints as default };
