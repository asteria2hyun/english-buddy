// api/store.js — 프로필·기록·기억을 서버에 저장 (기기 간 동기화)
// Vercel KV(Upstash Redis) 또는 Upstash Redis REST 환경변수를 사용합니다.
//   KV_REST_API_URL / KV_REST_API_TOKEN      (Vercel Storage → KV 연결 시 자동 주입)
//   또는 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
// 환경변수가 없으면 {disabled:true}를 반환하고, 앱은 자동으로 기기별 localStorage 저장으로 넘어갑니다.

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }

  const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!URL || !TOKEN) { res.status(200).json({ disabled: true }); return; }

  const NS = "eb:"; // 키 네임스페이스
  async function cmd(arr) {
    const r = await fetch(URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(arr),
    });
    return r.json();
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { action, key, value, prefix } = body;

    if (action === "get") {
      const d = await cmd(["GET", NS + key]);
      res.status(200).json({ ok: true, value: d.result != null ? d.result : null });
    } else if (action === "set") {
      await cmd(["SET", NS + key, JSON.stringify(value)]);
      res.status(200).json({ ok: true });
    } else if (action === "del") {
      await cmd(["DEL", NS + key]);
      res.status(200).json({ ok: true });
    } else if (action === "list") {
      const d = await cmd(["KEYS", NS + (prefix || "") + "*"]);
      const keys = (d.result || []).map((k) => k.slice(NS.length));
      res.status(200).json({ ok: true, keys });
    } else {
      res.status(400).json({ error: "bad action" });
    }
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e) });
  }
}
