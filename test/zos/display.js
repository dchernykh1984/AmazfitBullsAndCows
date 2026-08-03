// A fake @zos/display, recording the screen-timeout requests the page makes.
const calls = { bright: [], reset: 0 };

export function setPageBrightTime(options) {
  calls.bright.push(options.brightTime);
}

export function resetPageBrightTime() {
  calls.reset += 1;
}

export function brightTimes() {
  return calls.bright.slice();
}

export function resetCount() {
  return calls.reset;
}
