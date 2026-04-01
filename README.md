# Work Todo Kanban

업무용 개인 Todo 관리용 정적 웹 앱입니다.

## 포함 기능

- CRUD: 작업 추가, 수정, 삭제, 상태 변경
- 우선순위: 높음/보통/낮음 설정
- 칸반 보드: 진행예정, 진행중, 완료
- 드래그앤드롭: 카드 이동으로 상태 즉시 변경
- 마감일 지정 + 임박/기한지남 강조 표시
- 회원가입/로그인 사용자별 클라우드 동기화(Firebase)

## 실행 방법

1. 이 폴더에서 `index.html`을 브라우저로 열기
2. 또는 로컬 서버로 실행

## GitHub Pages 배포

1. 새 GitHub 저장소에 현재 파일 푸시
2. 기본 브랜치를 `main`으로 설정
3. `Settings > Pages`에서 Source를 `GitHub Actions`로 선택
4. `main` 브랜치에 push하면 `.github/workflows/deploy.yml`로 자동 배포

배포 URL 예시:

`https://<github-username>.github.io/<repository-name>/`

## Firebase 설정(다른 기기 동기화 필수)

1. Firebase 콘솔에서 프로젝트 생성
2. `Authentication > Sign-in method`에서 `Email/Password` 활성화
3. `Firestore Database` 생성
4. 루트의 `firebase-config.js`에 웹 앱 설정 값 입력
5. Firestore 보안 규칙은 루트의 `firestore.rules` 파일 내용을 그대로 적용

설정이 없으면 앱은 자동으로 로컬 저장 모드로 동작합니다.

## 파일 구조

- `index.html`: 화면 구조
- `styles.css`: 스타일
- `app.js`: 인증/동기화/드래그앤드롭/CRUD 로직
- `firebase-config.js`: Firebase 웹 SDK 설정값
- `firestore.rules`: Firestore 보안 규칙
- `FIREBASE_SETUP.md`: Firebase 빠른 설정 가이드
- `.github/workflows/deploy.yml`: GitHub Pages 배포 워크플로
