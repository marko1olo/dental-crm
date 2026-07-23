function parseImageId(imageId) {
    const firstColonIndex = imageId.indexOf(':');
    let url = imageId.substring(firstColonIndex + 1);
    const frameIndex = url.indexOf('frame=');
    let frame;
    if (frameIndex !== -1) {
        const frameStr = url.substring(frameIndex + 6);
        frame = parseInt(frameStr, 10);
        url = url.substring(0, frameIndex - 1);
    }
    const scheme = imageId.substring(0, firstColonIndex);
    const adjustedFrame = frame !== undefined ? frame - 1 : undefined;
    return {
        scheme,
        url,
        frame,
        pixelDataFrame: adjustedFrame,
    };
}
export default parseImageId;
