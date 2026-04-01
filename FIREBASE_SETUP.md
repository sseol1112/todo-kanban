# Firebase Quick Setup

1) Create Firebase project.
2) Add Web app and copy config values.
3) Authentication > Sign-in method > Enable Email/Password.
4) Firestore Database > Create (Production mode).
5) Firestore Rules 탭에 `firestore.rules` 내용 붙여넣고 Publish.
6) `firebase-config.js`에 config 값 입력 후 저장.
7) 사이트 새로고침 후 회원가입/로그인 테스트.

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
