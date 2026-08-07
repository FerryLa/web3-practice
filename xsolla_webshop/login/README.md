# 01. Xsolla Login 프로젝트

오늘 학습에서는 Xsolla Publisher Account에서 웹숍 사용자 인증의 기반이 되는 Login 프로젝트를 구성했다. Google 계정으로 인증하고, 인증 결과를 웹숍 Callback으로 돌려보내며, Xsolla 저장소에 사용자를 보관하고, RS256으로 JWT를 검증할 수 있는 상태까지 준비했다.

## 한 문장 복습

- **Login 프로젝트 생성**: 웹숍에서 사용할 독립적인 사용자 인증 공간을 준비하는 작업
- **Google 소셜 로그인 설정**: 사용자가 Google 계정으로 Xsolla에 인증할 수 있게 준비하는 작업
- **Callback 설정**: 인증 성공 또는 실패 후 사용자를 우리 웹사이트로 돌려보낼 주소를 등록하는 작업
- **Allowed Origin(CORS) 설정**: 우리 웹사이트가 브라우저에서 Xsolla API 응답을 읽을 수 있도록 출처를 허용하는 작업
- **로그인 API 통합 설정**: 위젯 외에 사용할 추가 로그인 API 기능을 정하는 작업
- **JWT 보안 설정**: 로그인 결과가 Xsolla에서 발급된 위조되지 않은 토큰인지 백엔드가 검증할 방식을 정하는 작업
- **인증 옵션 설정**: 소셜 로그인 외에 플랫폼 계정, 사용자 정의 OAuth, 추가 정보 양식 등을 연결하는 작업
- **사용자 데이터베이스 설정**: 로그인한 사용자 계정과 속성을 어디에 저장할지 정하는 작업
- **사용자 정의 설정**: 로그인 위젯과 이메일·SMS 화면의 디자인을 서비스에 맞게 바꾸는 작업
- **법률 관련 설정**: 이용약관, 개인정보처리방침, 최소 이용 연령을 사용자에게 안내하는 작업

## 프로젝트 식별 정보

| 항목 | 값 | 용도 |
|---|---:|---|
| Publisher 프로젝트 | `OVERDARE` | 결제, 카탈로그, Login을 포함하는 상위 프로젝트 |
| Publisher 프로젝트 ID | `930170` | Publisher API와 프로젝트 식별에 사용 |
| Login 이름 | `Login` | 사용자 인증 프로젝트 |
| 화면에 표시된 Login ID | `312439` | Login 프로젝트 식별에 사용 |

> ID는 비밀 키가 아니지만 코드에 직접 흩어놓지 않고 이후 환경 설정 파일에서 관리한다. SDK 또는 API가 요구하는 ID 형식은 실제 프런트엔드 통합 단계에서 Publisher Account의 코드 예제로 다시 확인한다.

## 대시보드 카테고리

1. [로그인 방법](./docs/01-login-methods.md)
2. [보안](./docs/02-security.md)
3. [인증](./docs/03-authentication.md)
4. [사용자 데이터베이스](./docs/04-user-database.md)
5. [사용자 정의와 운영 설정](./docs/05-customization-and-operations.md)

## 현재 완성된 인증 흐름

```text
사용자가 웹숍의 로그인 버튼 클릭
  → Xsolla Login 위젯 열림
  → Google 계정 선택 및 Google 인증
  → Google이 Xsolla의 소셜 OAuth Callback으로 인증 결과 전달
  → Xsolla가 사용자를 확인하고 JWT 발급
  → Xsolla가 사용자를 웹숍 Callback으로 이동
  → 웹숍이 로그인 결과를 처리
```

Publisher Account의 설정은 준비됐지만 마지막 두 단계는 아직 프런트엔드 코드로 구현하지 않았다.

## Callback과 CORS 한눈에 보기

![Callback과 CORS의 차이](./docs/callback-vs-cors.png)

- **Callback**은 인증이 끝난 사용자의 브라우저를 어느 페이지로 이동시킬지 정한다.
- **CORS**는 우리 웹숍의 브라우저 코드가 다른 출처인 Xsolla API의 응답을 읽어도 되는지 결정한다.
- Callback이 등록돼도 CORS가 자동으로 허용되는 것은 아니며, CORS를 허용해도 로그인 후 이동할 Callback이 생기는 것은 아니다.

## 완료 상태

- [x] Standard Login 프로젝트 생성
- [x] 로그인 방법을 Social login으로 선택
- [x] Google 자체 OAuth 애플리케이션 연결
- [x] Google 로그인 시험 완료
- [x] Callback URL 및 Error Callback URL 등록
- [x] 개발용 Allowed Origin 등록
- [x] Xsolla 저장소 연결 확인
- [x] JWT 서명을 RS256으로 유지
- [x] 토큰 수명 86,400초 유지
- [ ] Apple 자체 OAuth 연결 — 유료 Apple Developer Program이 필요하여 보류
- [ ] 위젯 디자인 변경 — Xsolla 제품 라이선스 계약이 필요하여 보류
- [ ] 웹숍 프런트엔드에서 위젯 열기
- [ ] Callback에서 로그인 결과 처리
- [ ] 백엔드에서 JWT 검증

## 관련 자료

- [Callback 설정 화면 장애 기록](./error/callbackUrl/README.md)
- [Callback과 CORS 비교 이미지](./docs/callback-vs-cors.png)

## 보안 메모

다음 값은 문서, Git, 프런트엔드 코드 또는 스크린샷에 남기지 않는다.

- Google Client Secret
- Apple Private Key 및 Client Secret
- Xsolla 서버용 비밀 키
- 결제 Webhook Secret
- 운영 API Key
