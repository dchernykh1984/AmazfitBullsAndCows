// The source of the secret code.
//
// The whole game rests on the code being unguessable, and on an embedded JS
// engine `Math.random` is not promised to be seeded from entropy at cold start:
// if it is not, every launch of the app deals the same first code, and the
// second game a player opens is already solved. That is the one bug this module
// exists to make impossible.
//
// So the sequence is generated here, from a seed mixed out of two independent
// sources: the clock, which differs on every launch, and one sample of the
// platform's own `Math.random`, which is genuinely random on any device that
// seeds it properly. Either one alone is enough; both are used because the whole
// point is not knowing which is trustworthy.
//
// Pure, so the sequence can be pinned in a test.

// mulberry32: a small, fast, well-distributed PRNG. It is not cryptographic, and
// does not need to be - the secret it draws is on the wrist of the person
// guessing it, and nothing is being defended against them.
export function seededRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A 32-bit seed from a clock reading and a fraction in [0, 1). Anything
// unreadable from either source contributes a constant rather than a NaN, so a
// device with a stopped clock still gets whatever the other source is worth.
export function mixSeed(clock, sample) {
  const time = Number.isFinite(Number(clock)) ? Math.floor(Number(clock)) : 0;
  const fraction = Number.isFinite(Number(sample)) ? Number(sample) : 0;
  const spread = Math.floor(Math.abs(fraction % 1) * 4294967296);
  // The clock's low bits move fastest, so they are the ones worth keeping.
  return ((time >>> 0) ^ Math.imul(spread ^ 0x9e3779b9, 0x85ebca6b)) >>> 0 || 1;
}

// The random source the app plays with, seeded once per launch.
export function createRandom(clock, sample) {
  return seededRandom(mixSeed(clock, sample));
}
