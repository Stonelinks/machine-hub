import * as fs from "fs";
import * as path from "path";
import * as sharp from "sharp";
import * as shell from "shelljs";
import {
  CACHE_FOLDER,
  CAPTURE_FOLDER,
  THUMBS_FOLDER_NAME,
} from "../common/constants";
import { encode } from "../common/encode";

export const getSize = async (fullPath: string) => {
  const imageInfo = await sharp(fullPath).metadata();
  return { width: imageInfo.width, height: imageInfo.height };
};

export const getThumbnail = async (imageFilePath: string) => {
  const fullImagePath = path.join(CAPTURE_FOLDER, imageFilePath);

  const thumbsFolder = path.join(
    path.dirname(fullImagePath),
    THUMBS_FOLDER_NAME,
  );

  const thumbImagePath = path.join(
    thumbsFolder,
    `${encode(imageFilePath)}.png`,
  );

  if (fs.existsSync(thumbImagePath)) {
    return thumbImagePath;
  }

  shell.mkdir("-p", thumbsFolder);

  await downSize(fullImagePath, thumbImagePath, 1 / 3);

  return thumbImagePath;
};

export const downSize = async (
  inputImageFilePath: string,
  outputImageFilePath: string,
  amountDownsize: number = 0.5, // between 0 (smallest) and 1 (original size)
) => {
  const { width, height } = await getSize(inputImageFilePath);

  await sharp(inputImageFilePath)
    .resize(
      parseInt((width * amountDownsize).toString(), 10),
      parseInt((height * amountDownsize).toString(), 10),
    )
    .toFile(outputImageFilePath);

  return outputImageFilePath;
};

export const cachedDownsize = async (
  inputFile,
  downSizeAmount: number = 0.5,
) => {
  const cacheBaseDir = `${CACHE_FOLDER}/downsizes`;
  shell.mkdir("-p", cacheBaseDir);

  const outputFile = `${cacheBaseDir}/${encode(inputFile)}-${encode(
    downSizeAmount.toString(),
  )}.png`;

  if (!fs.existsSync(outputFile)) {
    await downSize(inputFile, outputFile, downSizeAmount);
  }

  return outputFile;
};

export const fileIsImage = (f: string) =>
  f.toLowerCase().endsWith("jpg") ||
  f.toLowerCase().endsWith("jpeg") ||
  f.toLowerCase().endsWith("png");

export const fileIsGifOrMovie = (f: string) =>
  f.toLowerCase().endsWith("gif") ||
  f.toLowerCase().endsWith("mp4") ||
  f.toLowerCase().endsWith("webm");
