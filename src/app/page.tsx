export default function Home() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f3f4f6" }}>
      <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "12px" }}>TikTok Shop 대시보드</h1>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>메인 대시보드로 이동해주세요</p>
      <a href="/dashboard" style={{ padding: "10px 20px", background: "#3b82f6", color: "white", textDecoration: "none", borderRadius: "6px", fontSize: "14px" }}>
        대시보드로 이동
      </a>
    </div>
  );
}
