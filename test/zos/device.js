// A fake @zos/device. The screen size is read once, when the page module is
// loaded, so a test sets it before importing the page.
let size = 466;

export function setSize(next) {
  size = next;
}

export function getDeviceInfo() {
  return { width: size, height: size };
}
