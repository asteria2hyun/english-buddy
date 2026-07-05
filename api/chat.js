// api/chat.js — Vercel serverless function
// 브라우저의 요청을 받아 Anthropic API로 안전하게 대신 호출합니다.
// API 키는 절대 프론트로 노출되지 않고, 서버 환경변수(ANTHROPIC_API_KEY)에만 존재합니다.
//
// 보안 계층 (이 프록시가 무방비로 요금 폭탄을 맞지 않도록):
//   1) Origin 허용목록  — 내 배포 도메인(+ ALLOWED_ORIGINS)에서 온 브라우저 요청만 허용
//   2) 모델 화이트리스트 — 임의의(비싼) 모델 호출 차단
//   3) max_tokens 상한  — 한 번에 태울 수 있는 토큰 제한
//   4) rate limit       — IP당 시간창 요청 횟수 제한 (웜 인스턴스 기준)
//
// (선택) 다른 도메인에서도 열려면 Vercel 환경변수 ALLOWED_ORIGINS 에
//        "https://a.com,https://b.com" 처럼 콤마로 추가하세요.

const ALLOWED_MODELS = new Set([
  "claude-haiku-4-5-20251001", // 대화·퀴즈
  "claude-sonnet-5"            // 보고서
]);
const MAX_TOKENS_CAP = 2000;
const RATE_MAX = 40;            // 시간창당 최대 요청 수
const RATE_WINDOW_MS = 60000;   // 1분
const hits = new Map();         // ip -> timestamps[]

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (xf) return String(xf).split(",")[0].trim();
  return (req.socket && req.socket.remoteAddress) || "unknown";
}
function rateLimited(ip, now) {
  const arr = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear(); // 메모리 폭주 방지
  return arr.length > RATE_MAX;
}
function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // 동일 출처 요청은 Origin이 없을 수 있음 → 다른 계층으로 방어
  let host;
  try { host = new URL(origin).host; } catch (e) { return false; }
  if (host === req.headers.host) return true; // 같은 배포 도메인
  const allow = (process.env.ALLOWED_ORIGINS || "")
    .split(",").map(s => s.trim()).filter(Boolean)
    .map(s => { try { return new URL(s).host; } catch (e) { return s; } });
  return allow.includes(host);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  if (!originAllowed(req)) {
    res.status(403).json({ error: "허용되지 않은 출처입니다." });
    return;
  }
  const now = Date.now();
  if (rateLimited(clientIp(req), now)) {
    res.status(429).json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해주세요." });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: "서버에 ANTHROPIC_API_KEY 환경변수가 없습니다." });
    return;
  }
  try {
    // Vercel은 application/json 본문을 자동 파싱해 req.body에 넣어줍니다.
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    // 모델 화이트리스트 + 토큰 상한
    if (!ALLOWED_MODELS.has(body.model)) {
      res.status(400).json({ error: "허용되지 않은 모델입니다." });
      return;
    }
    body.max_tokens = typeof body.max_tokens === "number"
      ? Math.min(body.max_tokens, MAX_TOKENS_CAP)
      : 1000;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });

    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
