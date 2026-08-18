# Xsolla Webshop 학습 프로젝트

게임용 D2C 웹숍의 로그인, 상품 카드, 개인화 카탈로그를 작은 단계로 구현한다.

## 오늘의 범위

- **Publisher Account 70%**
  - Login 프로젝트 생성
  - Google·Apple 소셜 로그인 연결
  - Callback URL과 Error callback URL 등록
  - 로그인 위젯 디자인
  - 상품 카탈로그 및 개인화 설정
- **프런트엔드 20%**
  - Login project ID로 위젯 열기
  - 로그인 결과 처리
  - BLUC 패키지형 상품 카드 표시
- **백엔드 10%**
  - 로그인 토큰 검증 개념
  - 사용자 검증 및 결제 웹훅 개념

## 진행 원칙

1. Publisher Account 설정을 먼저 완료한다.
2. 결제 기능은 오늘 구현하지 않는다.
3. Google·Apple의 Client Secret과 Private Key는 저장소에 기록하지 않는다.
4. 프런트엔드에 노출해도 되는 Login project ID와 비밀 키를 구분한다.
5. 각 단계를 완료할 때 아래 체크리스트를 갱신한다.

## 학습 체크리스트

### 1. Publisher Account

- [x] Xsolla Publisher Account 로그인
- [x] 학습용 프로젝트 생성 또는 기존 프로젝트 선택
- [x] `Players > Login`에서 Standard Login 프로젝트 생성
- [x] 로그인 방법을 `Social login`으로 설정
- [x] Callback URL 등록
- [x] Allowed origins(CORS) 등록
- [x] Google 로그인 연결
- [ ] Apple 자체 로그인 연결 — 유료 Apple Developer Program이 필요해 보류
- [ ] 위젯 로고, 색상, 문구 설정
- [x] BLUC 상품 카탈로그 구성
- [x] 로그인 사용자용 추가 혜택 및 표시 규칙 설계

## 학습 챕터

- [CHAP 01 — Login](./login/README.md)
- [CHAP 02 — Catalog](./catalog/README.md)
- [CHAP 03 — Personalization](./personalization/README.md)
- [CHAP 04 — Frontend Integration](./frontend/README.md)

### 2. 프런트엔드

- [x] 개발 서버와 callback 페이지 생성
- [x] 환경 변수로 Login project ID 설정
- [x] Xsolla Login 위젯 열기
- [x] callback의 로그인 결과 처리
- [x] 기본 상품 카드 표시
- [x] 로그인 후 개인화 상품 카드 표시

### 3. 백엔드 개념

- [ ] 브라우저가 전달한 토큰을 그대로 신뢰하지 않는 이유 이해
- [ ] 서버의 토큰 및 사용자 검증 흐름 이해
- [ ] 웹훅 서명 검증과 멱등성 개념 이해

## 1단계: Login 프로젝트 생성

Publisher Account에서 다음 순서로 진행한다.

1. Xsolla Publisher Account에 로그인한다.
2. 학습에 사용할 Publisher 프로젝트를 생성하거나 선택한다.
3. 왼쪽 메뉴에서 `Players > Login`으로 이동한다.
4. `Create Login project`를 누른다.
5. `Standard Login project`를 선택한다.
6. 프로젝트 이름은 `webshop-learning`처럼 용도를 알 수 있게 작성한다.
7. 로그인 방법은 `Social login`을 선택한다.

생성이 끝나면 표시되는 **Login ID(UUID)**가 프런트엔드에서 사용할 `projectId`다. 이 값은 비밀번호가 아니지만 저장소에 직접 고정하지 않고 나중에 환경 변수로 관리한다.

## Google 로그인 확인 결과

- Xsolla Login 위젯 모달이 정상적으로 열렸다.
- 위젯에 Google 로그인 버튼이 정상적으로 표시되었다.
- Google 계정 인증과 로그인 결과를 확인했다.
- Callback URL 관리 화면의 렌더링 오류는 별도 이슈로 기록한다.

## Apple 로그인 결정

- Xsolla 기본 Apple 연결 개념은 확인했다.
- 자체 App ID, Services ID 및 `.p8` 키 구성은 Apple Developer Program 비용이 필요해 이번 학습에서 보류한다.
- 추후 회사 프로젝트에서는 회사 Apple Developer Team에서 별도로 구성한다.

## 개발용 URL 초안

프런트엔드 개발 서버는 다음 주소를 사용할 예정이다.

- 앱: `http://localhost:3000`
- 로그인 성공 callback: `http://localhost:3000/auth/callback`
- 로그인 오류 callback: `http://localhost:3000/auth/error`
- Allowed origin: `http://localhost:3000`

개발 서버를 만들기 전에는 이 URL이 열리지 않는 것이 정상이다. Publisher Account가 HTTPS callback만 허용하거나 소셜 제공자가 로컬 주소를 제한하면 HTTPS 개발 터널 주소로 교체한다.

### 서로 다른 두 callback 구분하기

- **Xsolla Login 프로젝트 Callback URL**
  - 로그인 완료 후 Xsolla가 우리 웹앱으로 사용자를 돌려보내는 주소
  - 개발용: `http://localhost:3000/auth/callback`
- **Google·Apple OAuth Redirect URI**
  - 소셜 제공자가 인증 결과를 Xsolla로 돌려보내는 주소
  - `https://login.xsolla.com/api/social/oauth2/callback`

두 값을 서로 바꾸어 입력하지 않는다.

## 비밀 정보 취급

다음 값은 채팅, 코드, README 또는 Git에 넣지 않는다.

- Google Client Secret
- Apple private key (`.p8`) 내용
- Apple client secret
- Xsolla webhook secret
- 운영용 API key

## 공식 문서

- [Set up Login project](https://developers.xsolla.com/authenticate-users/login/integration-guide/set-up-login-project/)
- [Social login](https://developers.xsolla.com/authenticate-users/login/authentication-options/social-login/)
- [Web Shop authentication](https://developers.xsolla.com/solutions/web-shop/create-web-shop/set-up-authentication/)
