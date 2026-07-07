import { addColorLUT as _addColorLUT } from '../addColorLUT';
import { getColorLUT as _getColorLUT } from '../getColorLUT';
import { getSegmentationRepresentations } from '../getSegmentationRepresentation';
import { triggerSegmentationRepresentationModified } from '../triggerSegmentationEvents';
function addColorLUT(colorLUT, colorLUTIndex) {
    if (!colorLUT) {
        throw new Error('addColorLUT: colorLUT is required');
    }
    return _addColorLUT(colorLUT, colorLUTIndex);
}
function setColorLUT(viewportId, segmentationId, colorLUTsIndex) {
    if (!_getColorLUT(colorLUTsIndex)) {
        throw new Error(`setColorLUT: could not find colorLUT with index ${colorLUTsIndex}`);
    }
    const segmentationRepresentations = getSegmentationRepresentations(viewportId, { segmentationId });
    if (!segmentationRepresentations) {
        throw new Error(`viewport specific state for viewport ${viewportId} does not exist`);
    }
    segmentationRepresentations.forEach((segmentationRepresentation) => {
        segmentationRepresentation.colorLUTIndex = colorLUTsIndex;
    });
    triggerSegmentationRepresentationModified(viewportId, segmentationId);
}
function getSegmentIndexColor(viewportId, segmentationId, segmentIndex) {
    const representations = getSegmentationRepresentations(viewportId, {
        segmentationId,
    });
    if (!representations || representations.length === 0) {
        return null;
    }
    const representation = representations[0];
    const { colorLUTIndex } = representation;
    const colorLUT = _getColorLUT(colorLUTIndex);
    let colorValue = colorLUT[segmentIndex];
    if (!colorValue) {
        if (typeof segmentIndex !== 'number') {
            console.warn(`Can't create colour for LUT index ${segmentIndex}`);
            return null;
        }
        colorValue = colorLUT[segmentIndex] = [0, 0, 0, 0];
    }
    return colorValue;
}
function setSegmentIndexColor(viewportId, segmentationId, segmentIndex, color) {
    const colorReference = getSegmentIndexColor(viewportId, segmentationId, segmentIndex);
    for (let i = 0; i < color.length; i++) {
        colorReference[i] = color[i];
    }
    triggerSegmentationRepresentationModified(viewportId, segmentationId);
}
export { getSegmentIndexColor, addColorLUT, setColorLUT, setSegmentIndexColor };
