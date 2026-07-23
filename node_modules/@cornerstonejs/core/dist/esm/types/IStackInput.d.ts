import type { ImageActor } from './IActor';
type StackInputCallback = (params: {
    imageActor: ImageActor;
    imageId: string;
}) => unknown;
interface IStackInput {
    imageId: string;
    actorUID?: string;
    visibility?: boolean;
    callback?: StackInputCallback;
    [key: string]: unknown;
}
export type { IStackInput, StackInputCallback };
