import { Suspense } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div style={{padding:40,color:"#64748b"}}>Loading...</div>}>{children}</Suspense>;
}
