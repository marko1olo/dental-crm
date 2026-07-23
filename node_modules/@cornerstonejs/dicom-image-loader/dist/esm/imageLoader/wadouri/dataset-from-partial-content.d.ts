import type { LoadRequestFunction, DICOMLoaderDataSetWithFetchMore } from '../../types';
export default function dataSetFromPartialContent(byteArray: Uint8Array, loadRequest: LoadRequestFunction, metadata: {
    uri: string;
    imageId: string;
    fileTotalLength: number | null;
}): Promise<DICOMLoaderDataSetWithFetchMore>;
