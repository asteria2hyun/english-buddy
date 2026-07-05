# 잉글리시 버디 — 배포 가이드

폰에서 마이크(음성 대화·발음 채점)까지 제대로 쓰려면 **https 주소로 배포**해야 합니다.
(다운로드한 파일을 `content://`나 `file://`로 열면 브라우저가 마이크를 아예 막습니다.)

이 폴더는 Vercel에 그대로 올리면 되는 구성입니다.

```
english-buddy-deploy/
├─ index.html      ← 앱 본체 (/api/chat 호출)
├─ api/
│  ├─ chat.js      ← API 키를 숨기는 서버 함수
│  └─ store.js     ← 프로필·기록·기억 서버 저장 (기기 간 동기화, KV 연결 시 작동)
└─ README.md
```

---

## 방법 A. Vercel 웹으로 배포 (가장 쉬움, 5분)

1. 이 폴더를 GitHub 새 저장소에 올립니다. (기존에 쓰시던 방식대로)
2. https://vercel.com → **Add New → Project → 방금 만든 저장소 Import**
3. 설정은 기본값 그대로 두고, **Environment Variables**에 딱 하나 추가:
   - Name: `ANTHROPIC_API_KEY`
   - Value: 본인 Anthropic API 키 (`sk-ant-...`)
4. **Deploy** 클릭 → 잠시 뒤 `https://프로젝트이름.vercel.app` 주소가 나옵니다.
5. 그 주소를 **폰의 Chrome(안드로이드) 또는 Safari(아이폰)** 로 엽니다.
   - 처음 마이크 버튼을 누르면 권한 팝업이 뜨는데 **허용**하면 끝.

## 방법 B. Vercel CLI로 배포

```bash
npm i -g vercel
cd english-buddy-deploy
vercel            # 안내 따라 로그인/프로젝트 생성
vercel env add ANTHROPIC_API_KEY   # 키 입력
vercel --prod     # 실제 배포
```

---

## API 키 발급
https://console.anthropic.com → API Keys → Create Key

## 사용 모델 (필요시 index.html에서 변경 가능)
- 대화: `claude-haiku-4-5-20251001` (빠르고 저렴)
- 보고서: `claude-sonnet-5` (품질 우선)

index.html 안에서 `model:"..."` 부분만 바꾸면 다른 모델로 교체됩니다.

---

## 마이크가 여전히 안 될 때 체크리스트
- 주소가 **https://** 로 시작하는지 (content:// / file:// 이면 안 됨)
- **정식 Chrome / Safari** 인지 (웨일 등 일부 브라우저는 음성인식 서버가 막혀 'network' 에러가 날 수 있음)
- 입력창 아래 회색 글씨에 뜨는 **에러 코드** 확인:
  - `not-allowed` → 마이크 권한 (주소창 자물쇠/⋮ → 사이트 설정 → 마이크 허용)
  - `network` / `service-not-allowed` → 그 브라우저가 음성인식 미지원 → Chrome/Safari로
  - `audio-capture` → 마이크 장치 인식 안 됨

---

## 데이터 저장 참고
- 기본값: 프로필·기록·대화 기억이 **그 기기의 브라우저(localStorage)** 에 영구 저장됩니다. (새로고침해도 유지, 단 그 기기 안에서만)
- **여러 기기에서 같은 프로필을 쓰려면** 아래 KV(무료 Redis)를 연결하세요. 연결하면 자동으로 서버 저장으로 전환되고, 안 하면 기기별 저장으로 계속 작동합니다.

### 기기 간 동기화 설정 (Vercel KV / Upstash Redis, 무료)
1. Vercel 프로젝트 → **Storage** 탭 → **Create Database** → **Upstash for Redis**(또는 KV) 선택 → 만들기
2. 그 스토어를 **`english-buddy` 프로젝트에 Connect**  → `KV_REST_API_URL`, `KV_REST_API_TOKEN` 환경변수가 자동으로 추가됩니다.
   - (직접 Upstash를 쓰면 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 이름도 인식합니다.)
3. **Deployments → 최신 배포 ⋯ → Redeploy** (환경변수 반영)
4. 끝. 이제 폰·태블릿·PC 어디서 접속해도 같은 프로필/기록/기억이 보입니다.
