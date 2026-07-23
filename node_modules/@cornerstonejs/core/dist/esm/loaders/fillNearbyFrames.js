import cache from '../cache/cache';
export function fillNearbyFrames(listener, request, image) {
    if (!request?.nearbyRequests?.length) {
        return;
    }
    for (const nearbyItem of request.nearbyRequests) {
        try {
            const { itemId: targetId, imageQualityStatus } = nearbyItem;
            const currentStatus = cache.getImageQuality(targetId);
            if (currentStatus !== undefined && currentStatus >= imageQualityStatus) {
                continue;
            }
            const nearbyImage = {
                ...image,
                imageId: targetId,
                imageQualityStatus,
            };
            cache.setPartialImage(targetId, nearbyImage);
            listener.successCallback(targetId, nearbyImage);
        }
        catch (e) {
            console.warn("Couldn't fill nearby item ", nearbyItem.itemId, e);
        }
    }
}
