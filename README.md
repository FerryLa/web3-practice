# WEB3-PRACTICE

<details>
<summary>월별 달력 일정표</summary>

### 2026년 3월

| 일 | 월 | 화 | 수 | 목 | 금 | 토 |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| 1   | 2   | 3   | 4   | 5   | 6   | 7   |
| 8   | 9   | 10  | 11  | 12  | 13  | 14  |
| 15  | 16  | 17  | 18  | 19  | 20  | 21  |
| 22  | 23  | 24  | 25  | 26  | 27  | 28  |
| 29  | 30  | 31  |     |     |     |     |

**주요 일정:**
- 3월 14: AIBT (AI 비즈니스 활용능력) 2026년 제1회 AIBT정기시험

---

### 2026년 4월

| 일 | 월 | 화 | 수 | 목 | 금 | 토 |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: |
|     |     |     | 1   | 2   | 3   | 4   |
| 5   | 6   | 7   | 8   | 9   | 10  | 11  |
| 12  | 13  | 14  | 15  | 16  | 17  | 18  |
| 19  | 20  | 21  | 22  | 23  | 24  | 25  |
| 26  | 27  | 28  | 29  | 30  |     |     |

**주요 일정:**
- 4월 5: ETH Seoul 2026

</details>

<details>
<summary>HackQuest 일일 학습 집계 (자동 업데이트)</summary>

### 주간 학습 현황

<!-- HACKQUEST_WEEKLY:START -->

| Week | Count | Graph |
|------|-------|-------|
| 2026-W10 |     1 | ██████████ |

> 매주 일요일 오전 9시 GitHub Action을 통해 자동 집계됩니다.

<!-- HACKQUEST_WEEKLY:END -->

</details>

---

## 프로젝트 개요

**WEB3-PRACTICE**는 HackQuest 플랫폼을 활용하여 매일 15~30분씩 Web3 / 블록체인 개발을 학습하고
그 기록을 GitHub에 꾸준히 쌓아가는 프로젝트입니다.

- **플랫폼:** [HackQuest](https://www.hackquest.io/ko)
- **목표:** 블록체인 기초 → 스마트 컨트랙트 → DeFi/NFT 실전 개발
- **방식:** 매일 노트 1개 작성 + 코드 실습 저장

---

## 최적 학습법 (15~30분/일)

```
[Phase 1] 워밍업       2~3분   어제 노트 빠르게 훑기
[Phase 2] HackQuest    10~15분 레슨 읽기 + 인터랙티브 코딩 완료
[Phase 3] 로컬 기록    5~10분  핵심 개념 + 코드를 notes/에 저장
[Phase 4] 심화 (선택)  ~5분    코드 변형해보기 / 질문 메모
```

### HackQuest 활용 팁
- **레슨 완료 후 XP 확인** → 꾸준히 랭킹 유지가 동기부여
- **인터랙티브 에디터 우선** → 로컬 환경 없이 바로 실습
- **Checkpoint 문제** → 노트에 틀린 부분만 별도 메모
- **같은 챕터 반복 금지** → 다음으로 넘어가고 나중에 복습

---

## 폴더 구조

```
web3-practice/
├── README.md                      ← 진도 추적 + 학습법 가이드 (이 파일)
├── notes/                         ← 일별 학습 노트 (Markdown)
│   └── 2026/
│       └── 03/
│           ├── 2026-03-02.md      ← 오늘 학습 노트
│           └── ...
├── code/                          ← HackQuest 실습 코드 저장
│   └── 2026/
│       └── 03/
│           ├── hello_world.sol
│           └── ...
├── scripts/
│   └── weekly_status.py           ← 주간 집계 스크립트
└── .github/
    └── workflows/
        └── weekly-status.yml      ← 자동 집계 GitHub Action
```

---

## 노트 작성 형식

파일명: `notes/YYYY/MM/YYYY-MM-DD.md`

```markdown
# YYYY-MM-DD | HackQuest Day N

**Course:** 코스명
**Lesson:** 레슨명
**Time:** 20min

## 핵심 개념

-

## 코드 실습

code/YYYY/MM/파일명.sol 참고

## 느낀 점 / 다음에 볼 것

-
```

---

## 실행 방법

**주간 집계 수동 실행:**
```bash
cd scripts
python weekly_status.py --update-readme
```

---

## 라이선스

MIT License
# web3-practice
