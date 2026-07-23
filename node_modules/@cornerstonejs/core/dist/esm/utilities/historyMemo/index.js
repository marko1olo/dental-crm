import eventTarget from '../../eventTarget';
import { asArray } from '../asArray';
const Events = {
    HISTORY_UNDO: 'CORNERSTONE_TOOLS_HISTORY_UNDO',
    HISTORY_REDO: 'CORNERSTONE_TOOLS_HISTORY_REDO',
};
export class HistoryMemo {
    constructor(label = 'Tools', size = 50) {
        this.position = -1;
        this.redoAvailable = 0;
        this.undoAvailable = 0;
        this.ring = new Array();
        this.isRecordingGrouped = false;
        this.label = label;
        this._size = size;
    }
    get size() {
        return this._size;
    }
    set size(newSize) {
        this.ring = new Array(newSize);
        this._size = newSize;
        this.position = -1;
        this.redoAvailable = 0;
        this.undoAvailable = 0;
    }
    get canUndo() {
        return this.undoAvailable > 0;
    }
    get canRedo() {
        return this.redoAvailable > 0;
    }
    undo(items = 1) {
        while (items > 0 && this.undoAvailable > 0) {
            const item = this.ring[this.position];
            for (const subitem of asArray(item).reverse()) {
                subitem.restoreMemo(true);
                this.dispatchHistoryEvent({ item: subitem, isUndo: true });
            }
            items--;
            this.redoAvailable++;
            this.undoAvailable--;
            this.position = (this.position - 1 + this.size) % this.size;
        }
    }
    undoIf(condition) {
        if (this.undoAvailable > 0 && condition(this.ring[this.position])) {
            this.undo();
            return true;
        }
        return false;
    }
    dispatchHistoryEvent({ item, isUndo }) {
        if (item.id) {
            eventTarget.dispatchEvent(new CustomEvent(isUndo ? Events.HISTORY_UNDO : Events.HISTORY_REDO, {
                detail: {
                    isUndo,
                    id: item.id,
                    operationType: item.operationType || 'annotation',
                    memo: item,
                },
            }));
        }
    }
    redo(items = 1) {
        while (items > 0 && this.redoAvailable > 0) {
            const newPosition = (this.position + 1) % this.size;
            const item = this.ring[newPosition];
            for (const subitem of asArray(item).reverse()) {
                subitem.restoreMemo(false);
                this.dispatchHistoryEvent({ item: subitem, isUndo: false });
            }
            items--;
            this.position = newPosition;
            this.undoAvailable++;
            this.redoAvailable--;
        }
    }
    initializeGroupItem() {
        this.redoAvailable = 0;
        if (this.undoAvailable < this._size) {
            this.undoAvailable++;
        }
        this.position = (this.position + 1) % this._size;
        this.ring[this.position] = [];
    }
    startGroupRecording() {
        this.isRecordingGrouped = true;
        this.initializeGroupItem();
    }
    rollbackUnusedGroupItem() {
        this.ring[this.position] = undefined;
        this.position = (this.position - 1) % this._size;
        this.undoAvailable--;
    }
    endGroupRecording() {
        this.isRecordingGrouped = false;
        const lastItem = this.ring[this.position];
        const lastItemIsEmpty = Array.isArray(lastItem) && lastItem.length === 0;
        if (lastItemIsEmpty) {
            this.rollbackUnusedGroupItem();
        }
    }
    pushGrouped(memo) {
        const lastMemo = this.ring[this.position];
        if (Array.isArray(lastMemo)) {
            lastMemo.push(memo);
            return memo;
        }
        throw new Error('Last item should be an array for grouped memos.');
    }
    push(item) {
        if (!item) {
            return;
        }
        const memo = item.restoreMemo
            ? item
            : item.createMemo?.();
        if (!memo) {
            return;
        }
        if (this.isRecordingGrouped) {
            return this.pushGrouped(memo);
        }
        this.redoAvailable = 0;
        if (this.undoAvailable < this._size) {
            this.undoAvailable++;
        }
        this.position = (this.position + 1) % this._size;
        this.ring[this.position] = memo;
        return memo;
    }
}
const DefaultHistoryMemo = new HistoryMemo();
export { DefaultHistoryMemo };
