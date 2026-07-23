import { addProvider } from '../metaData';
const retrieveConfigurationState = new Map();
const IMAGE_RETRIEVE_CONFIGURATION = 'imageRetrieveConfiguration';
const imageRetrieveMetadataProvider = {
    IMAGE_RETRIEVE_CONFIGURATION,
    clear: () => {
        retrieveConfigurationState.clear();
    },
    add: (key, payload) => {
        retrieveConfigurationState.set(key, payload);
    },
    clone: () => {
        return new Map(retrieveConfigurationState);
    },
    restore: (state) => {
        retrieveConfigurationState.clear();
        state.forEach((value, key) => {
            retrieveConfigurationState.set(key, value);
        });
    },
    get: (type, ...queries) => {
        if (type === IMAGE_RETRIEVE_CONFIGURATION) {
            return queries
                .map((query) => retrieveConfigurationState.get(query))
                .find((it) => it !== undefined);
        }
    },
};
addProvider(imageRetrieveMetadataProvider.get.bind(imageRetrieveMetadataProvider));
export default imageRetrieveMetadataProvider;
