export async function fetchSource(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36",
      accept:
        "text/html,application/pdf,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    signal: AbortSignal.timeout(30_000)
  });

  if (!response.ok) {
    throw new Error(`Fetch failed with status ${response.status} for ${url}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const buffer = Buffer.from(await response.arrayBuffer());

  return {
    contentType,
    buffer,
    text: buffer.toString("utf8")
  };
}
