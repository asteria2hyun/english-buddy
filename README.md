# 잉글리시 버디 — 배포 가이드

폰에서 마이크(음성 대화·발음 채점)까지 제대로 쓰려면 **https 주소로 배포**해야 합니다.
(다운로드한 파일을 `content://`나 `file://`로 열면 브라우저가 마이크를 아예 막습니다.)

이 폴더는 Vercel에 그대로 올리면 되는 구성입니다.

```
english-buddy-deploy/
├─ index.html      ← 앱 본체 (/api/chat 호출)
├─ api/
│  └─ chat.js      ← API 키를 숨기는 서버 함수
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
현재 프로필/기록은 브라우저 세션(메모리)에 저장돼, 브라우저 데이터를 지우면 사라집니다.
여러 기기에서 공유하거나 영구 보관하려면 Supabase 같은 DB로 바꾸면 됩니다. (원하면 다음 단계로)
