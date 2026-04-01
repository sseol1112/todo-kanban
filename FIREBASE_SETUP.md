# Firebase Quick Setup

- Authentication  설정
1) 가운데 파란 버튼 로그인 방법 설정 클릭
2) 상단 탭에서 로그인 방법 클릭
3) 목록에서 이메일/비밀번호 클릭
4) 사용 설정 켜기
5) 저장

- Firestore  설정
1) 좌측 메뉴 데이터베이스 및 스토리지 펼치기
2) Firestore Database 클릭
3) 데이터베이스 만들기 클릭
4) 프로덕션 모드 선택
5) 리전 asia-northeast3 (Seoul) 선택 후 생성

- 규칙 설정
1) Firestore 화면 상단 규칙 탭
2) 아래 내용으로 교체 후 게시 클릭

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/tasks/{taskId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

- firebase-config.js 설정
* firebase-config.js 값 가져오는 경로 설명

1) Firebase 왼쪽 메뉴에서 설정 클릭
2) 프로젝트 설정 클릭
3) 페이지 아래로 내려서 내 앱 섹션 확인
4) 웹 아이콘(</>)으로 만든 앱 선택 : 없으면 앱 추가 → 웹(</>) 등록
5) SDK 설정 및 구성 영역에서 구성 선택
6) firebaseConfig 객체가 보임 - 여기서 아래 6개 값 복사 :
  (1) apiKey
  (2) authDomain
  (3) projectId
  (4) storageBucket
  (5) messagingSenderId
  (6) appId
7) 복사한 값을 이 파일에 넣으면 됨 : firebase-config.js

## firebase-config.js format

```js
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```
