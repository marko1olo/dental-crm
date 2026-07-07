function _getHash(annotationUID, drawingElementType, nodeUID) {
    return `${annotationUID}::${drawingElementType}::${nodeUID}`;
}
export default _getHash;
