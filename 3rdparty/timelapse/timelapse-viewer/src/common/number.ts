// DO NOT edit this file, edit src/common in the root of this repo instead

export const isNumeric = (value: string) => {
  return /^-{0,1}\d+$/.test(value);
};

export const isPositiveNumeric = (value: string) => {
  return /^\d+$/.test(value);
};
