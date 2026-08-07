"use client";
import { useState, useMemo } from "react";
import { useSheetData } from "@/lib/useSheetData";
import Navbar from "@/components/Navbar";
import TabBar from "@/components/TabBar";
import ProductDetailModal from "@/components/ProductDetailModal";

interface ProductItem {
  name: string;
  sku: string;
  pid: string;  // optional 제거
  type: string;
}

export default function ProductsPage() {
  const { data, loading, error } = useSheetData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  // 제품 목록 생성
  const allProducts = useMemo(() => {
    if (!data?.products) {
      console.log("📊 [Products] data.products is undefined or empty");
      console.log("📊 [Products] data:", data);
      return [];
    }
    
    console.log("📊 [Products] data.products count:", data.products.length);
    
    return data.products.map(p => {
      const productType = p.sku.startsWith("SB") ? "(단품)" : p.sku.startsWith("BD") ? "(번들)" : "";
      return {
        name: `${p.name} ${productType}`.trim(),
        sku: p.sku,
        pid: p.sku, // 또는 다른 PID 필드가 있다면 사용
        type: productType,
      };
    });
  }, [data]);

  // 검색 결과
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    
    return allProducts.filter(product => {
      const nameMatch = product.name.toLowerCase().includes(query);
      const skuMatch = product.sku.toLowerCase().includes(query);
      const pidMatch = product.pid?.toLowerCase().includes(query);
      
      return nameMatch || skuMatch || pidMatch;
    }).slice(0, 50); // 최대 50개만 표시
  }, [searchQuery, allProducts]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* 상단 네비게이션 */}
      <Navbar startDate="" endDate="" />
      <TabBar />

      {/* 메인 콘텐츠 */}
      <main style={{ flex: 1, padding: "20px", maxWidth: "1000px", margin: "0 auto", width: "100%" }}>
        {loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: "16px", color: "#999" }}>데이터 로딩 중...</div>
          </div>
        ) : error ? (
          <div style={{ padding: "40px 20px" }}>
            <div style={{ padding: "20px", background: "#fee2e2", color: "#991b1b", borderRadius: "8px" }}>
              ⚠️ 에러: {error}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: "30px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px", color: "#1f2937" }}>
                제품 검색
              </h2>
              <p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
                제품명, PID, SKU로 검색하세요
              </p>
              
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="제품명, PID, SKU로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: "14px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    transition: "all 0.3s",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* 검색 결과 */}
            {searchQuery.trim() && (
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#1f2937", marginBottom: "16px" }}>
                  검색 결과: <span style={{ color: "#3b82f6" }}>{searchResults.length}</span>개
                </div>

                {searchResults.length === 0 ? (
                  <div style={{
                    padding: "40px",
                    textAlign: "center",
                    background: "#f9fafb",
                    borderRadius: "8px",
                    color: "#999",
                  }}>
                    <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔍</div>
                    <div style={{ fontSize: "14px" }}>검색 결과가 없습니다</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "12px" }}>
                    {searchResults.map((product, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedProduct(product)}
                        style={{
                          padding: "16px",
                          background: "#f9fafb",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          transition: "all 0.2s",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f0f9ff";
                          e.currentTarget.style.borderColor = "#3b82f6";
                          e.currentTarget.style.boxShadow = "0 2px 8px rgba(59, 130, 246, 0.1)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#f9fafb";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <div style={{ display: "grid", gap: "8px" }}>
                          <div style={{ fontSize: "15px", fontWeight: 600, color: "#1f2937" }}>
                            {product.name}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "13px", color: "#666" }}>
                            <div>
                              <div style={{ color: "#999", marginBottom: "4px" }}>SKU</div>
                              <div style={{ fontFamily: "monospace", fontWeight: 500, color: "#3b82f6" }}>
                                {product.sku}
                              </div>
                            </div>
                            <div>
                              <div style={{ color: "#999", marginBottom: "4px" }}>PID</div>
                              <div style={{ fontFamily: "monospace", fontWeight: 500, color: "#3b82f6" }}>
                                {product.pid}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!searchQuery.trim() && (
              <div style={{
                padding: "60px 20px",
                textAlign: "center",
                background: "#f9fafb",
                borderRadius: "8px",
                color: "#999",
              }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
                <div style={{ fontSize: "16px", fontWeight: 500, marginBottom: "8px" }}>
                  제품을 검색하세요
                </div>
                <div style={{ fontSize: "14px" }}>
                  전체 {allProducts.length}개의 제품이 있습니다
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 제품 상세 정보 모달 */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          productDailyRows={data?.productDailyRows || []}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
