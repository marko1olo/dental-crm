import { triggerSegmentationDataModified } from '../../stateManagement/segmentation/triggerSegmentationEvents';
import { getVoxelOverlap, processVolumes } from './utilities';
function thresholdSegmentationByRange(segmentationVolume, segmentationIndex, thresholdVolumeInformation, overlapType, segmentationId) {
    if (!segmentationId) {
        throw new Error('Segmentation ID is required to be passed inside thresholdSegmentationByRange');
    }
    const { baseVolumeIdx, volumeInfoList } = processVolumes(segmentationVolume, thresholdVolumeInformation);
    const { voxelManager } = volumeInfoList[baseVolumeIdx];
    const refVoxelManager = voxelManager;
    const scalarDataLength = segmentationVolume.voxelManager.getScalarDataLength();
    const segVoxelManager = segmentationVolume.voxelManager;
    volumeInfoList.forEach((volumeInfo) => {
        const { volumeSize } = volumeInfo;
        if (volumeSize === scalarDataLength) {
            _handleSameSizeVolume(segVoxelManager, refVoxelManager, segmentationIndex, volumeInfo);
        }
        else {
            _handleDifferentSizeVolume(segVoxelManager, refVoxelManager, segmentationIndex, volumeInfo, volumeInfoList, baseVolumeIdx, overlapType);
        }
    });
    triggerSegmentationDataModified(segmentationId);
    return segmentationVolume;
}
function _handleDifferentSizeVolume(segVoxelManager, refVoxelManager, segmentationIndex, volumeInfo, volumeInfoList, baseVolumeIdx, overlapType) {
    const { imageData, lower, upper, dimensions } = volumeInfo;
    let total, overlaps, range;
    const segScalarDataLength = segVoxelManager.getScalarDataLength();
    for (let i = 0; i < segScalarDataLength; i++) {
        if (segScalarDataLength.getAtIndex(i) === segmentationIndex) {
            const overlapBounds = getVoxelOverlap(imageData, dimensions, volumeInfoList[baseVolumeIdx].spacing, volumeInfoList[baseVolumeIdx].imageData.getPoint(i));
            const callbackOverlap = ({ value }) => {
                total = total + 1;
                if (value >= range.lower && value <= range.upper) {
                    overlaps = overlaps + 1;
                }
            };
            total = 0;
            overlaps = 0;
            range = { lower, upper };
            let overlapTest = false;
            segVoxelManager.forEach(callbackOverlap, {
                imageData,
                boundsIJK: overlapBounds,
            });
            overlapTest = overlapType === 0 ? overlaps > 0 : overlaps === total;
            segVoxelManager.setAtIndex(i, overlapTest ? segmentationIndex : 0);
        }
    }
    return { total, range, overlaps };
}
function _handleSameSizeVolume(segVoxelManager, refVoxelManager, segmentationIndex, volumeInfo) {
    const { lower, upper } = volumeInfo;
    const scalarDataLength = segVoxelManager.getScalarDataLength();
    for (let i = 0; i < scalarDataLength; i++) {
        if (segVoxelManager.getAtIndex[i] === segmentationIndex) {
            const value = refVoxelManager.getAtIndex(i);
            segVoxelManager.setAtIndex(i, value >= lower && value <= upper ? segmentationIndex : 0);
        }
    }
}
export default thresholdSegmentationByRange;
