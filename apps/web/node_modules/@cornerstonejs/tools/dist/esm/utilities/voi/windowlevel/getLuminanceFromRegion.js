function getLuminanceFromRegion(imageData, x, y, width, height) {
    const luminance = [];
    let index = 0;
    const pixelData = imageData.scalarData;
    let spIndex, row, column;
    if (imageData.color) {
        for (row = 0; row < height; row++) {
            for (column = 0; column < width; column++) {
                spIndex = ((row + y) * imageData.columns + (column + x)) * 4;
                const red = pixelData[spIndex];
                const green = pixelData[spIndex + 1];
                const blue = pixelData[spIndex + 2];
                luminance[index++] = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
            }
        }
    }
    else {
        for (row = 0; row < height; row++) {
            for (column = 0; column < width; column++) {
                spIndex = (row + y) * imageData.columns + (column + x);
                luminance[index++] = pixelData[spIndex];
            }
        }
    }
    return luminance;
}
export { getLuminanceFromRegion };
