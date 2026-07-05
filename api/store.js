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

  // URL/TOKEN 값에 실수로 따옴표/공백이 섞여도 자동 정리
  const cleanURL = String(URL).trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  const cleanTOKEN = String(TOKEN).trim().replace(/^["']|["']$/g, "");

  const NS = "eb:"; // 키 네임스페이스
  async function cmd(arr) {
    const r = await fetch(cleanURL, {
      method: "POST",
      headers: { Authorization: "Bearer " + cleanTOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(arr),
    });
    const j = await r.json().catch(() => ({}));
    return { status: r.status, j };
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { action, key, value, prefix } = body;

    if (action === "diag") {
      const setR = await cmd(["SET", NS + "__diag", "hello123"]);
      const getR = await cmd(["GET", NS + "__diag"]);
      res.status(200).json({
        ok: true, version: "v3-diag",
        envFound: {
          KV_URL: !!process.env.KV_REST_API_URL, KV_TOKEN: !!process.env.KV_REST_API_TOKEN,
          UP_URL: !!process.env.UPSTASH_REDIS_REST_URL, UP_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
        },
        urlHost: cleanURL.replace(/^https?:\/\//, "").split("/")[0],
        tokenLen: cleanTOKEN.length,
        setResult: setR, getResult: getR,
      });
      return;
    }

    if (action === "get") {
      const { j } = await cmd(["GET", NS + key]);
      if (j && j.error) { res.status(200).json({ ok: false, error: j.error }); return; }
      res.status(200).json({ ok: true, value: j.result != null ? j.result : null });
    } else if (action === "set") {
      const { j } = await cmd(["SET", NS + key, JSON.stringify(value)]);
      if (j && j.error) { res.status(200).json({ ok: false, error: j.error }); return; }
      res.status(200).json({ ok: true });
    } else if (action === "del") {
      const { j } = await cmd(["DEL", NS + key]);
      if (j && j.error) { res.status(200).json({ ok: false, error: j.error }); return; }
      res.status(200).json({ ok: true });
    } else if (action === "list") {
      const { j } = await cmd(["KEYS", NS + (prefix || "") + "*"]);
      if (j && j.error) { res.status(200).json({ ok: false, error: j.error }); return; }
      const keys = (j.result || []).map((k) => k.slice(NS.length));
      res.status(200).json({ ok: true, keys });
    } else {
      res.status(400).json({ error: "bad action" });
    }
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e) });
  }
}
