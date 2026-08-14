# 03. 로그인 사용자용 개인화 카탈로그

이번 장에서는 Xsolla Login 사용자 속성을 기준으로 카탈로그에 표시할 상품을 다르게 구성했다. 학습 사례는 같은 가격으로 BLUC를 더 지급하는 회원 전용 패키지다.

## 한 문장 복습

- **개인화 카탈로그**: 로그인 사용자의 속성에 따라 보이는 상품이나 혜택을 다르게 구성하는 카탈로그
- **사용자 속성**: 사용자를 분류하기 위한 `키=값` 정보
- **표시 규칙**: 특정 속성 조건을 만족할 때 지정한 상품을 카탈로그에 포함하는 규칙
- **JWT 카탈로그 조회**: 로그인 사용자의 신원을 Xsolla에 전달해 해당 사용자에게 맞는 상품 목록을 받는 요청

## 학습 시나리오

```text
비로그인 또는 일반 사용자
  → 기본 BLUC 패키지 6개

webshop_member="true"인 로그인 사용자
  → 기본 BLUC 패키지 6개
  → 회원 전용 1,200 BLUC 패키지 1개 추가
```

회원 전용 패키지는 기존 1,000 BLUC 패키지와 가격은 같지만 200 BLUC를 더 지급한다.

| 항목 | 값 |
|---|---|
| SKU | `bluc_pack_member_1200` |
| 상품명 | 회원 전용 1,200 BLUC |
| 구성 | 기본 1,000 + 회원 보너스 200 BLUC |
| 총 지급 수량 | 1,200 BLUC |
| 가격 | $4.99 |

## 사용자 속성 스키마

개인화 규칙 화면에서 불린형을 제공하지 않아 `webshop_member`를 문자열로 비교한다.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Webshop user attributes",
  "type": "object",
  "properties": {
    "webshop_member": {
      "type": "string",
      "enum": ["true", "false"],
      "description": "로그인 회원 전용 혜택 대상 여부"
    }
  },
  "additionalProperties": true
}
```

`required`에는 넣지 않는다. 기존 사용자에게 이 속성이 없어도 로그인과 기본 카탈로그 이용이 가능해야 하기 때문이다.

## 카탈로그 표시 규칙

| 설정 | 값 |
|---|---|
| 규칙 이름 | `webshop_member_1200_bluc` |
| 사용자 특성 | `webshop_member` |
| 특성 유형 | 문자열 |
| 비교 연산자 | 다음과 같음 |
| 비교 값 | `true` |
| 표시 상품 | `bluc_pack_member_1200` |
| 비로그인 사용자에게 영향받은 상품 표시 | 끔 |
| 속성이 없는 사용자에게 상품 표시 | 끔 |
| 규칙 상태 | 활성화 |

조건을 코드처럼 표현하면 다음과 같다.

```text
if user.attributes.webshop_member == "true":
    show bluc_pack_member_1200
```

## 테스트 방법

### 1. 비로그인 카탈로그

```text
https://store.xsolla.com/api/v2/project/312439/items/virtual_currency/package?limit=50&offset=0&locale=ko&country=KR
```

인증 헤더 없이 요청한다. 회원 전용 상품을 비로그인 사용자에게 표시하지 않는 규칙이 올바르다면 기본 패키지 6개만 반환되어야 한다.

### 2. 회원 대상 로그인 카탈로그

테스트 사용자에게 `webshop_member` 값을 문자열 `true`로 저장하고 새로 로그인해 사용자 JWT를 받는다. 이전 JWT에는 변경된 속성 또는 권한 상태가 기대한 방식으로 반영되지 않을 수 있으므로 속성 변경 후 다시 로그인한다.

```powershell
$url = "https://store.xsolla.com/api/v2/project/312439/items/virtual_currency/package?limit=50&offset=0&locale=ko&country=KR"
$token = Read-Host "Xsolla 사용자 JWT"
$catalog = Invoke-RestMethod -Uri $url -Headers @{
  Authorization = "Bearer $token"
}

$catalog.items | Select-Object sku, name,
  @{Name="price"; Expression={$_.price.amount}},
  @{Name="quantity"; Expression={$_.content[0].quantity}},
  can_be_bought
```

JWT는 인증 정보이므로 문서, 소스 코드, 셸 기록 또는 Git 저장소에 넣지 않는다.

## 2026-08-13 테스트 결과

| 테스트 | 예상 결과 | 실제 결과 | 상태 |
|---|---|---|---|
| 비로그인 전체 목록 조회 | 기본 패키지 6개 | 6개 반환 | 통과 |
| 비로그인 목록에서 회원 SKU 검색 | 없음 | `bluc_pack_member_1200` 없음 | 통과 |
| 비로그인 상태에서 회원 SKU 직접 조회 | 접근 불가 | HTTP 404 | 통과 |
| `webshop_member="true"` JWT 조회 | 기본 6개 + 회원 전용 1개 | 사용자 JWT 필요 | 대기 |
| `webshop_member="false"` JWT 조회 | 기본 패키지 6개 | 사용자 JWT 필요 | 대기 |

현재 검증으로 회원 전용 상품이 공개 카탈로그에서 숨겨지는 것은 확인했다. 개인화 전체 성공 판정은 `webshop_member="true"`인 사용자의 JWT로 7개 상품과 `bluc_pack_member_1200`을 확인한 후 완료한다.

## 이 테스트를 하는 이유

Publisher Account의 규칙 화면은 관리 설정을 보여준다. 반면 카탈로그 API는 실제 웹숍 프런트엔드가 받는 결과다. 따라서 API 결과를 비교해야 다음 연결이 실제로 동작하는지 확인할 수 있다.

```text
사용자 속성
  → Xsolla 개인화 규칙 평가
  → 사용자별 카탈로그 JSON
  → 웹숍 상품 카드
```

## 운영 시 주의 사항

- 회원 여부, VIP 등급, 구매 이력처럼 혜택에 영향을 주는 속성은 사용자가 임의로 수정하지 못하도록 서버 전용 읽기 속성으로 관리한다.
- 백엔드는 신뢰할 수 있는 게임 DB를 기준으로 Xsolla의 사용자 속성을 갱신한다.
- 프런트엔드는 JWT의 내용을 읽어 화면만 바꾸는 것으로 구매 권한을 판단하지 않는다.
- Xsolla는 구매 시점에도 개인화 조건을 다시 확인해야 한다.
- JWT, 서버 토큰, Client Secret과 웹훅 비밀 키는 Git에 저장하지 않는다.

## 완료 체크리스트

- [x] 회원 전용 1,200 BLUC 패키지 구성
- [x] `webshop_member` 문자열 속성 스키마 구성
- [x] 회원 전용 카탈로그 표시 규칙 구성
- [x] 비로그인 사용자에게 회원 전용 상품이 숨겨지는지 확인
- [ ] `webshop_member="true"` 사용자 JWT로 회원 전용 상품 조회
- [ ] `webshop_member="false"` 사용자 JWT로 기본 상품만 조회
- [ ] 프런트엔드에서 JWT 유무에 따라 상품 카드 다시 불러오기

## 다음 장

프런트엔드에서 Xsolla Login 결과 JWT를 처리하고, 인증 전후 카탈로그 API 응답을 실제 BLUC 상품 카드로 렌더링한다.
