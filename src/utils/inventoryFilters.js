import { parseDate } from './dateUtils';

export const filterProductSummaries = (productSummaries, productSearchTerm, showVariationFilter) => {
  return productSummaries.filter(product => {
    // Hide parent product row if it has no SKU and no UPC (meaning it only exists as variations)
    const hasNoSku = !product.sku || product.sku === 'N/A';
    const hasNoUpc = !product.upc || product.upc === 'N/A';
    const isVariation = product.isVariation === true || !!product.variationId;
    if (hasNoSku && hasNoUpc && !isVariation) return false;
    const searchLower = productSearchTerm.toLowerCase();
    const matchesSearch =
      product.productName?.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower) ||
      product.upc?.toLowerCase().includes(searchLower) ||
      (product.variationSku && product.variationSku.toLowerCase().includes(searchLower)) ||
      (product.variationName && product.variationName.toLowerCase().includes(searchLower)) ||
      (product.combinationDisplay && product.combinationDisplay.toLowerCase().includes(searchLower));

    const matchesVariationFilter =
      showVariationFilter === 'ALL' ||
      (showVariationFilter === 'BASE_ONLY' && !isVariation) ||
      (showVariationFilter === 'VARIATION_ONLY' && isVariation);

    return matchesSearch && matchesVariationFilter;
  });
};

export const filterWarehouseStocks = (warehouseStocks, stockSearchTerm, warehouseFilters) => {
  // If no search term, return all stocks with other filters applied
  if (!stockSearchTerm || stockSearchTerm.trim() === '') {
    return warehouseStocks.filter(stock => {
      const matchesWarehouse = !warehouseFilters.warehouse ||
        String(stock.warehouseId) === String(warehouseFilters.warehouse);

      const matchesMinQty = !warehouseFilters.minQty || (stock.quantity || 0) >= parseInt(warehouseFilters.minQty);
      const matchesMaxQty = !warehouseFilters.maxQty || (stock.quantity || 0) <= parseInt(warehouseFilters.maxQty);

      const stockDate = parseDate(stock.lastUpdated);
      const matchesStartDate = !warehouseFilters.startDate || (stockDate && stockDate >= new Date(warehouseFilters.startDate));
      const matchesEndDate = !warehouseFilters.endDate || (stockDate && stockDate <= new Date(warehouseFilters.endDate + 'T23:59:59'));

      return matchesWarehouse && matchesMinQty && matchesMaxQty && matchesStartDate && matchesEndDate;
    });
  }

  const searchLower = stockSearchTerm.toLowerCase().trim();

  return warehouseStocks.filter(stock => {
    // Get all possible searchable fields
    const searchableFields = [
      stock.productName,
      stock.warehouseName,
      stock.productSku,
      stock.variationSku,
      stock.productUpc,
      stock.variationUpc,
      stock.variationName,
      stock.combinationDisplay
    ].filter(field => field != null); // Remove null/undefined values

    // Check if any field matches the search term
    const matchesSearch = searchableFields.some(field =>
      field.toLowerCase().includes(searchLower)
    );

    if (!matchesSearch) return false;

    const matchesWarehouse = !warehouseFilters.warehouse ||
      String(stock.warehouseId) === String(warehouseFilters.warehouse);

    const matchesMinQty = !warehouseFilters.minQty || (stock.quantity || 0) >= parseInt(warehouseFilters.minQty);
    const matchesMaxQty = !warehouseFilters.maxQty || (stock.quantity || 0) <= parseInt(warehouseFilters.maxQty);

    const stockDate = parseDate(stock.lastUpdated);
    const matchesStartDate = !warehouseFilters.startDate || (stockDate && stockDate >= new Date(warehouseFilters.startDate));
    const matchesEndDate = !warehouseFilters.endDate || (stockDate && stockDate <= new Date(warehouseFilters.endDate + 'T23:59:59'));

    return matchesWarehouse && matchesMinQty && matchesMaxQty && matchesStartDate && matchesEndDate;
  });
};

export const filterBranchStocks = (branchStocks, stockSearchTerm, branchFilters) => {
  return branchStocks.filter(stock => {
    const searchLower = stockSearchTerm.toLowerCase();
    const effectiveSku = stock.variationSku || stock.productSku || stock.sku || '';
    const effectiveUpc = stock.variationUpc || stock.productUpc || stock.upc || '';

    const matchesSearch = !stockSearchTerm ||
      stock.productName?.toLowerCase().includes(searchLower) ||
      stock.branchName?.toLowerCase().includes(searchLower) ||
      effectiveSku.toLowerCase().includes(searchLower) ||
      effectiveUpc.toLowerCase().includes(searchLower) ||
      stock.variationName?.toLowerCase().includes(searchLower) ||
      stock.combinationDisplay?.toLowerCase().includes(searchLower);

    const matchesBranch = !branchFilters.branch ||
      stock.branchName === branchFilters.branch;

    const matchesMinQty = !branchFilters.minQty || (stock.quantity || 0) >= parseInt(branchFilters.minQty);
    const matchesMaxQty = !branchFilters.maxQty || (stock.quantity || 0) <= parseInt(branchFilters.maxQty);

    const stockDate = parseDate(stock.lastUpdated);
    const matchesStartDate = !branchFilters.startDate || (stockDate && stockDate >= new Date(branchFilters.startDate));
    const matchesEndDate = !branchFilters.endDate || (stockDate && stockDate <= new Date(branchFilters.endDate + 'T23:59:59'));

    return matchesSearch && matchesBranch && matchesMinQty && matchesMaxQty &&
      matchesStartDate && matchesEndDate;
  });
};

export const filterInventories = (inventories, searchTerm, transactionFilters, warehouses, branches) => {
  if (!inventories || inventories.length === 0) return [];

  const filtered = inventories.filter(inv => {
    const searchLower = searchTerm.toLowerCase();
    const isDeleted = inv.isDeleted === true;
    const deletedText = isDeleted ? "deleted" : "";

    const matchesSearch =
      inv.inventoryType?.toLowerCase().includes(searchLower) ||
      inv.verifiedBy?.toLowerCase().includes(searchLower) ||
      inv.remarks?.toLowerCase().includes(searchLower) ||
      deletedText.includes(searchLower) ||
      (inv.fromWarehouse?.warehouseName?.toLowerCase().includes(searchLower)) ||
      (inv.fromBranch?.branchName?.toLowerCase().includes(searchLower)) ||
      (inv.toWarehouse?.warehouseName?.toLowerCase().includes(searchLower)) ||
      (inv.toBranch?.branchName?.toLowerCase().includes(searchLower));

    let matchesType = true;
    if (transactionFilters.type !== 'ALL') {
      if (inv.inventoryType === 'TRANSFER') {
        const hasFrom = inv.fromWarehouse || inv.fromBranch;
        const hasTo = inv.toWarehouse || inv.toBranch;

        if (transactionFilters.type === 'TRANSFER_IN') {
          matchesType = hasTo && !hasFrom;
        } else if (transactionFilters.type === 'TRANSFER_OUT') {
          matchesType = hasFrom && !hasTo;
        } else if (transactionFilters.type === 'TRANSFER') {
          matchesType = true;
        } else {
          matchesType = false;
        }
      } else {
        matchesType = inv.inventoryType === transactionFilters.type;
      }
    }

    const matchesVerifiedBy = !transactionFilters.verifiedBy ||
      inv.verifiedBy?.toLowerCase().includes(transactionFilters.verifiedBy.toLowerCase());

    const transactionDate = parseDate(inv.verificationDate || inv.date || inv.transactionDate || inv.createdAt);
    const matchesStartDate = !transactionFilters.startDate || (transactionDate && transactionDate >= new Date(transactionFilters.startDate));
    const matchesEndDate = !transactionFilters.endDate || (transactionDate && transactionDate <= new Date(transactionFilters.endDate + 'T23:59:59'));

    const itemCount = inv.items?.length || 0;
    const matchesMinItems = !transactionFilters.minItems || itemCount >= parseInt(transactionFilters.minItems);
    const matchesMaxItems = !transactionFilters.maxItems || itemCount <= parseInt(transactionFilters.maxItems);

    return matchesSearch && matchesType && matchesVerifiedBy && matchesStartDate && matchesEndDate && matchesMinItems && matchesMaxItems;
  });

  // Sort: deleted items go to the end
  return filtered.sort((a, b) => {
    if (a.isDeleted && !b.isDeleted) return 1;
    if (!a.isDeleted && b.isDeleted) return -1;
    return 0;
  });
};