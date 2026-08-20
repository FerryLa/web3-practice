# CHAP 05 — 백엔드 JWT 검증

브라우저가 전달한 Xsolla 사용자 JWT를 백엔드에서 검증한다. 프런트엔드의 JWT 디코딩 결과나 로그인 UI 상태는 인증 근거로 사용하지 않는다.

## 검증 흐름

```text
Frontend
  → Authorization: Bearer <JWT>
  → POST http://localhost:3001/api/auth/verify

Backend
  → JWT 헤더의 alg=RS256, kid 확인
  → Xsolla 프로젝트 JWKS 조회 및 5분 캐시
  → RSA SHA-256 서명 검증
  → iss, exp, iat, sub 검증
  → xsolla_login_project_id 일치 확인
  → 검증된 사용자 ID만 응답
```

Xsolla 사용자 JWT의 필수 클레임에는 일반적인 `aud` 대신 `xsolla_login_project_id`가 포함된다. 이 서버는 환경 변수의 Login Project ID와 해당 클레임을 비교한다.

## 실행

```powershell
cd xsolla_webshop/backend
Copy-Item .env.example .env.local
npm run dev
```

`.env.local`에서 실제 Login Project ID를 설정한다.

```dotenv
XSOLLA_LOGIN_PROJECT_ID=YOUR_LOGIN_PROJECT_UUID
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
XSOLLA_REMOTE_USER_VALIDATION=false
```

프런트엔드 `.env.local`에도 백엔드 주소를 추가하고 개발 서버를 다시 시작한다.

```dotenv
VITE_AUTH_API_URL=http://localhost:3001
```

로그인 후 상단 상태가 `서버 검증됨`으로 표시되면 백엔드 검증을 통과한 것이다.

## API

### 상태 확인

```http
GET /health
```

정상 응답:

```json
{"status":"ok"}
```

### 사용자 JWT 검증

```http
POST /api/auth/verify
Authorization: Bearer <Xsolla user JWT>
```

정상 토큰은 `200 OK`와 검증된 사용자 ID를 반환한다. JWT 원문은 응답이나 로그에 포함하지 않는다.

누락·변조·만료·다른 Login 프로젝트의 토큰은 `401 Unauthorized`, JWKS 또는 Xsolla 검증 서비스 장애는 `503 Service Unavailable`을 반환한다.

## 선택적 사용자 존재 검증

기본 검증은 프로젝트 JWKS를 사용해 백엔드 내부에서 수행한다. 아래 설정을 활성화하면 로컬 검증 후 Xsolla의 `/api/token/validate`도 호출하여 사용자 존재 여부까지 확인한다.

```dotenv
XSOLLA_REMOTE_USER_VALIDATION=true
```

이 호출에는 Xsolla의 클라이언트 측 rate limit이 적용되므로 모든 API 요청마다 반복하기보다는 로그인 또는 서버 세션 생성 시점에 사용하는 편이 적합하다.

## 테스트 사용자에게 회원 속성 부여

Server OAuth 2.0 Client에서 받은 값을 `.env.local`에만 저장한다.

```dotenv
XSOLLA_SERVER_CLIENT_ID=YOUR_SERVER_CLIENT_ID
XSOLLA_SERVER_CLIENT_SECRET=YOUR_SERVER_CLIENT_SECRET
XSOLLA_PUBLISHER_ID=YOUR_PUBLISHER_ID
XSOLLA_PUBLISHER_PROJECT_ID=312439
```

`user-id`에는 `/api/auth/verify` 응답의 `user.id`, 즉 사용자 JWT의 `sub` UUID를 입력한다. `<`와 `>` 문자는 명령에 포함하지 않는다.

```powershell
npm run member:grant -- --user-id a169451c-8525-4352-b8ca-070dd449a1a5
```

이 명령은 Server JWT를 발급받아 `webshop_member="true"` 읽기 전용 속성을 저장하고, 같은 속성을 다시 조회해 결과를 검증한다. 반대 조건은 다음 명령으로 확인한다.

```powershell
npm run member:revoke -- --user-id a169451c-8525-4352-b8ca-070dd449a1a5
```

속성을 변경한 후에는 웹숍에서 로그아웃하고 다시 로그인한 뒤 카탈로그를 새로 불러온다.

## 테스트

```powershell
npm test
```

테스트에는 정상 토큰, 만료, 발급자·프로젝트 불일치, 페이로드 변조, 알고리즘 혼동, JWKS 캐시, API 오류 응답과 회원 속성 저장 흐름이 포함된다.

## 완료 기준

- [x] RS256 이외의 알고리즘 거부
- [x] 프로젝트 JWKS로 서명 검증
- [x] `iss`, `exp`, `iat`, `sub` 검증
- [x] `xsolla_login_project_id` 검증
- [x] 누락·변조·만료 토큰에 `401` 반환
- [x] 허용된 프런트엔드 Origin만 CORS 허용
- [x] 테스트에서 JWT 원문을 응답하지 않는지 확인
- [x] 실제 Xsolla JWT로 상단의 `서버 검증됨` 표시 확인

## 공식 문서

- [JWT signature](https://developers.xsolla.com/authenticate-users/login/security/jwt-signature/)
- [Get JSON Web Key Set](https://developers.xsolla.com/api/login/product-configuration-rsa/json-web-key-set)
- [Validate user JWT](https://developers.xsolla.com/api/login/token-management/validate-jwt)
