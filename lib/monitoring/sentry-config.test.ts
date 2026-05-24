import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import {
  isBrowserTranslationRemoveChildError,
  scrubSentryEvent,
} from "./sentry-config";

function removeChildEvent(
  extra?: Partial<ErrorEvent>,
): ErrorEvent {
  return {
    exception: {
      values: [
        {
          type: "NotFoundError",
          value:
            "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.",
        },
      ],
    },
    ...extra,
  } as ErrorEvent;
}

describe("isBrowserTranslationRemoveChildError", () => {
  it("returns false for unrelated errors", () => {
    const event = {
      exception: { values: [{ type: "TypeError", value: "x" }] },
    } as ErrorEvent;
    expect(isBrowserTranslationRemoveChildError(event)).toBe(false);
  });

  it("returns true when breadcrumbs mention translated-ltr", () => {
    const event = removeChildEvent({
      breadcrumbs: [{ message: "UI Click → html.translated-ltr.dark" }],
    });
    expect(isBrowserTranslationRemoveChildError(event)).toBe(true);
    expect(scrubSentryEvent(event)).toBeNull();
  });

  it("returns false for removeChild without translation signals", () => {
    const event = removeChildEvent();
    expect(isBrowserTranslationRemoveChildError(event)).toBe(false);
    expect(scrubSentryEvent(event)).not.toBeNull();
  });
});
