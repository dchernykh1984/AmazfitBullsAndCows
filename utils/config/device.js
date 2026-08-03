import { getDeviceInfo } from "@zos/device";

const info = getDeviceInfo();

// The app targets round watches only, so the screen is a circle: one diameter
// drives the keypad ring and every chord calculation. Taking the smaller side
// keeps that true even if a device reports a pixel of slop between width and
// height.
export const SCREEN_SIZE = Math.min(info.width, info.height);
