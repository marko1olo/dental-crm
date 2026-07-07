const local = {
    JpegImage: undefined,
    decodeConfig: {},
};
export function initialize(decodeConfig) {
    local.decodeConfig = decodeConfig;
    if (local.JpegImage) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        import('../../codecs/jpeg')
            .then((module) => {
            local.JpegImage = module.default;
            resolve();
        })
            .catch(reject);
    });
}
async function decodeJPEGBaseline12BitAsync(imageFrame, pixelData) {
    await initialize();
    if (typeof local.JpegImage === 'undefined') {
        throw new Error('No JPEG Baseline decoder loaded');
    }
    const jpeg = new local.JpegImage();
    jpeg.parse(pixelData);
    jpeg.colorTransform = false;
    if (imageFrame.bitsAllocated === 8) {
        imageFrame.pixelData = jpeg.getData(imageFrame.columns, imageFrame.rows);
        return imageFrame;
    }
    else if (imageFrame.bitsAllocated === 16) {
        imageFrame.pixelData = jpeg.getData16(imageFrame.columns, imageFrame.rows);
        return imageFrame;
    }
}
export default decodeJPEGBaseline12BitAsync;
