# CHAP 06 — 결제 웹훅

Xsolla가 보내는 사용자 검증과 주문 상태 알림을 백엔드에서 안전하게 수신한다. 이 장에서는 실제 결제나 BLUC 지급을 수행하지 않고, 서명 검증과 중복 방지까지 확인한다.

## 처리 흐름

```text
Xsolla
  → POST /webhooks/xsolla
  → 원본 JSON + Webhook Secret으로 SHA-1 계산
  → Authorization: Signature <hash>와 상수 시간 비교
  → user_validation / order_paid / order_canceled 분기
  → order.id를 로컬 이벤트 저장소에 기록
  → 중복 주문이면 다시 처리하지 않음
  → 204 No Content
```

## Publisher Account 설정

1. 프로젝트에서 `Project settings > Webhooks`로 이동한다.
2. Secret key를 생성하고 한 번만 표시되는 값을 안전하게 복사한다.
3. `backend/.env.local`에 다음 값을 추가한다.

```dotenv
XSOLLA_WEBHOOK_SECRET=복사한_Secret_Key
XSOLLA_WEBHOOK_EVENT_STORE_PATH=./data/webhook-events.json
```

Secret은 프런트엔드 환경 변수나 Git에 넣지 않는다.

## 로컬 서버 공개

Xsolla는 `localhost`와 HTTP 주소로 웹훅을 전송할 수 없다. 백엔드의 3001 포트를 HTTPS 터널로 공개한 뒤, Publisher Account의 Webhook server에 다음 주소를 입력한다.

```text
https://발급된-터널-주소/webhooks/xsolla
```

터널 주소는 실행할 때 바뀔 수 있으므로 테스트 전에 현재 주소를 다시 확인한다.

## 테스트 순서

1. 백엔드와 HTTPS 터널을 실행한다.
2. Webhook server URL과 Secret key를 저장하고 웹훅을 활성화한다.
3. `Payments and store` 탭에서 정상 사용자 검증을 테스트한다.
4. 잘못된 서명 테스트가 `400 INVALID_SIGNATURE`으로 통과하는지 확인한다.
5. `order_paid`와 `order_canceled` 테스트가 `204`를 받는지 확인한다.
6. `backend/data/webhook-events.json`에서 주문 이벤트 ID가 한 번만 기록되는지 확인한다.

2025년 1월 22일 이후 등록한 프로젝트는 결합형 `order_paid`와 `order_canceled` 웹훅을 사용한다. Publisher Account 테스트 화면에 `payment`와 `refund`가 표시되는 이전 프로젝트도 같은 엔드포인트에서 처리한다.

## 2026-08-21 테스트 결과

```text
Backend: 21 tests passed, 0 failed
Frontend: 5 tests passed, 0 failed
```

원본 본문 서명 검증, 변조 요청 거부, 사용자 검증 성공·실패, 주문 ID 중복 방지 및 서버 재시작 후 중복 기록 유지 테스트가 모두 통과했다. 이 결과는 로컬 자동 테스트이며, 외부 HTTPS 터널과 Publisher Account 테스트는 별도로 수행한다.

## 현재 사용자 검증 정책

현재 학습용 구현은 서명이 유효하고 `user.id`가 비어 있지 않으면 사용자가 존재한다고 간주한다. 운영 환경에서는 `webhookUserExists`를 게임 사용자 DB 조회 함수로 교체해야 한다.

## 완료 기준

- [x] 원본 요청 본문으로 SHA-1 서명 계산
- [x] 상수 시간 서명 비교
- [x] 잘못된 서명에 `400 INVALID_SIGNATURE` 반환
- [x] 사용자 검증 실패에 `400 INVALID_USER` 반환
- [x] `order.id` 또는 `transaction.id` 기반 중복 방지
- [x] 처리 성공 시 `204 No Content` 반환
- [x] 백엔드 21개 및 프런트엔드 5개 자동 테스트 통과
- [ ] 외부 HTTPS 터널 연결
- [ ] Publisher Account의 정상·오류 웹훅 테스트 통과

## 공식 문서

- [Webhooks overview](https://developers.xsolla.com/webhooks/overview)
- [Payment webhooks](https://developers.xsolla.com/webhooks/payments)
