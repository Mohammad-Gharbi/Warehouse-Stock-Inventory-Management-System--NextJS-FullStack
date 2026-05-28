import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createGroqChatCompletion,
  DEFAULT_GROQ_MODEL,
  resolveGroqModel,
} from "./groq";

describe("createGroqChatCompletion", () => {
  const originalKey = process.env.GROQ_API_KEY;

  beforeEach(() => {
    process.env.GROQ_API_KEY = "test-groq-key";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    process.env.GROQ_API_KEY = originalKey;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("resolveGroqModel ignores OpenRouter slugs", () => {
    delete process.env.GROQ_MODEL;
    expect(resolveGroqModel("openai/gpt-3.5-turbo")).toBe(DEFAULT_GROQ_MODEL);
    expect(resolveGroqModel("llama-3.3-70b-versatile")).toBe(
      "llama-3.3-70b-versatile",
    );
  });

  it("uses DEFAULT_GROQ_MODEL when OpenRouter slug passed to API", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "1",
          choices: [
            {
              message: { role: "assistant", content: "ok" },
              finish_reason: "stop",
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await createGroqChatCompletion([{ role: "user", content: "hi" }], {
      model: "openai/gpt-3.5-turbo",
    });

    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0]?.[1]?.body as string) ?? "{}",
    );
    expect(body.model).toBe(DEFAULT_GROQ_MODEL);
  });

  it("returns data on success", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "1",
          choices: [
            {
              message: { role: "assistant", content: "groq-ok" },
              finish_reason: "stop",
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await createGroqChatCompletion([
      { role: "user", content: "hi" },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.choices[0]?.message.content).toBe("groq-ok");
      expect(result.provider).toBe("groq");
    }
  });
});
