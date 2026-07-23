export const logit = (y, wc, ww) => {
    return wc - (ww / 4) * Math.log((1 - y) / y);
};
