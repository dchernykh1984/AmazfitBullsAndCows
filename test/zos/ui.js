// A fake @zos/ui: it records the widgets the page creates instead of drawing
// them, so a test can read the screen the way a player would - by looking for a
// label - and can tap a button by its text.
//
// deleteWidget deliberately throws on a widget that is already gone: a page that
// deletes the same widget twice, or forgets one and deletes it after a redraw, is
// a bug the tests should catch rather than tolerate.

export const widget = {
  FILL_RECT: "FILL_RECT",
  TEXT: "TEXT",
  BUTTON: "BUTTON",
};

export const align = {
  LEFT: "LEFT",
  RIGHT: "RIGHT",
  CENTER_H: "CENTER_H",
  CENTER_V: "CENTER_V",
};

export const text_style = { NONE: "NONE" };

const created = [];
let nextId = 1;

// A widget with no area, or text at no size, is invisible on the watch but was
// perfectly happy to be created. Those are exactly the mistakes a test that only
// reads labels cannot see, so the double refuses them: the geometry has to be
// real before anything else is asserted about it.
function checkDrawable(type, props) {
  if (!(props.w > 0) || !(props.h > 0)) {
    throw new Error(`${type} created with no area: w=${props.w} h=${props.h}`);
  }
  if (props.text !== undefined && !(props.text_size > 0)) {
    throw new Error(`${type} '${props.text}' created with text_size=${props.text_size}`);
  }
}

export function createWidget(type, props) {
  checkDrawable(type, props);
  const instance = {
    id: nextId++,
    type,
    props: { ...props },
    deleted: false,
  };
  created.push(instance);
  return instance;
}

export function deleteWidget(instance) {
  if (!instance) {
    throw new Error("deleteWidget called with nothing");
  }
  if (instance.deleted) {
    throw new Error("deleteWidget called twice on widget " + instance.id);
  }
  instance.deleted = true;
}

// Every widget still on screen, in creation order.
export function live() {
  return created.filter((instance) => !instance.deleted);
}

export function liveOfType(type) {
  return live().filter((instance) => instance.type === type);
}

// The text of everything readable on screen right now.
export function texts() {
  return live()
    .filter((instance) => typeof instance.props.text === "string")
    .map((instance) => instance.props.text);
}

export function hasText(text) {
  return texts().indexOf(text) !== -1;
}

export function buttonWith(text) {
  return live().find((instance) => instance.type === widget.BUTTON && instance.props.text === text);
}

// Tap a button by its label. Throws when nothing on screen carries that label, so
// a test cannot silently pass by tapping nothing.
export function tap(text) {
  const button = buttonWith(text);
  if (!button) {
    throw new Error("no live button labelled '" + text + "'");
  }
  button.props.click_func();
}
