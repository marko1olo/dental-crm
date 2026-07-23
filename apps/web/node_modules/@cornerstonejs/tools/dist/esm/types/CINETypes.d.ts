type PlayClipOptions = {
    framesPerSecond?: number;
    frameTimeVector?: number[];
    frameTimeVectorSpeedMultiplier?: number;
    reverse?: boolean;
    loop?: boolean;
    dynamicCineEnabled?: boolean;
    waitForRendered?: number;
    bounce?: boolean;
};
interface ToolData {
    intervalId: number | undefined;
    framesPerSecond: number;
    lastFrameTimeStamp: number | undefined;
    frameTimeVector: number[] | undefined;
    ignoreFrameTimeVector: boolean;
    usingFrameTimeVector: boolean;
    speed: number;
    reverse: boolean;
    loop: boolean;
    bounce: boolean;
    dynamicCineEnabled?: boolean;
}
type CinePlayContext = {
    get numScrollSteps(): number;
    get currentStepIndex(): number;
    get frameTimeVectorEnabled(): boolean;
    waitForRenderedCount?: number;
    scroll(delta: number): void;
    play?(fps?: number): number;
};
export type { PlayClipOptions, ToolData, CinePlayContext };
