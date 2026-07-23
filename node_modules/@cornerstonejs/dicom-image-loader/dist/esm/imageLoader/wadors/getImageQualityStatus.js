import { Enums } from '@cornerstonejs/core';
const { ImageQualityStatus } = Enums;
export function getImageQualityStatus(retrieveOptions, done = true) {
    if (!done) {
        return ImageQualityStatus.SUBRESOLUTION;
    }
    return (retrieveOptions.imageQualityStatus ?? ImageQualityStatus.FULL_RESOLUTION);
}
