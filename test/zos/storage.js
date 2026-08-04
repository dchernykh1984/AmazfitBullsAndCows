// A fake @zos/storage. The store lives outside the class, so a test can seed it
// before the page opens and read it afterwards, and so two LocalStorage handles
// see the same data - which is what the watch does.
//
// Two ways in which it is deliberately as unhelpful as the real thing: reads come
// back as strings, because the store is file-backed and does not remember that a
// number went in, and every operation can be made to throw, because a watch
// without storage has to stay playable.
let store = {};
let brokenOpen = false;
let brokenRead = false;
let brokenWrite = false;

export function seed(values) {
  store = { ...values };
}

// What is actually persisted, as it was written.
export function stored() {
  return { ...store };
}

// Make opening the storage fail, the way a device without it behaves.
export function breakStorage() {
  brokenOpen = true;
}

// Make an opened storage fail on use - a full or unreadable store.
export function breakReads() {
  brokenRead = true;
}

export function breakWrites() {
  brokenWrite = true;
}

export class LocalStorage {
  constructor() {
    if (brokenOpen) {
      throw new Error("no storage on this device");
    }
  }

  getItem(key) {
    if (brokenRead) {
      throw new Error("storage cannot be read");
    }
    if (!Object.prototype.hasOwnProperty.call(store, key)) {
      return undefined;
    }
    const value = store[key];
    return value === undefined || value === null ? value : String(value);
  }

  setItem(key, value) {
    if (brokenWrite) {
      throw new Error("storage cannot be written");
    }
    store[key] = value;
  }
}
