// SPDX-License-Identifier: AGPL-3.0-or-later

const TURN = Math.PI * 2;
const GRAVITY = 5.8; // The runner's existing jump acceleration; presentation only.
const RELEASE_TIME = 0.065;
const FLIP_START = 0.075;
const FLIP_END = 0.485;
const CATCH_TIME = 0.11;
const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/** Retained timing state for one jump; no objects are allocated by update. */
export function createBoardTrick() {
  const result = { rotation: 0, release: 0, active: false };
  let lastElapsed = Number.NaN;
  let cycle = false;
  let suppressed = false;
  let aborted = false;
  let start = 0;
  let finish = 0;
  let progress = 0;
  let catchStart = Number.POSITIVE_INFINITY;
  let catchDuration = CATCH_TIME;
  let abortStart = 0;
  let abortRelease = 0;
  let abortDuration = 0.05;
  let lastJumpVelocity = 0;

  function clear() {
    cycle = false;
    suppressed = false;
    aborted = false;
    progress = 0;
    catchStart = Number.POSITIVE_INFINITY;
    result.rotation = 0;
    result.release = 0;
    result.active = false;
    lastJumpVelocity = 0;
  }

  return {
    reset(): void {
      clear();
      lastElapsed = Number.NaN;
    },
    update(jump: number, jumpVelocity: number, flightHeight: number, flightTimer: number, elapsed: number, reducedMotion: boolean) {
      if (!Number.isFinite(jump + jumpVelocity + flightHeight + flightTimer + elapsed)) {
        clear();
        lastElapsed = Number.NaN;
        return result;
      }
      if (elapsed < lastElapsed) clear();
      // A redraw while paused must preserve an in-flight trick, even if its
      // caller disables decorative motion for that redraw.
      if (elapsed === lastElapsed) return result;
      const previous = Number.isFinite(lastElapsed) && elapsed >= lastElapsed ? lastElapsed : elapsed;
      lastElapsed = elapsed;
      const airborne = jump > 0 || jumpVelocity > 0;
      const flying = flightTimer > 0 || flightHeight > 0;
      // The engine permits a fresh jump in the final .03 of descent. That
      // positive impulse starts another trick even without a grounded frame.
      if (cycle && !flying && jumpVelocity > 0 && jumpVelocity > lastJumpVelocity + 0.25) clear();
      lastJumpVelocity = jumpVelocity;
      if (!airborne && !flying) {
        clear();
        return result;
      }
      if (!cycle && airborne && !flying) {
        cycle = true;
        suppressed = reducedMotion;
        start = elapsed;
        finish = elapsed + FLIP_END;
        progress = 0;
        catchStart = Number.POSITIVE_INFINITY;
      }
      if (!cycle || suppressed) return result;

      // The positive ballistic root predicts touchdown after a forced fast
      // fall as well as a normal jump. Reserve time for a level, planted catch.
      const remaining = Math.max(0, (jumpVelocity + Math.sqrt(jumpVelocity * jumpVelocity + 2 * GRAVITY * Math.max(0, jump))) / GRAVITY);
      const interrupted = flying || reducedMotion;
      if (progress < 1 && !aborted) {
        if (interrupted) {
          finish = Math.min(finish, elapsed + 0.1);
        } else {
          finish = Math.min(finish, elapsed + remaining - Math.min(CATCH_TIME, remaining * 0.4) - 0.025);
        }
        // An early slide can end a jump before a safe flip has even started.
        // Keep the deck level and return the lifted feet instead of starting
        // a turn that cannot finish before touchdown.
        if (progress === 0 && (interrupted || finish < start + FLIP_START + 0.12)) {
          aborted = true;
          abortStart = elapsed;
          abortRelease = result.release;
          abortDuration = interrupted ? 0.065 : Math.max(0.016, Math.min(0.065, remaining - 0.025));
        }
      }

      if (aborted) {
        result.release = abortRelease * (1 - smooth((elapsed - abortStart) / abortDuration));
        result.active = result.release > 0;
        return result;
      }

      if (progress < 1 && elapsed > start + FLIP_START) {
        const from = Math.max(previous, start + FLIP_START);
        const portion = finish <= elapsed ? 1 : Math.min(1, Math.max(0, (elapsed - from) / (finish - from)));
        progress += (1 - progress) * portion;
        if (progress >= 1 - 1e-10) {
          progress = 1;
          catchStart = Math.max(previous, Math.min(elapsed, finish));
          catchDuration = interrupted ? 0.065 : Math.max(0.016, Math.min(CATCH_TIME, remaining - 0.025));
        }
      }
      result.rotation = TURN * smooth(progress);
      result.release = progress === 1
        ? 1 - smooth((elapsed - catchStart) / catchDuration)
        : smooth((elapsed - start) / RELEASE_TIME);
      result.active = progress < 1 || result.release > 0;
      return result;
    },
  };
}
