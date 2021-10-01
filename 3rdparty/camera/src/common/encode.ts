const stringToBase64 = (b: string) => {
  try {
    return btoa(b);
  } catch (e) {
    return new Buffer(b).toString("base64");
  }
};

const base64ToString = (a: string) => {
  try {
    return atob(a);
  } catch (e) {
    return new Buffer(a, "base64").toString("binary");
  }
};

export const encode = (s: string) => stringToBase64(encodeURIComponent(s));
export const decode = (s: string) => decodeURIComponent(base64ToString(s));
