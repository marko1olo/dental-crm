export interface StackPrefetchData {
    indicesToRequest: number[];
    currentImageIdIndex: number;
    stackCount: number;
    enabled: boolean;
    direction: number;
    cacheFill?: boolean;
    stats: {
        start: number;
        imageIds: Map<string, number>;
        decodeTimeInMS: number;
        loadTimeInMS: number;
        totalBytes: number;
        initialTime?: number;
        initialSize?: number;
        fillTime?: number;
        fillSize?: number;
    };
}
declare function addToolState(element: HTMLDivElement, data: any): void;
declare function getToolState(element: HTMLDivElement): StackPrefetchData;
export { addToolState, getToolState };
