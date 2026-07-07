import getNumberString from './metaData/getNumberString';
import getNumberValue from './metaData/getNumberValue';
import getNumberValues from './metaData/getNumberValues';
import getValue from './metaData/getValue';
import metaDataProvider from './metaData/metaDataProvider';
import findIndexOfString from './findIndexOfString';
import getPixelData from './getPixelData';
import metaDataManager from './metaDataManager';
import loadImage from './loadImage';
import register from './register';
declare const metaData: {
    getNumberString: typeof getNumberString;
    getNumberValue: typeof getNumberValue;
    getNumberValues: typeof getNumberValues;
    getValue: typeof getValue;
    metaDataProvider: typeof metaDataProvider;
};
declare const _default: {
    metaData: {
        getNumberString: typeof getNumberString;
        getNumberValue: typeof getNumberValue;
        getNumberValues: typeof getNumberValues;
        getValue: typeof getValue;
        metaDataProvider: typeof metaDataProvider;
    };
    findIndexOfString: typeof findIndexOfString;
    getPixelData: typeof getPixelData;
    loadImage: typeof loadImage;
    metaDataManager: {
        add: (imageId: string, metadata: import("../../types").WADORSMetaData) => void;
        get: (imageId: string) => import("../../types").WADORSMetaData;
        remove: (imageId: any) => void;
        purge: () => void;
    };
    register: typeof register;
};
export default _default;
export { metaData, findIndexOfString, getPixelData, loadImage, metaDataManager, register, };
