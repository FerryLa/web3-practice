# Xsolla Callback URL 설정 페이지 오류

## 진행 상황

1. Xsolla Publisher Account에서 프로젝트를 생성했다.
2. `Players > Login`에서 Login 프로젝트를 생성했다.
3. 로그인 방법으로 `Social login`을 선택했다.
4. Callback URL 설정 페이지로 이동했으나 중앙 설정 화면이 표시되지 않았다.

문제가 발생한 화면의 경로 형식은 다음과 같다.

```text
/projects/{project-id}/login/{login-project-uuid}/settings/callback-urls
```

## 증상

- Publisher Account의 공통 메뉴와 오른쪽 체크리스트는 정상적으로 표시된다.
- `Callback URLs` 설정 영역만 빈 화면으로 표시된다.
- 새로고침 후에도 동일하다.
- 여러 Chromium 기반 브라우저와 시크릿 모드에서 동일하게 재현되었다.
- 오른쪽 체크리스트에는 `콜백 URL 설정`이 완료된 것처럼 표시되지만 실제 저장값을 확인할 수 없다.

## Console 진단 방법

1. 빈 화면에서 `F12`를 눌러 개발자 도구를 연다.
2. `Console` 탭을 선택한다.
3. Console 우측 상단의 `Default levels`를 클릭한다.
4. `Warnings`, `Info`, `Verbose`를 끄고 `Errors`만 선택한다.
5. `Ctrl + R`로 페이지를 한 번 새로고침한다.
6. 표시되는 빨간 오류 메시지를 확인한다.

확인된 오류:

```text
https://xsolla.com/api/geo/
429 Too Many Requests
```

지원 채팅 iframe에서도 Permissions Policy 관련 오류가 표시되었으나 Callback URL 화면과의 직접적인 관련성은 확인되지 않았다.

Console에는 React 공유 모듈 버전에 관한 경고도 반복해서 표시되었다.

```text
Unsatisfied version 18.3.1 from metaframe-admin-panel
of shared singleton module react (required ^16.14.0)
```

이 메시지는 경고이므로 Callback 화면이 비는 직접 원인이라고 단정하지 않는다.

## Network 진단 방법

1. 개발자 도구에서 `Network` 탭을 선택한다.
2. 기존 요청 기록을 삭제한다.
3. `Fetch/XHR` 필터를 선택한다.
4. `Ctrl + R`로 페이지를 한 번 새로고침한다.
5. `Status`가 `4xx`, `5xx`이거나 빨간색으로 표시된 요청을 확인한다.
6. 상단 Filter에 `callback`을 입력해 Callback 설정 관련 요청이 발생했는지 확인한다.

진단 시 인증 토큰, 쿠키 또는 Request Headers의 민감한 값은 캡처하거나 공유하지 않는다.

## Network 확인 결과

- 실패한 요청으로 `https://xsolla.com/api/geo/`의 `429 Too Many Requests`가 확인되었다.
- `callback`으로 필터링했을 때 표시된 요청은 상태가 `200`인 분석·추적 요청이었다.
- Callback 설정 데이터를 읽는 것으로 식별할 수 있는 API 요청은 확인되지 않았다.

## 현재 판단

관찰 결과는 다음과 같다.

```text
Callback URL 설정 경로 진입
→ 중앙 설정 컴포넌트가 표시되지 않음
→ Callback 설정 API 요청도 확인되지 않음
→ 빈 화면 유지
```

현재로서는 사용자 입력값이나 Callback API의 응답 오류보다는 Xsolla Publisher Account 프런트엔드의 라우팅 또는 컴포넌트 초기화 문제일 가능성이 높다.

Xsolla 내부 코드와 운영 로그에 접근할 수 없으므로 정확한 내부 원인은 확정하지 않는다.

## 임시 대응

- 반복 새로고침을 중단해 `geo` API의 429 요청 제한이 해제될 시간을 둔다.
- Google·Apple 소셜 제공자 구성 학습은 계속할 수 있다.
- Callback 입력과 실제 로그인 완료 테스트는 화면이 복구될 때까지 보류한다.
- 프런트엔드에서는 개발용 Callback URL을 다음과 같이 예정한다.

```text
Callback URL:       http://localhost:3000/auth/callback
Error callback URL: http://localhost:3000/auth/error
Allowed origin:     http://localhost:3000
```

## Xsolla 지원 문의 예시

```text
Players > Login의 Callback URLs 페이지에서 중앙 설정 컴포넌트가
표시되지 않습니다. 여러 Chromium 기반 브라우저와 시크릿 모드에서
동일하게 재현됩니다.

Network를 callback으로 필터링해도 Callback 설정 API 요청 자체가
확인되지 않으며, 표시되는 요청은 상태가 200인 분석 요청입니다.
별도로 https://xsolla.com/api/geo/ 요청에서 429가 발생합니다.

Callback URLs 프런트엔드 라우트 또는 컴포넌트 초기화 상태와 현재
프로젝트에 저장된 Callback URL 값을 확인해 주세요.
```

지원 문의 시 함께 전달할 자료:

- 문제가 발생한 페이지 URL
- Publisher project ID와 Login ID
- 빈 화면 스크린샷
- Console의 Errors 필터 결과
- Network의 Fetch/XHR 및 `callback` 필터 결과
- 발생 시각과 시간대
