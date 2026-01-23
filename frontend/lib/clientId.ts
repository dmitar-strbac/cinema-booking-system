export function getClientId(): string {
  if (typeof window === "undefined") return "";
  const key = "cinema_client_id";

  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}
