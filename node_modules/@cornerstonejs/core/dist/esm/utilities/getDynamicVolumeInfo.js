import splitImageIdsBy4DTags from './splitImageIdsBy4DTags';
function getDynamicVolumeInfo(imageIds) {
    const { imageIdGroups: timePoints, splittingTag } = splitImageIdsBy4DTags(imageIds);
    const isDynamicVolume = timePoints.length > 1;
    return { isDynamicVolume, timePoints, splittingTag };
}
export default getDynamicVolumeInfo;
