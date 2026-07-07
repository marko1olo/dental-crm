let options = {
    open(xhr, url) {
        xhr.open('get', url, true);
    },
    beforeSend: async () => {
    },
    beforeProcessing(xhr) {
        return Promise.resolve(xhr.response);
    },
    imageCreated() {
    },
    strict: false,
};
export function setOptions(newOptions) {
    options = Object.assign(options, newOptions);
}
export function getOptions() {
    return options;
}
