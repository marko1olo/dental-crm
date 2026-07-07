import type { Types } from '..';
type actorTypes = 'vtkActor' | 'vtkVolume' | 'vtkImageSlice';
export declare function isImageActor(actorEntry: Types.ActorEntry): boolean;
export declare function actorIsA(actorEntry: Types.ActorEntry | Types.Actor, actorType: actorTypes): boolean;
export {};
