# CHAP 04 — 프런트엔드 통합

Xsolla Login Widget과 Store API를 연결하여 인증 전후의 BLUC 카탈로그를 렌더링하는 학습용 프런트엔드다.

## 실행

```powershell
cd xsolla_webshop/frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

`.env.local`에서 `VITE_XSOLLA_LOGIN_PROJECT_ID`를 Publisher Account의 **Login Project ID(UUID)**로 교체한다. `312439`는 Store API에 사용하는 카탈로그 프로젝트 ID이며 Login Project ID와 다르다.

Publisher Account에는 다음 주소를 등록한다.

- Callback URL: `http://localhost:3000/auth/callback`
- Error callback URL: `http://localhost:3000/auth/error`
- Allowed origin: `http://localhost:3000`

## 구현 흐름

```text
공개 화면 진입
  → 인증 헤더 없이 Store API 호출
  → 기본 BLUC 상품 6개 표시

Xsolla Login 성공
  → /auth/callback?token=<JWT>
  → JWT를 sessionStorage에 저장하고 URL에서 즉시 제거
  → Authorization: Bearer <JWT>로 Store API 재호출
  → 사용자 속성에 맞는 개인화 상품 표시
```

콜백 파서는 `token`과 `access_token`을 모두 지원하며 query string과 URL fragment를 확인한다. JWT payload 디코딩은 화면의 만료 상태를 돕기 위한 용도일 뿐, 토큰의 진위를 검증하지 않는다.

## 확인 시나리오

1. 비로그인 접속 시 기본 상품 6개가 보이는지 확인한다.
2. `webshop_member="true"`인 사용자로 로그인한다.
3. 상태 표시가 `개인화 카탈로그`로 바뀌는지 확인한다.
4. `bluc_pack_member_1200`을 포함한 7개 상품이 보이는지 확인한다.
5. 로그아웃 후 다시 기본 상품 6개만 보이는지 확인한다.

## 보안 경계

- 이 장은 브라우저에서 Xsolla 카탈로그 개인화를 확인하는 학습용 구현이다.
- JWT는 `localStorage`가 아니라 현재 탭의 `sessionStorage`에만 보관한다.
- URL의 JWT는 콜백 처리 직후 `history.replaceState`로 제거한다.
- 프런트엔드의 JWT 디코딩 결과로 구매 권한을 결정하지 않는다.
- 운영 서비스에서는 백엔드가 JWT 서명·발급자·대상·만료를 검증하고 안전한 세션 쿠키를 발급해야 한다.
- 구매 버튼은 CHAP 04 범위가 아니므로 비활성화되어 있다.
