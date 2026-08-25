// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

import { describe, expect, it } from "vitest";

import { resolveSoundEnabledPreference } from "./workbench-sound";

describe("workbench sound preference resolution (opt-in)", () => {
  it("resolves off for first-time visitors with no stored preference", () => {
    expect(resolveSoundEnabledPreference(null)).toBe(false);
  });

  it("resolves on when a stored enablement exists", () => {
    expect(resolveSoundEnabledPreference("true")).toBe(true);
  });

  it("resolves off when a stored disablement exists", () => {
    expect(resolveSoundEnabledPreference("false")).toBe(false);
  });
});
