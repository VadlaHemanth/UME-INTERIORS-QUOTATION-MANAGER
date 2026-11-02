/** Accept the Copy button contents or one complete JSON code block from an assistant. */
export function parseStudioJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = /^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i.exec(trimmed);
  return JSON.parse(fence ? fence[1] : trimmed);
}
