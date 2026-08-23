import { describe, expect, it } from "vitest";

import { parseWorkbenchDeepLink } from "./workbench-deep-link";

describe("parseWorkbenchDeepLink", () => {
  it("reports no request for a clean URL", () => {
    expect(parseWorkbenchDeepLink("")).toEqual({
      requested: false,
      appId: null,
      workspaceId: null,
    });
    expect(parseWorkbenchDeepLink("?utm_source=newsletter").requested).toBe(false);
  });

  it("parses a shared app + workspace link", () => {
    expect(parseWorkbenchDeepLink("?app=pulse&workspace=field")).toEqual({
      requested: true,
      appId: "pulse",
      workspaceId: "field",
    });
  });

  it("falls back safely for unknown app and workspace ids", () => {
    expect(parseWorkbenchDeepLink("?app=nope&workspace=nowhere")).toEqual({
      requested: true,
      appId: null,
      workspaceId: null,
    });
  });

  it("keeps a valid workspace when the app id is unknown", () => {
    expect(parseWorkbenchDeepLink("?app=nope&workspace=notes")).toEqual({
      requested: true,
      appId: null,
      workspaceId: "notes",
    });
  });

  it("treats bare trigger params as open requests", () => {
    expect(parseWorkbenchDeepLink("?workbench")).toEqual({
      requested: true,
      appId: null,
      workspaceId: null,
    });
    expect(parseWorkbenchDeepLink("?open=1").requested).toBe(true);
  });

  it("ignores empty app and workspace values", () => {
    expect(parseWorkbenchDeepLink("?app=&workspace=")).toEqual({
      requested: true,
      appId: null,
      workspaceId: null,
    });
  });
});
