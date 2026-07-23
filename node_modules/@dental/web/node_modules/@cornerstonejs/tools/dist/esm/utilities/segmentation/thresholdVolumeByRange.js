import { triggerSegmentationDataModified } from '../../stateManagement/segmentation/triggerSegmentationEvents';
import { getVoxelOverlap, processVolumes } from './utilities';
function thresholdVolumeByRange(segmentationVolume, thresholdVolumeInformation, options) {
    const { imageData: segmentationImageData } = segmentationVolume;
    const { overwrite, boundsIJK, segmentationId } = options;
    if (!segmentationId) {
        throw new Error('Segmentation ID is required to be passed inside thresholdVolumeByRange as options');
    }
    const overlapType = options?.overlapType || 0;
    const segVoxelManager = segmentationVolume.voxelManager;
    const scalarDataLength = segmentationVolume.voxelManager.getScalarDataLength();
    if (overwrite) {
        for (let i = 0; i < scalarDataLength; i++) {
            segVoxelManager.setAtIndex(i, 0);
        }
    }
    const { baseVolumeIdx, volumeInfoList } = processVolumes(segmentationVolume, thresholdVolumeInformation);
    let overlaps, total, range;
    const testOverlapRange = (volumeInfo, voxelSpacing, voxelCenter) => {
        const callbackOverlap = ({ value }) => {
            total = total + 1;
            if (value >= range.lower && value <= range.upper) {
                overlaps = overlaps + 1;
            }
        };
        const { imageData, dimensions, lower, upper } = volumeInfo;
        const overlapBounds = getVoxelOverlap(imageData, dimensions, voxelSpacing, voxelCenter);
        total = 0;
        overlaps = 0;
        range = { lower, upper };
        let overlapTest = false;
        const { voxelManager } = imageData.get('voxelManager');
        voxelManager.forEach(callbackOverlap, {
            imageData,
            boundsIJK: overlapBounds,
        });
        if (overlapType === 0) {
            overlapTest = overlaps > 0;
        }
        else if (overlapType == 1) {
            overlapTest = overlaps === total;
        }
        return overlapTest;
    };
    const testRange = (volumeInfo, pointIJK) => {
        const { imageData, lower, upper } = volumeInfo;
        const voxelManager = imageData.get('voxelManager').voxelManager;
        const offset = voxelManager.toIndex(pointIJK);
        const value = voxelManager.getAtIndex(offset);
        if (value <= lower || value >= upper) {
            return false;
        }
        else {
            return true;
        }
    };
    const callback = ({ index, pointIJK, pointLPS }) => {
        let insert = volumeInfoList.length > 0;
        for (let i = 0; i < volumeInfoList.length; i++) {
            if (volumeInfoList[i].volumeSize === scalarDataLength) {
                insert = testRange(volumeInfoList[i], pointIJK);
            }
            else {
                insert = testOverlapRange(volumeInfoList[i], volumeInfoList[baseVolumeIdx].spacing, pointLPS);
            }
            if (!insert) {
                break;
            }
        }
        if (insert) {
            segVoxelManager.setAtIndex(index, options.segmentIndex || 1);
        }
    };
    const voxelManager = segmentationVolume.voxelManager;
    voxelManager.forEach(callback, {
        imageData: segmentationImageData,
        boundsIJK,
    });
    triggerSegmentationDataModified(options.segmentationId);
    return segmentationVolume;
}
export default thresholdVolumeByRange;
