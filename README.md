# Work Todo Kanban

업무용 개인 Todo 관리용 정적 웹 앱입니다.

## 포함 기능

- CRUD: 작업 추가, 수정, 삭제, 상태 변경
- 우선순위: 높음/보통/낮음 설정
- 칸반 보드: 진행예정, 진행중, 완료
- 드래그앤드롭: 카드 이동으로 상태 즉시 변경
- 로컬 저장: 브라우저 `localStorage`에 자동 저장

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

## 파일 구조

- `index.html`: 화면 구조
- `styles.css`: 스타일
- `app.js`: 데이터/드래그앤드롭/CRUD 로직
- `.github/workflows/deploy.yml`: GitHub Pages 배포 워크플로
