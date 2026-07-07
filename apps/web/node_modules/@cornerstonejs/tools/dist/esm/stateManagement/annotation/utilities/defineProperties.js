const checkAndDefineTextBoxProperty = (annotation) => {
    if (!annotation.data) {
        annotation.data = {};
    }
    if (!annotation.data.handles) {
        annotation.data.handles = {};
    }
    if (!annotation.data.handles.textBox) {
        annotation.data.handles.textBox = {};
    }
    return annotation;
};
const checkAndDefineCachedStatsProperty = (annotation) => {
    if (!annotation.data) {
        annotation.data = {};
    }
    if (!annotation.data.cachedStats) {
        annotation.data.cachedStats = {};
    }
    return annotation;
};
export { checkAndDefineTextBoxProperty, checkAndDefineCachedStatsProperty };
