// api/chat.js — Vercel serverless function
// 브라우저의 요청을 받아 Anthropic API로 안전하게 대신 호출합니다.
// API 키는 절대 프론트로 노출되지 않고, 서버 환경변수(ANTHROPIC_API_KEY)에만 존재합니다.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: "서버에 ANTHROPIC_API_KEY 환경변수가 없습니다." });
    return;
  }
  try {
    // Vercel은 application/json 본문을 자동 파싱해 req.body에 넣어줍니다.
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

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
