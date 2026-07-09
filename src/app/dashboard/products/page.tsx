"use client";
import { useSheetData } from "@/lib/useSheetData";
import Navbar from "@/components/Navbar";
import TabBar from "@/components/TabBar";
import ProductSearch from "@/components/ProductSearch";
import styles from "./products.module.css";

export default function ProductsPage() {
  const { data, loading, error } = useSheetData();

  return (
    <div className={styles.wrap}>
      <Navbar startDate="" endDate="" />
      <TabBar activeTab="제품별 매출" />
      <main className={styles.main}>
        {loading && (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p>데이터 불러오는 중...</p>
          </div>
        )}
        {error && (
          <div className={styles.errorWrap}>
            <p>⚠️ 데이터 로드 실패: {error}</p>
          </div>
        )}
        {data && !loading && (
          <ProductSearch products={data.products || []} />
        )}
      </main>
    </div>
  );
}
