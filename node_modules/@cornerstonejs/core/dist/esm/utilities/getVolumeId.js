export const getVolumeId = (targetId) => {
    const prefix = 'volumeId:';
    const str = targetId.includes(prefix)
        ? targetId.substring(prefix.length)
        : targetId;
    const index = str.indexOf('sliceIndex=');
    return index === -1 ? str : str.substring(0, index - 1);
};
