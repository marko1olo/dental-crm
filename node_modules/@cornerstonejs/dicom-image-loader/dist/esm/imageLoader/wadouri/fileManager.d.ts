declare function add(file: Blob): string;
declare function get(index: number): Blob;
declare function remove(index: number): void;
declare function purge(): void;
declare const _default: {
    add: typeof add;
    get: typeof get;
    remove: typeof remove;
    purge: typeof purge;
};
export default _default;
