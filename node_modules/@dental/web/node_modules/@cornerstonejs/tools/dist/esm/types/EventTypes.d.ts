import type { Types } from '@cornerstonejs/core';
import type { Annotation } from './AnnotationTypes';
import type IPoints from './IPoints';
import type ITouchPoints from './ITouchPoints';
import type IDistance from './IDistance';
import type { SetToolBindingsType } from './ISetToolModeOptions';
import type { Swipe } from '../enums/Touch';
import type { ToolModes, ChangeTypes } from '../enums';
import type { InterpolationROIAnnotation } from './ToolSpecificAnnotationTypes';
type NormalizedInteractionEventDetail = {
    eventName: string;
    renderingEngineId: string;
    viewportId: string;
    camera: Record<string, unknown>;
    element: HTMLDivElement;
};
type MouseCustomEventDetail = NormalizedInteractionEventDetail & {
    event: Record<string, unknown> | MouseEvent;
    buttons?: number;
};
type TouchCustomEventDetail = NormalizedInteractionEventDetail & {
    event: Record<string, unknown> | TouchEvent;
};
type MousePointsDetail = {
    startPoints: IPoints;
    lastPoints: IPoints;
    currentPoints: IPoints;
    deltaPoints: IPoints;
};
type TouchPointsDetail = {
    startPoints: ITouchPoints;
    lastPoints: ITouchPoints;
    currentPoints: ITouchPoints;
    startPointsList: ITouchPoints[];
    lastPointsList: ITouchPoints[];
    currentPointsList: ITouchPoints[];
    deltaPoints: IPoints;
    deltaDistance: IDistance;
};
type InteractionEventDetail = NormalizedInteractionEventDetail & (MouseCustomEventDetail | TouchCustomEventDetail) & (MousePointsDetail | TouchPointsDetail);
type InteractionStartEventDetail = InteractionEventDetail;
type InteractionEndEventDetail = InteractionEventDetail;
type ToolModeChangedEventDetail = {
    toolGroupId: string;
    toolName: string;
    mode: ToolModes;
    toolBindingsOptions?: SetToolBindingsType;
};
type ToolActivatedEventDetail = {
    toolGroupId: string;
    toolName: string;
    toolBindingsOptions: SetToolBindingsType;
};
type AnnotationAddedEventDetail = {
    viewportId?: string;
    renderingEngineId?: string;
    annotation: Annotation;
};
type AnnotationCompletedEventDetail = {
    annotation: Annotation;
    changeType?: ChangeTypes.Completed;
};
type AnnotationModifiedEventDetail = {
    annotation: Annotation;
    changeType?: ChangeTypes;
    viewportId?: string;
    renderingEngineId?: string;
};
type AnnotationRemovedEventDetail = {
    annotation: Annotation;
    annotationManagerUID: string;
};
type AnnotationSelectionChangeEventDetail = {
    added: Array<string>;
    removed: Array<string>;
    selection: Array<string>;
};
type AnnotationLockChangeEventDetail = {
    added: Array<string>;
    removed: Array<string>;
    locked: Array<string>;
};
type AnnotationVisibilityChangeEventDetail = {
    lastHidden: Array<string>;
    lastVisible: Array<string>;
    hidden: Array<string>;
};
type AnnotationRenderedEventDetail = {
    element: HTMLDivElement;
    viewportId: string;
    renderingEngineId: string;
};
type AnnotationInterpolationCompletedEventDetail = {
    annotation: InterpolationROIAnnotation;
    element: HTMLDivElement;
    viewportId: string;
    renderingEngineId: string;
};
type AnnotationInterpolationRemovedEventDetail = {
    annotations: Array<InterpolationROIAnnotation>;
    element: HTMLDivElement;
    viewportId: string;
    renderingEngineId: string;
};
type ContourAnnotationCompletedEventDetail = AnnotationCompletedEventDetail & {
    contourHoleProcessingEnabled: boolean;
};
type SegmentationDataModifiedEventDetail = {
    segmentationId: string;
    modifiedSlicesToUse?: number[];
    segmentIndex?: number;
};
type SegmentationRenderedEventDetail = {
    viewportId: string;
    segmentationId: string;
    type: string;
};
type SegmentationRepresentationModifiedEventDetail = {
    segmentationId: string;
    type: string;
    viewportId: string;
};
type SegmentationRemovedEventDetail = {
    segmentationId: string;
};
type SegmentationRepresentationRemovedEventDetail = {
    segmentationId: string;
    type: string;
    viewportId: string;
};
type SegmentationModifiedEventDetail = {
    segmentationId: string;
};
type SegmentationAddedEventDetail = {
    segmentationId: string;
};
type KeyDownEventDetail = {
    element: HTMLDivElement;
    viewportId: string;
    renderingEngineId: string;
    key: string;
    keyCode: number;
};
type KeyUpEventDetail = KeyDownEventDetail;
type MouseDownEventDetail = NormalizedInteractionEventDetail & MouseCustomEventDetail & MousePointsDetail & {
    mouseButton: number;
};
type TouchStartEventDetail = NormalizedInteractionEventDetail & TouchCustomEventDetail & TouchPointsDetail;
type MouseDragEventDetail = NormalizedInteractionEventDetail & MouseCustomEventDetail & MousePointsDetail & {
    mouseButton: number;
};
type TouchDragEventDetail = NormalizedInteractionEventDetail & TouchCustomEventDetail & TouchPointsDetail;
type MouseMoveEventDetail = NormalizedInteractionEventDetail & MouseCustomEventDetail & {
    currentPoints: IPoints;
};
type MouseUpEventDetail = NormalizedInteractionEventDetail & MouseCustomEventDetail & MousePointsDetail & {
    mouseButton: number;
};
type TouchEndEventDetail = NormalizedInteractionEventDetail & TouchPointsDetail & TouchCustomEventDetail;
type MouseDownActivateEventDetail = NormalizedInteractionEventDetail & MousePointsDetail & MouseCustomEventDetail & {
    mouseButton: number;
};
type TouchStartActivateEventDetail = NormalizedInteractionEventDetail & TouchCustomEventDetail & TouchPointsDetail;
type MouseClickEventDetail = NormalizedInteractionEventDetail & MouseCustomEventDetail & MousePointsDetail & {
    mouseButton: number;
};
type MouseDoubleClickEventDetail = NormalizedInteractionEventDetail & MouseCustomEventDetail & MousePointsDetail;
type TouchTapEventDetail = NormalizedInteractionEventDetail & TouchCustomEventDetail & {
    currentPointsList: ITouchPoints[];
    currentPoints: ITouchPoints;
    taps: number;
};
type TouchSwipeEventDetail = NormalizedInteractionEventDetail & TouchCustomEventDetail & {
    swipe: Swipe;
};
type TouchPressEventDetail = NormalizedInteractionEventDetail & TouchCustomEventDetail & {
    startPointsList: ITouchPoints[];
    lastPointsList: ITouchPoints[];
    startPoints: ITouchPoints;
    lastPoints: ITouchPoints;
};
type MouseWheelEventDetail = NormalizedInteractionEventDetail & MouseCustomEventDetail & {
    detail: Record<string, unknown>;
    wheel: {
        spinX: number;
        spinY: number;
        pixelX: number;
        pixelY: number;
        direction: number;
    };
    points: IPoints;
};
type StackPrefetchCompleteEventDetail = {
    element: HTMLDivElement;
    lastPrefetchedImageId: string;
};
type NormalizedMouseEventType = Types.CustomEventType<MouseCustomEventDetail>;
type NormalizedTouchEventType = Types.CustomEventType<TouchCustomEventDetail>;
type ToolModeChangedEventType = Types.CustomEventType<ToolModeChangedEventDetail>;
type ToolActivatedEventType = Types.CustomEventType<ToolActivatedEventDetail>;
type AnnotationAddedEventType = Types.CustomEventType<AnnotationAddedEventDetail>;
type AnnotationCompletedEventType = Types.CustomEventType<AnnotationCompletedEventDetail>;
type AnnotationModifiedEventType = Types.CustomEventType<AnnotationModifiedEventDetail>;
type AnnotationRemovedEventType = Types.CustomEventType<AnnotationRemovedEventDetail>;
type AnnotationSelectionChangeEventType = Types.CustomEventType<AnnotationSelectionChangeEventDetail>;
type AnnotationRenderedEventType = Types.CustomEventType<AnnotationRenderedEventDetail>;
type AnnotationLockChangeEventType = Types.CustomEventType<AnnotationLockChangeEventDetail>;
type AnnotationVisibilityChangeEventType = Types.CustomEventType<AnnotationVisibilityChangeEventDetail>;
type AnnotationInterpolationCompletedEventType = Types.CustomEventType<AnnotationInterpolationCompletedEventDetail>;
type AnnotationInterpolationRemovedEventType = Types.CustomEventType<AnnotationInterpolationRemovedEventDetail>;
type SegmentationDataModifiedEventType = Types.CustomEventType<SegmentationDataModifiedEventDetail>;
type SegmentationRepresentationModifiedEventType = Types.CustomEventType<SegmentationRepresentationModifiedEventDetail>;
type SegmentationRemovedEventType = Types.CustomEventType<SegmentationRemovedEventDetail>;
type SegmentationRepresentationRemovedEventType = Types.CustomEventType<SegmentationRepresentationRemovedEventDetail>;
type SegmentationRenderedEventType = Types.CustomEventType<SegmentationRenderedEventDetail>;
type SegmentationModifiedEventType = Types.CustomEventType<SegmentationModifiedEventDetail>;
type SegmentationAddedEventType = Types.CustomEventType<SegmentationAddedEventDetail>;
type KeyDownEventType = Types.CustomEventType<KeyDownEventDetail>;
type KeyUpEventType = Types.CustomEventType<KeyUpEventDetail>;
type MouseDownEventType = Types.CustomEventType<MouseDownEventDetail>;
type TouchTapEventType = Types.CustomEventType<TouchTapEventDetail>;
type TouchSwipeEventType = Types.CustomEventType<TouchSwipeEventDetail>;
type TouchPressEventType = Types.CustomEventType<TouchPressEventDetail>;
type TouchStartEventType = Types.CustomEventType<TouchStartEventDetail>;
type InteractionEventType = Types.CustomEventType<InteractionEventDetail>;
type InteractionStartType = Types.CustomEventType<InteractionStartEventDetail>;
type InteractionEndType = Types.CustomEventType<InteractionEndEventDetail>;
type MouseDownActivateEventType = Types.CustomEventType<MouseDownActivateEventDetail>;
type TouchStartActivateEventType = Types.CustomEventType<TouchStartActivateEventDetail>;
type MouseDragEventType = Types.CustomEventType<MouseDragEventDetail>;
type TouchDragEventType = Types.CustomEventType<TouchDragEventDetail>;
type MouseUpEventType = Types.CustomEventType<MouseUpEventDetail>;
type TouchEndEventType = Types.CustomEventType<TouchEndEventDetail>;
type MouseClickEventType = Types.CustomEventType<MouseClickEventDetail>;
type MouseMoveEventType = Types.CustomEventType<MouseMoveEventDetail>;
type MouseDoubleClickEventType = Types.CustomEventType<MouseDoubleClickEventDetail>;
type MouseWheelEventType = Types.CustomEventType<MouseWheelEventDetail>;
export type { InteractionStartType, InteractionEndType, InteractionEventType, NormalizedInteractionEventDetail, NormalizedMouseEventType, NormalizedTouchEventType, ToolModeChangedEventDetail, ToolModeChangedEventType, ToolActivatedEventDetail, ToolActivatedEventType, AnnotationAddedEventDetail, AnnotationAddedEventType, AnnotationCompletedEventDetail, AnnotationCompletedEventType, AnnotationModifiedEventDetail, AnnotationModifiedEventType, AnnotationRemovedEventDetail, AnnotationRemovedEventType, AnnotationSelectionChangeEventDetail, AnnotationSelectionChangeEventType, AnnotationRenderedEventDetail, AnnotationRenderedEventType, AnnotationLockChangeEventDetail, AnnotationVisibilityChangeEventDetail, AnnotationLockChangeEventType, AnnotationVisibilityChangeEventType, AnnotationInterpolationCompletedEventDetail, AnnotationInterpolationCompletedEventType, AnnotationInterpolationRemovedEventDetail, AnnotationInterpolationRemovedEventType, ContourAnnotationCompletedEventDetail, SegmentationDataModifiedEventType, SegmentationRepresentationModifiedEventDetail, SegmentationRepresentationModifiedEventType, SegmentationRepresentationRemovedEventDetail, SegmentationRepresentationRemovedEventType, SegmentationRemovedEventType, SegmentationRemovedEventDetail, SegmentationDataModifiedEventDetail, SegmentationRenderedEventType, SegmentationRenderedEventDetail, SegmentationModifiedEventType, SegmentationModifiedEventDetail, KeyDownEventDetail, KeyDownEventType, KeyUpEventDetail, KeyUpEventType, MouseDownEventDetail, TouchStartEventDetail, MouseDownEventType, TouchStartEventType, MouseDownActivateEventDetail, TouchStartActivateEventDetail, MouseDownActivateEventType, TouchStartActivateEventType, MouseDragEventDetail, TouchDragEventDetail, MouseDragEventType, TouchDragEventType, MouseUpEventDetail, TouchEndEventDetail, MouseUpEventType, TouchEndEventType, MouseClickEventDetail, MouseClickEventType, TouchTapEventDetail, TouchTapEventType, TouchSwipeEventDetail, TouchSwipeEventType, TouchPressEventDetail, TouchPressEventType, MouseMoveEventDetail, MouseMoveEventType, MouseDoubleClickEventDetail, MouseDoubleClickEventType, MouseWheelEventDetail, MouseWheelEventType, SegmentationAddedEventDetail, SegmentationAddedEventType, StackPrefetchCompleteEventDetail, };
