import now from './now';
export default function (image, lutFunction, canvasImageDataData) {
    let start = now();
    const pixelData = image.voxelManager.getScalarData();
    image.stats.lastGetPixelDataTime = now() - start;
    const numPixels = pixelData.length;
    let canvasImageDataIndex = 3;
    let storedPixelDataIndex = 0;
    start = now();
    while (storedPixelDataIndex < numPixels) {
        canvasImageDataData[canvasImageDataIndex] = lutFunction(pixelData[storedPixelDataIndex++]);
        canvasImageDataIndex += 4;
    }
    image.stats.lastStoredPixelDataToCanvasImageDataTime = now() - start;
}
