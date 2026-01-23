type Cleanup = () => void;

export function connectScreeningWS(
  screeningId: number | string,
  onEvent: (data: any) => void,
  onStatus?: (status: "open" | "closed" | "error") => void
): Cleanup {
  const base = process.env.NEXT_PUBLIC_WS_URL;

  if (!base) {
    console.warn("Missing NEXT_PUBLIC_WS_URL (WS updates disabled).");
    return () => {};
  }

  const url = `${base}/${screeningId}/`;

  const ws = new WebSocket(url);

  ws.onopen = () => onStatus?.("open");
  ws.onclose = () => onStatus?.("closed");
  ws.onerror = () => onStatus?.("error");

  ws.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      onEvent(data);
    } catch {
    }
  };

  return () => ws.close();
}
