// A fake @zos/settings. Zepp OS reports the device language as an integer; 2 is
// English. `fail` makes getLanguage throw, which some firmwares do.
let code = 2;
let fail = false;

export function setLanguageCode(next) {
  code = next;
}

export function failOnRead() {
  fail = true;
}

export function getLanguage() {
  if (fail) {
    throw new Error("no language setting on this firmware");
  }
  return code;
}
