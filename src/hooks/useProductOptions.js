import { useMemo } from 'react';

export const useProductOptions = ({ products, branchInfo, productPrices }) => {
  const allProductOptions = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    try {
      return products.flatMap(p => {
        if (!p) return [];
        if (p.variations && Array.isArray(p.variations) && p.variations.length > 0) {
          return p.variations.filter(Boolean).map(v => {
            const companySkus = {};
            if (v.companyPrices && Array.isArray(v.companyPrices)) {
              v.companyPrices.filter(Boolean).forEach(cp => {
                if (cp?.company?.id != null) companySkus[cp.company.id] = cp.companySku ?? '';
              });
            }
            return {
              id: `${p.id}_${v.id}`,
              parentProductId: p.id,
              variationId: v.id,
              name: p.productName || '',
              fullName: p.productName || '',
              subLabel: v.combinationDisplay || 'Variation',
              upc: v.upc || '',
              sku: v.sku || '',
              isVariation: true,
              companySkus,
            };
          });
        }
        const companySkus = {};
        if (p.companyBasePrices && Array.isArray(p.companyBasePrices)) {
          p.companyBasePrices.filter(Boolean).forEach(cbp => {
            if (cbp?.company?.id != null) companySkus[cbp.company.id] = cbp.companySku ?? '';
          });
        }
        return [{
          id: `prod_${p.id}`,
          parentProductId: p.id,
          variationId: null,
          name: p.productName || '',
          fullName: p.productName || '',
          subLabel: 'No variations',
          upc: p.upc || '',
          sku: p.sku || '',
          isVariation: false,
          companySkus,
        }];
      });
    } catch (e) {
      console.error('allProductOptions error:', e);
      return [];
    }
  }, [products]);

  const productOptions = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    return products.flatMap(p => {
      if (!p) return [];
      const hasVariations = p.variations && Array.isArray(p.variations) && p.variations.length > 0;

      if (hasVariations) {
        return p.variations.filter(Boolean).map(v => {
          const companyMatch = v.companyPrices?.find(cp => cp?.company?.id === branchInfo?.companyId);
          const companyPrice = companyMatch?.price ?? 0;
          const companySku = companyMatch?.companySku ?? null;
          const variationLabel = v.combinationDisplay ||
            (v.variationType && v.variationValue ? `${v.variationType}: ${v.variationValue}` : 'Variation');
          const companySkusMap = {};
          if (v.companyPrices && Array.isArray(v.companyPrices)) {
            v.companyPrices.forEach(cp => {
              if (cp?.company?.id != null) companySkusMap[cp.company.id] = cp.companySku ?? '';
            });
          }
          return {
            id: `${p.id}_${v.id}`,
            parentProductId: p.id,
            variationId: v.id,
            name: p.productName || '',
            subLabel: variationLabel,
            fullName: p.productName || '',
            upc: v.upc || '',
            sku: v.sku || '',
            price: companyPrice,
            companySku,
            companySkus: companySkusMap,
            variationLabel,
            isVariation: true,
            hasVariations: true,
          };
        });
      }

      const companyBaseMatch = p.companyBasePrices?.find(cbp => cbp?.company?.id === branchInfo?.companyId);
      const companyBasePrice = companyBaseMatch?.basePrice ?? productPrices?.[String(p.id)] ?? productPrices?.[p.id] ?? 0;
      const companySku = companyBaseMatch?.companySku ?? null;
      const companySkusMap = {};
      if (p.companyBasePrices && Array.isArray(p.companyBasePrices)) {
        p.companyBasePrices.forEach(cbp => {
          if (cbp?.company?.id != null) companySkusMap[cbp.company.id] = cbp.companySku ?? '';
        });
      }
      return [{
        id: `prod_${p.id}`,
        parentProductId: p.id,
        variationId: null,
        name: p.productName || '',
        subLabel: 'No variations',
        fullName: p.productName || '',
        upc: p.upc || '',
        sku: p.sku || '',
        price: companyBasePrice,
        companySku,
        companySkus: companySkusMap,
        isVariation: false,
        hasVariations: false,
      }];
    });
  }, [products, branchInfo, productPrices]);

  return { allProductOptions, productOptions };
};