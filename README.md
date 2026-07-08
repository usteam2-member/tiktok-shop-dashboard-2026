# TikTok Shop 매출 대시보드

성분에디터 북미2팀 2026 TikTok Shop 매출 대시보드

## 로컬 실행

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인

## GitHub + Vercel 배포 방법

### 1. GitHub에 올리기

```bash
cd tiktok-dashboard
git init
git add .
git commit -m "init: TikTok Shop dashboard"
```

GitHub에서 새 저장소 만들기 (New repository) → 저장소 이름 예: `tiktok-dashboard`

```bash
git remote add origin https://github.com/<내아이디>/tiktok-dashboard.git
git branch -M main
git push -u origin main
```

### 2. Vercel에 배포

1. https://vercel.com 접속 → 로그인
2. "Add New Project" 클릭
3. GitHub 저장소 연결 → `tiktok-dashboard` 선택
4. Framework: **Next.js** 자동 감지됨
5. "Deploy" 클릭 → 2~3분 후 완료

배포 URL 예시: `https://tiktok-dashboard-xxx.vercel.app/dashboard`
