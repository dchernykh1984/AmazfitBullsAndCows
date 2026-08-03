// A fake @zos/storage. The store lives outside the class, so a test can seed it
// before the page opens and read it afterwards, and so two LocalStorage handles
// see the same data - which is what the watch does.
let store = {};
let broken = false;

export function seed(values) {
  store = { ...values };
}

export function stored() {
  return { ...store };
}

// Make the storage unusable, the way a device without it behaves: the page has to
// keep playing and remember only for the session.
export function breakStorage() {
  broken = true;
}

export class LocalStorage {
  constructor() {
    if (broken) {
      throw new Error("no storage on this device");
    }
  }

  getItem(key) {
    return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : undefined;
  }

  setItem(key, value) {
    store[key] = value;
  }
}
