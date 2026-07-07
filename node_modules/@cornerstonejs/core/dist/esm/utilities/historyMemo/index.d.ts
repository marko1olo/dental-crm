export type Memo = {
    restoreMemo: (undo?: boolean) => void;
    commitMemo?: () => boolean;
    id?: string;
    operationType?: string;
};
export type Memoable = {
    createMemo: () => Memo;
};
export declare class HistoryMemo {
    readonly label: any;
    private _size;
    private position;
    private redoAvailable;
    private undoAvailable;
    private ring;
    private isRecordingGrouped;
    constructor(label?: string, size?: number);
    get size(): number;
    set size(newSize: number);
    get canUndo(): boolean;
    get canRedo(): boolean;
    undo(items?: number): void;
    undoIf(condition: (item: Memo | Memo[]) => boolean): boolean;
    private dispatchHistoryEvent;
    redo(items?: number): void;
    private initializeGroupItem;
    startGroupRecording(): void;
    private rollbackUnusedGroupItem;
    endGroupRecording(): void;
    private pushGrouped;
    push(item: Memo | Memoable): Memo;
}
declare const DefaultHistoryMemo: HistoryMemo;
export { DefaultHistoryMemo };
