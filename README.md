# SolveGO Frontend

SolveGO의 웹 프론트엔드입니다.

사용자는 바둑 문제를 조회하고 풀 수 있으며, 직접 문제를 등록하거나 자신이 작성한 문제를 수정 및 삭제할 수 있습니다. 또한 틀린 문제를 별도로 확인할 수 있습니다.

React + TypeScript 기반으로 구현했으며, Spring Boot Backend API와 통신합니다.

## Tech Stack

- React
- TypeScript
- Vite
- React Router
- Fetch API
- CSS

## Architecture

```text
Browser
  ↓
React Frontend
  ↓ HTTPS
Nginx
  ↓
Spring Boot Backend
  ↓
MySQL / Redis / AI Server
```

프론트엔드는 AI Server를 직접 호출하지 않고 모든 서버 요청을 Spring Boot Backend를 통해 처리합니다.

## Features

### 1. 문제 목록 조회

등록된 바둑 문제를 목록으로 조회할 수 있습니다.

```text
문제 목록
   ↓
문제 선택
   ↓
문제 풀이
```

### 2. 문제 풀이

문제의 바둑판 상태를 확인하고 사용자가 정답이라고 생각하는 위치를 선택하여 문제를 풀 수 있습니다.

문제의 정답 여부는 Backend에 저장된 `answerPosition`을 기준으로 판정합니다.

### 3. 문제 등록

로그인한 사용자는 직접 바둑 문제를 등록할 수 있습니다.

문제 등록 과정에서 다음 정보를 설정할 수 있습니다.

- 흑돌 위치
- 백돌 위치
- 다음 차례
- 정답 위치

문제 배치를 만드는 과정에서도 바둑의 기본 착수 규칙을 적용합니다.

### 4. 문제 수정 및 삭제

문제 작성자는 자신이 등록한 문제를 수정하거나 삭제할 수 있습니다.

현재 로그인한 사용자가 문제 작성자인 경우에만 수정 및 삭제 버튼을 표시합니다.

```text
현재 사용자
    ↓
문제 작성자 여부 확인
    ↓
작성자
→ 수정 / 삭제 버튼 표시

작성자가 아님
→ 버튼 숨김
```

프론트엔드에서 버튼을 숨기는 것은 사용자 경험을 위한 처리이며, 실제 수정 및 삭제 권한은 Backend에서도 검증합니다.

### 5. 오답 문제 조회

사용자가 틀린 문제를 별도로 조회할 수 있습니다.

```text
문제 풀이
   ↓
오답
   ↓
오답 문제 목록
```

### 6. 회원가입 및 로그인

회원가입과 로그인을 지원합니다.

인증이 필요한 페이지는 인증 상태를 확인한 뒤 접근할 수 있도록 처리합니다.

## Go Board

SolveGO에서는 19×19 바둑판을 직접 구현했습니다.

```text
(0, 0) ─────────────→ x
  |
  |
  |
  ↓
  y
```

좌측 상단을 `(0, 0)`, 우측 하단을 `(18, 18)`로 표현합니다.

Frontend와 Backend에서는 바둑판의 위치를 다음과 같은 좌표 형식으로 표현합니다.

```json
{
  "x": 3,
  "y": 15
}
```

## Go Rule Handling

문제 등록 과정에서도 실제 바둑의 기본적인 착수 규칙을 적용합니다.

공통 바둑 규칙 로직은 다음 파일로 분리했습니다.

```text
src/utils/goRules.ts
```

현재 구현된 규칙은 다음과 같습니다.

- 돌 배치
- 연결된 돌 그룹 탐색
- 활로 확인
- 상대 돌 포획
- 자충수 방지
- 정상 착수 후 흑/백 자동 교대

### 연결된 돌 그룹 탐색

같은 색의 돌이 상하좌우로 연결되어 있는 경우 하나의 그룹으로 판단합니다.

```text
● ●
  ●
```

DFS 방식으로 인접한 같은 색의 돌을 탐색하여 하나의 그룹을 구성합니다.

### 활로 확인

그룹에 속한 각각의 돌 주변을 탐색하여 하나 이상의 빈 교차점이 존재하는지 확인합니다.

```text
○ ○ ○
○ ● ○
○   ○
```

빈 교차점이 하나 이상 존재하면 해당 그룹에는 활로가 존재한다고 판단합니다.

### 돌 포획

돌을 놓은 후 인접한 상대 돌 그룹을 탐색합니다.

상대 그룹에 더 이상 활로가 존재하지 않으면 해당 그룹 전체를 바둑판에서 제거합니다.

```text
돌 배치
   ↓
인접한 상대 돌 확인
   ↓
연결된 상대 그룹 탐색
   ↓
그룹의 활로 확인
   ↓
활로 없음
   ↓
그룹 제거
```

### 자충수 방지

상대 돌의 포획 처리가 끝난 후 새롭게 놓은 돌이 속한 자신의 그룹에 활로가 존재하는지 확인합니다.

활로가 하나도 없다면 유효하지 않은 착수로 판단합니다.

```text
내 돌 배치
   ↓
상대 돌 포획
   ↓
내 그룹 탐색
   ↓
내 그룹의 활로 확인
   ↓
활로 없음
   ↓
Invalid Move
```

유효하지 않은 위치를 클릭한 경우 별도의 경고창을 표시하지 않고 해당 입력을 무시합니다.

### 흑/백 자동 교대

문제 등록 화면에서 정상적으로 돌을 놓으면 다음에 배치할 돌의 색이 자동으로 변경됩니다.

```text
BLACK
  ↓ 착수
WHITE
  ↓ 착수
BLACK
  ↓ 착수
WHITE
```

유효하지 않은 착수의 경우에는 차례를 변경하지 않습니다.

## Project Structure

```text
src/
├── api/
│   └── api.ts
│
├── components/
│   ├── GoBoard/
│   │   ├── GoBoard.tsx
│   │   └── GoBoard.css
│   │
│   ├── Layout/
│   │   ├── Layout.tsx
│   │   └── Layout.css
│   │
│   ├── ProblemCard/
│   │   ├── ProblemCard.tsx
│   │   └── ProblemCard.css
│   │
│   └── ProtectedRoute/
│       └── ProtectedRoute.tsx
│
├── pages/
│   ├── auth/
│   │   ├── LoginPage/
│   │   │   └── LoginPage.tsx
│   │   ├── SignupPage/
│   │   │   └── SignupPage.tsx
│   │   └── AuthPage.css
│   │
│   └── problem/
│       ├── ProblemListPage/
│       ├── ProblemDetailPage/
│       ├── ProblemCreatePage/
│       ├── ProblemEditPage/
│       ├── WrongProblemPage/
│       └── ProblemFormPage.css
│
├── utils/
│   └── goRules.ts
│
├── App.tsx
└── main.tsx
```

## API Communication

Frontend에서는 Backend API와 HTTP 통신하여 데이터를 조회하거나 변경합니다.

```text
React Component
      ↓
    api.ts
      ↓
Spring Boot Backend
```

인증이 필요한 요청에는 로그인 후 발급받은 JWT를 사용합니다.

Backend와의 통신 로직을 UI 컴포넌트와 분리하여 API 요청을 공통으로 관리할 수 있도록 구성했습니다.

## Authorization UI

문제 상세 화면에서는 현재 로그인한 사용자가 해당 문제의 작성자인지 확인하여 수정 및 삭제 기능의 노출 여부를 결정합니다.

```text
Problem Detail
      ↓
문제 작성자 확인
      ↓
현재 사용자와 비교
      ↓
   작성자 일치
      ↓
Edit / Delete 표시
```

단, 프론트엔드의 권한 확인만으로 보안을 보장하지 않습니다.

실제 문제 수정 및 삭제 요청에 대한 권한 검증은 Spring Boot Backend에서 수행합니다.

## Local Development

프로젝트 의존성을 설치합니다.

```bash
npm install
```

개발 서버를 실행합니다.

```bash
npm run dev
```

기본 개발 서버 주소는 다음과 같습니다.

```text
http://localhost:5173
```

## Build

프로덕션 빌드는 다음 명령어로 수행합니다.

```bash
npm run build
```

TypeScript 컴파일과 Vite 빌드를 수행한 뒤 결과물이 `dist/` 디렉터리에 생성됩니다.

```text
dist/
├── index.html
└── assets/
```

## Design Principles

### Backend 중심의 권한 검증

Frontend에서는 사용자에게 필요한 UI만 표시하고, 실제 리소스 접근 권한은 Backend에서 검증하도록 역할을 분리했습니다.

이를 통해 프론트엔드의 UI 조작만으로 서버의 보호된 리소스에 접근할 수 없도록 구성했습니다.

### 바둑 규칙 로직의 분리

돌 포획과 자충수 검사 등의 규칙을 특정 페이지 내부에 직접 구현하지 않고 `goRules.ts`로 분리했습니다.

```text
ProblemCreatePage
        ↓
     goRules
        ↑
ProblemEditPage
```

이를 통해 동일한 바둑 규칙을 여러 화면에서 재사용할 수 있도록 구성했습니다.

### 일관된 좌표 표현

Frontend와 Backend에서 바둑판의 위치를 `{x, y}` 형태로 표현합니다.

UI와 서버 사이에서 동일한 좌표 표현을 사용함으로써 불필요한 좌표 변환을 줄이고 각 계층의 역할을 명확하게 유지합니다.

## Future Improvements

- 문제 등록 시 AI 추천 수 제공
- 문제 풀이 시 사용자가 선택한 수에 대한 AI 평가 제공
- AI 추천 위치 시각화
- 사용자 착수와 AI 최선 수 비교 UI
- 프론트엔드 테스트 코드 추가
- 프론트엔드 배포 환경 구축
