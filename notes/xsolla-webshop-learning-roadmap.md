# Xsolla Web Shop 전체 학습 과정

## 1. 학습 목표

이 과정의 목표는 OVERDARE Webshop과 유사한 게임 웹숍의 핵심 흐름을 이해하고, 다음 기능을 직접 구동할 수 있는 수준에 도달하는 것이다.

1. Xsolla Publisher Account에서 Login 프로젝트를 구성한다.
2. 웹페이지에서 Google·Apple 기반 Xsolla Login 위젯을 연다.
3. 1,000~53,000 단위의 게임 재화 패키지형 상품 카드를 만든다.
4. 로그인한 사용자에게 추가 혜택이 포함된 개인화 카탈로그를 보여준다.
5. 이후 실제 결제와 게임 재화 지급을 연결할 수 있는 구조를 이해한다.

이 학습에서 다루는 시스템은 블록체인 지갑 기반 Web3 로그인이 아니라, 게임 계정과 외부 결제 플랫폼을 연결하는 일반적인 D2C 게임 웹숍이다.

---

## 2. 완성 구조

```text
사용자
  │
  ├─ Google·Apple 로그인
  ▼
Xsolla Login Widget
  │
  ├─ 인증 결과 및 토큰
  ▼
웹숍 프런트엔드
  │
  ├─ 공개/개인화 카탈로그 요청
  ▼
게임 백엔드
  │
  ├─ 사용자 검증
  ├─ 사용자 세그먼트 판정
  ├─ 상품 및 혜택 결정
  └─ 향후 결제 웹훅 처리
```

### 구성 요소의 역할

| 구성 요소 | 역할 |
|---|---|
| Publisher Account | Login 프로젝트, 소셜 로그인, 콜백 URL, 상품과 웹훅 설정 |
| Xsolla Login Widget | Google·Apple 등의 로그인 UI 제공 |
| 프런트엔드 | 로그인 버튼, 상품 카드, 사용자별 혜택 표시 |
| 게임 백엔드 | 토큰 검증, 사용자 조회, 개인화, 구매 결과 처리 |
| Xsolla Web Shop/Pay Station | 주문, 결제수단, 결제 화면과 결제 결과 처리 |

---

## 3. 학습 전에 준비할 것

### 필수

- Xsolla Publisher Account
- 테스트할 웹 프로젝트
- Node.js와 npm
- Callback URL로 사용할 개발 주소
- 브라우저 개발자 도구 사용법

### 소셜 로그인 준비

- Google Cloud 프로젝트와 OAuth 클라이언트
- Apple 로그인을 진행할 경우 Apple Developer 계정
- 운영 도메인 또는 HTTPS 개발 도메인

처음에는 Google 로그인만 연결한다. Apple 로그인은 Google 흐름이 정상적으로 구동된 후 진행한다.

---

## 4. 전체 학습 순서

## Phase 0. 핵심 개념 익히기

### 배울 내용

- Publisher Account 프로젝트와 Login 프로젝트의 차이
- `Login Project ID`와 SDK 버전의 차이
- OAuth 2.0, Callback URL, Access Token의 역할
- 인증(Authentication)과 권한 부여(Authorization)의 차이
- 공개 가능한 `projectId`와 비밀로 관리해야 하는 Client Secret의 차이

### 핵심 정리

- Login 프로젝트는 코드 버전이 아니라 인증 설정을 저장하는 단위다.
- 프런트엔드는 `projectId`를 사용하여 설정된 위젯을 연다.
- Google·Apple Client Secret은 프런트엔드 코드나 Git에 저장하지 않는다.
- 로그인 UI가 성공했다고 해서 서버 검증까지 완료된 것은 아니다.

### 완료 기준

- `projectId`, `callbackUrl`, `token`, `client secret`의 역할을 말로 설명할 수 있다.

---

## Phase 1. Publisher Account 기본 설정

### 실습 순서

1. Publisher Account에서 프로젝트를 생성한다.
2. `Players → Login`으로 이동한다.
3. `Standard Login project`를 생성한다.
4. 로그인 방식을 `Social login` 또는 필요한 혼합 방식으로 선택한다.
5. 개발용 Callback URL을 등록한다.
6. Login Project ID를 기록한다.
7. Publisher Account의 테스트 기능으로 기본 위젯을 확인한다.

### Standard와 Shadow Login

- `Standard Login`: 웹사이트와 일반 게임 사용자의 주 계정 인증에 사용한다.
- `Shadow Login`: 콘솔이나 특정 플랫폼 계정을 연결하는 크로스플랫폼 용도에 가깝다.

현재 실습에서는 `Standard Login`만 사용한다.

### 완료 기준

- Login 프로젝트가 생성되어 있다.
- 등록한 Callback URL과 Login Project ID를 확인할 수 있다.
- Publisher Account에서 로그인 위젯 미리보기가 열린다.

---

## Phase 2. Google 로그인 구동

### Publisher Account에서 할 일

1. Login 프로젝트의 Social Login 설정을 연다.
2. Google을 활성화한다.
3. 필요한 경우 Google OAuth Client ID와 Client Secret을 등록한다.
4. Google Cloud Console의 승인된 리디렉션 URI를 정확히 맞춘다.
5. 테스트 계정을 이용해 로그인한다.

### 프런트엔드에서 할 일

```bash
npm install @xsolla/login-sdk
```

```ts
import { Widget } from "@xsolla/login-sdk";

const widget = new Widget({
  projectId: "YOUR_LOGIN_PROJECT_ID",
  preferredLocale: "ko_KR",
  callbackUrl: "https://YOUR-DEV-DOMAIN/auth/callback",
});

document
  .querySelector("#login-button")
  ?.addEventListener("click", () => widget.open());
```

### 확인할 항목

- 버튼을 클릭하면 Xsolla 위젯이 열리는가?
- Google 버튼이 표시되는가?
- 로그인 후 지정한 Callback URL로 돌아오는가?
- 인증 실패와 위젯 닫기를 구분할 수 있는가?

### 완료 기준

- Google 로그인 후 개발용 Callback URL로 정상 복귀한다.
- URL이나 SDK 콜백에서 전달된 인증 결과를 확인할 수 있다.

---

## Phase 3. Apple 로그인 추가

Google 로그인이 완료된 후 진행한다.

### 배울 내용

- Apple Developer의 App ID와 Services ID
- Sign in with Apple Key
- Team ID와 Key ID
- Return URL과 도메인 설정
- Apple이 이름과 이메일을 최초 동의 시점에만 제공할 수 있다는 특성

### 실습 순서

1. Apple Developer에서 Sign in with Apple을 사용할 식별자를 준비한다.
2. 웹 인증용 Services ID를 구성한다.
3. 도메인과 Return URL을 등록한다.
4. 필요한 Key를 생성하고 안전하게 보관한다.
5. Xsolla의 Apple Social Login 설정에 값을 연결한다.
6. 실제 Apple ID로 최초 로그인과 재로그인을 모두 시험한다.

### 완료 기준

- Xsolla 위젯에 Google과 Apple 버튼이 함께 표시된다.
- 두 로그인 모두 같은 웹숍 사용자 모델로 변환할 수 있다.

---

## Phase 4. BLUC 패키지형 상품 카드

초기에는 Xsolla 상품 API를 연결하지 않고 로컬 데이터로 UI를 만든다.

### 상품 데이터 모델

```ts
type CurrencyPackage = {
  sku: string;
  baseAmount: number;
  bonusAmount: number;
  price: number;
  currency: "USD" | "KRW";
  image: string;
  badge?: string;
};
```

### 예제 카탈로그

```ts
const packages: CurrencyPackage[] = [
  { sku: "bluc_1000", baseAmount: 850, bonusAmount: 150, price: 4.99, currency: "USD", image: "/images/bluc-1000.webp" },
  { sku: "bluc_2050", baseAmount: 1700, bonusAmount: 350, price: 9.99, currency: "USD", image: "/images/bluc-2050.webp" },
  { sku: "bluc_4150", baseAmount: 3400, bonusAmount: 750, price: 19.99, currency: "USD", image: "/images/bluc-4150.webp" },
  { sku: "bluc_10700", baseAmount: 8500, bonusAmount: 2200, price: 49.99, currency: "USD", image: "/images/bluc-10700.webp" },
  { sku: "bluc_23500", baseAmount: 17000, bonusAmount: 6500, price: 99.99, currency: "USD", image: "/images/bluc-23500.webp" },
  { sku: "bluc_53000", baseAmount: 34000, bonusAmount: 19000, price: 199.99, currency: "USD", image: "/images/bluc-53000.webp" },
];
```

### 카드가 표시할 정보

- 상품 이미지
- 기본 재화 수량
- 보너스 재화 수량
- 총수량
- 가격과 통화
- 개인화 혜택 배지
- 구매 버튼

### 구현 원칙

- 총수량은 `baseAmount + bonusAmount`로 계산한다.
- 화면의 가격을 결제 기준으로 신뢰하지 않는다.
- 주문할 때 프런트엔드는 `sku`만 보내고 서버가 실제 가격과 수량을 확인한다.
- 모바일, 태블릿, 데스크톱에서 카드 그리드를 확인한다.

### 완료 기준

- 데이터 배열 하나로 여섯 개 상품 카드가 렌더링된다.
- 상품 데이터를 바꾸면 UI가 자동으로 변경된다.
- 반응형 화면에서 카드가 깨지지 않는다.

---

## Phase 5. 로그인 상태 관리

### 배울 내용

- 로그인 전과 로그인 후 UI 상태
- Xsolla 인증 결과를 애플리케이션 세션으로 변환하는 방법
- 토큰을 브라우저에 저장할 때의 위험
- 로그아웃과 세션 만료 처리

### 권장 흐름

```text
Xsolla 로그인 성공
  → 백엔드에 인증 결과 전달
  → 백엔드가 유효성 검증
  → 웹숍 전용 세션 발급
  → 프런트엔드가 사용자와 카탈로그 요청
```

가능하면 장기 토큰을 `localStorage`에 직접 저장하지 않고, 백엔드가 `HttpOnly`, `Secure`, `SameSite` 속성이 설정된 세션 쿠키를 발급하도록 구성한다.

### 완료 기준

- 새로고침 후에도 로그인 상태를 판별할 수 있다.
- 세션이 만료되면 공개 카탈로그로 돌아간다.
- 로그아웃 시 개인화 데이터가 화면에서 제거된다.

---

## Phase 6. 개인화 카탈로그

개인화 결과는 프런트엔드가 임의로 결정하지 않고 백엔드가 반환한다.

### 공개 카탈로그

```http
GET /api/catalog/public
```

### 로그인 사용자 카탈로그

```http
GET /api/catalog/personalized
Cookie: webshop_session=...
```

### 응답 예시

```json
{
  "segment": "new_user",
  "offers": [
    {
      "sku": "bluc_2050_welcome",
      "baseAmount": 1700,
      "bonusAmount": 850,
      "price": 9.99,
      "currency": "USD",
      "badge": "첫 구매 보너스"
    }
  ]
}
```

### 처음 구현할 사용자 세그먼트

1. `guest`: 로그인하지 않은 사용자
2. `new_user`: 로그인했지만 구매 이력이 없는 사용자
3. `returning_user`: 한 번 이상 구매한 사용자
4. `vip`: 누적 구매 또는 게임 등급 기준을 만족한 사용자

### 개인화 규칙 예시

| 세그먼트 | 표시 혜택 |
|---|---|
| guest | 기본 상품만 표시 |
| new_user | 첫 구매 추가 보너스 |
| returning_user | 재구매 보너스 또는 묶음 상품 |
| vip | VIP 전용 패키지와 높은 보너스 |

### 구현 원칙

- 혜택 조건과 수량은 서버에서 결정한다.
- 같은 사용자가 혜택을 여러 번 받지 못하도록 사용 여부를 기록한다.
- UI를 숨기는 것만으로 접근을 통제하지 않는다.
- 구매 시점에 해당 혜택이 아직 유효한지 서버가 재검증한다.

### 완료 기준

- 로그아웃 상태에서는 공개 상품이 보인다.
- 로그인 상태에서는 사용자 세그먼트가 표시된다.
- 신규 사용자에게만 첫 구매 혜택이 보인다.
- 로그아웃하면 다시 공개 카탈로그로 변경된다.

---

## Phase 7. 실제 Xsolla 상품과 결제 연결

이 단계는 로그인·카드·개인화 실습이 모두 완료된 뒤 진행한다.

### 배울 내용

- Xsolla 상품 카탈로그와 SKU
- 가상 화폐 패키지 등록
- 주문 생성과 결제 UI
- 사용자 검증 웹훅
- 결제 성공, 환불, 차지백 웹훅
- 게임 계정에 재화를 지급하거나 회수하는 처리

### 반드시 필요한 서버 안전장치

- 웹훅 서명 검증
- 거래 ID의 고유성 확인
- 중복 요청에도 한 번만 지급하는 멱등성
- 지급 내역 원장
- 실패 시 재시도 가능한 상태 관리
- 환불과 차지백 시 재화 회수 정책

### 완료 기준

- 테스트 결제가 성공하면 정확한 게임 계정에 재화가 한 번만 지급된다.
- 같은 웹훅을 반복 전송해도 중복 지급되지 않는다.
- 환불 이벤트를 별도로 기록하고 처리할 수 있다.

---

## 5. 속성 학습 코스

먼저 구동만 확인하려면 아래 순서로 범위를 줄인다.

### 1차: 로그인 위젯 구동

- Standard Login 프로젝트 생성
- Callback URL 등록
- Google Social Login 활성화
- Login Project ID 복사
- SDK 설치
- 로그인 버튼으로 위젯 열기
- 로그인 후 Callback URL 복귀 확인

### 2차: 상품 카드 구동

- 여섯 개 로컬 상품 데이터 작성
- 재사용 가능한 카드 컴포넌트 작성
- 반응형 그리드 구현
- 구매 버튼은 모의 동작으로 처리

### 3차: 개인화 구동

- 모의 로그인 사용자 생성
- 공개/로그인 사용자 카탈로그 분리
- 신규 사용자 보너스 표시
- 로그아웃 시 공개 카탈로그 복원

### 속성 코스에서 제외할 것

- Apple 로그인
- 실제 결제
- 게임 재화 실제 지급
- Shadow Login
- 복잡한 사용자 이전
- 환불과 차지백 자동화
- 고급 프로모션과 A/B 테스트

---

## 6. 추천 학습 일정

| 회차 | 주제 | 결과물 |
|---|---|---|
| 1 | Xsolla와 OAuth 개념 | 전체 구조 설명 및 계정 준비 |
| 2 | Publisher Account | Standard Login 프로젝트 |
| 3 | Google Login | 위젯 로그인과 Callback 복귀 |
| 4 | 상품 데이터 모델 | BLUC 패키지 데이터 |
| 5 | 상품 카드 UI | 반응형 여섯 개 카드 |
| 6 | 로그인 상태 | 세션 기반 로그인 UI |
| 7 | 개인화 API | 공개/개인화 카탈로그 |
| 8 | 사용자 세그먼트 | 신규·기존·VIP 혜택 |
| 9 | Apple Login | Google과 Apple 통합 로그인 |
| 10 | Xsolla 상품 연결 | 실제 SKU 기반 카탈로그 |
| 11 | 테스트 결제 | 주문과 결제 화면 |
| 12 | 웹훅과 지급 | 안전한 재화 지급 흐름 |

---

## 7. 최종 체크리스트

### Publisher Account

- [ ] Standard Login 프로젝트를 생성했다.
- [ ] Callback URL을 등록했다.
- [ ] Google 로그인을 활성화했다.
- [ ] Apple 로그인을 활성화했다.
- [ ] Login Project ID를 코드에 연결했다.

### 프런트엔드

- [ ] 로그인 버튼으로 Xsolla 위젯을 열 수 있다.
- [ ] 로그인 상태와 로그아웃 상태를 구분한다.
- [ ] 여섯 개 BLUC 패키지를 데이터 기반으로 렌더링한다.
- [ ] 사용자 혜택 배지를 표시한다.
- [ ] 로딩, 오류, 빈 카탈로그 상태가 있다.

### 백엔드

- [ ] Xsolla 인증 결과를 검증한다.
- [ ] 웹숍 세션을 안전하게 발급한다.
- [ ] 공개 카탈로그 API가 있다.
- [ ] 개인화 카탈로그 API가 있다.
- [ ] 혜택 사용 여부를 서버에서 관리한다.

### 결제 확장

- [ ] SKU를 서버에서 검증한다.
- [ ] 웹훅 서명을 검증한다.
- [ ] 중복 지급을 방지한다.
- [ ] 지급 내역을 기록한다.
- [ ] 환불과 차지백 정책이 있다.

---

## 8. 공식 참고 문서

- [Xsolla Login 프로젝트 설정](https://developers.xsolla.com/authenticate-users/login/integration-guide/set-up-login-project/)
- [Login Widget SDK API](https://developers.xsolla.com/authenticate-users/login/how-to/login-widget-sdk/)
- [Login 위젯 커스터마이징](https://developers.xsolla.com/authenticate-users/login/customization/widget-customization/)
- [Web Shop 인증 설정](https://developers.xsolla.com/solutions/web-shop/create-web-shop/set-up-authentication/)
- [Xsolla Web Shop 작동 방식](https://developers.xsolla.com/solutions/web-shop/)
- [Xsolla 웹훅](https://developers.xsolla.com/sdk/publisher-account/webhooks/)

문서와 Publisher Account 화면은 업데이트될 수 있으므로 실제 설정을 시작할 때 최신 공식 문서의 메뉴명과 요구사항을 다시 확인한다.

---

## 9. 첫 구현 목표

첫 구현에서는 아래 네 가지까지만 완성한다.

1. Google 로그인 위젯이 열린다.
2. 로그인 후 Callback URL로 돌아온다.
3. 여섯 개 BLUC 상품 카드가 표시된다.
4. 로그인 사용자에게 `첫 구매 보너스` 상품이 추가된다.

이 네 가지가 안정적으로 동작한 뒤 Apple 로그인과 실제 결제를 추가한다.
