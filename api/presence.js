// api/presence.js — 동시 접속 캐릭터(프레즌스)
// 각 기기가 15초마다 POST로 '나 접속 중'(id+이모지)을 남기고(30초 TTL),
// GET으로 최근 접속자들의 이모지 목록을 받아 화면에 캐릭터로 띄웁니다.
// 저장은 store.js와 같은 KV(Upstash) 사용. 미설정이면 {disabled:true, list:[]} 반환.

function pickEnv(suffixes){
  for(const k of Object.keys(process.env)){
    const up=k.toUpperCase();
    if(process.env[k] && suffixes.some(s=>up.endsWith(s))) return process.env[k];
  }
  return "";
}
const KV_URL = pickEnv(["REST_API_URL", "REDIS_REST_URL"]);
const KV_TOKEN = pickEnv(["REST_API_TOKEN", "REDIS_REST_TOKEN"]);
const NS = "eb:presence:";
const TTL = 30;      // 초. 이 시간 안에 신호 없으면 자동 사라짐
const MAX = 24;      // 화면에 띄울 최대 인원

async function cmd(arr){
  const r = await fetch(String(KV_URL).replace(/\/+$/, ""), {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(arr)
  });
  return r.json().catch(() => ({}));
}

export default async function handler(req, res){
  if(!KV_URL || !KV_TOKEN){ res.status(200).json({ disabled: true, list: [] }); return; }
  try{
    if(req.method === "POST"){
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const id = String(body.id || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
      const emoji = String(body.emoji || "🦊").slice(0, 8);
      if(!id){ res.status(400).json({ error: "no id" }); return; }
      // outfit: 꾸미기 아이템(작은 객체). 문자열 값만 얕게 정리해 저장
      let outfit = {};
      if(body.outfit && typeof body.outfit === "object"){
        for(const k of ["hat","face","neck","buddy","bg"]) if(typeof body.outfit[k] === "string") outfit[k] = body.outfit[k].slice(0, 30);
      }
      await cmd(["SET", NS + id, JSON.stringify({ emoji, outfit, ts: Date.now() }), "EX", TTL]);
      res.status(200).json({ ok: true });
      return;
    }
    // GET → 접속 목록 (id는 캐릭터 구분용 비개인 토큰, 이모지만 화면 노출)
    const keysR = await cmd(["KEYS", NS + "*"]);
    const keys = (keysR && keysR.result) || [];
    let list = [];
    if(keys.length){
      const valsR = await cmd(["MGET", ...keys.slice(0, 200)]);
      const vals = (valsR && valsR.result) || [];
      const now = Date.now();
      list = keys.map((k, i) => {
        let x = null; try { x = JSON.parse(vals[i]); } catch(e){}
        if(!x || !x.emoji || (now - (x.ts || 0) >= (TTL + 5) * 1000)) return null;
        return { id: String(k).slice(NS.length), emoji: x.emoji };
      }).filter(Boolean).slice(0, MAX);
    }
    res.status(200).json({ list });
  }catch(e){
    res.status(200).json({ list: [], error: String(e) });
  }
}
