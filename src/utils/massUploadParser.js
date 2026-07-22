// Parses pasted mass-upload text into { siteName, vendorName, items }
export const parseMassUploadText = (rawText) => {
  if (!rawText || !rawText.trim()) {
    return { siteName: '', vendorName: '', items: [] };
  }

  const siteMatch = rawText.match(/Site Name:\s*([^\n]+?)(?:\s{2,}|\s+Vendor Name:|\n|$)/i);
  const vendorMatch = rawText.match(/Vendor Name:\s*([^\n]+?)(?:\n|$)/i);

  const siteName = siteMatch ? siteMatch[1].trim() : '';
  const vendorName = vendorMatch ? vendorMatch[1].trim() : '';

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [];
  const headerWords = ['SALES', 'ARTICLE', 'GTIN', 'DESCRIPTION', 'QTY', 'UNIT', 'COST', 'AMOUNT'];

  lines.forEach((line) => {
    if (/^Site Name:/i.test(line) || /^Vendor Name:/i.test(line)) return;

    const upper = line.toUpperCase();
    const isHeaderLine = headerWords.filter(w => upper.includes(w)).length >= 4;
    if (isHeaderLine) return;

    const tokens = line.split(/\s+/);
    if (tokens.length < 6) return;

    const articleCode = tokens[0];
    const gtin = tokens[1];
    if (!/^\d+$/.test(articleCode)) return;

    const amountRaw = tokens[tokens.length - 1];
    const unitCostRaw = tokens[tokens.length - 2];
    const qtyRaw = tokens[tokens.length - 3];

    const numPattern = /^[\d,]+(\.\d+)?$/;
    if (!numPattern.test(qtyRaw) || !numPattern.test(unitCostRaw) || !numPattern.test(amountRaw)) return;

    const description = tokens.slice(2, tokens.length - 3).join(' ');
    if (!description) return;

    items.push({
      articleCode,
      gtin,
      description,
      qty: parseInt(qtyRaw.replace(/,/g, ''), 10) || 0,
      unitCost: parseFloat(unitCostRaw.replace(/,/g, '')) || 0,
      amount: parseFloat(amountRaw.replace(/,/g, '')) || 0,
    });
  });

  return { siteName, vendorName, items };
};

// e.g. "2277 ABACUS - Taft" -> tries branchCode "2277" first, then name match
export const matchBranch = (siteName, branches) => {
  if (!siteName || !branches?.length) return null;

  const trimmed = siteName.trim();
  const codeMatch = trimmed.match(/^(\S+)\s+(.*)$/);
  const leadingCode = codeMatch ? codeMatch[1] : null;
  const restName = codeMatch ? codeMatch[2].trim().toLowerCase() : trimmed.toLowerCase();

  if (leadingCode) {
    const byCode = branches.find(b => (b.branchCode || '').toLowerCase() === leadingCode.toLowerCase());
    if (byCode) return byCode;
  }

  const byName = branches.find(b => (b.branchName || '').toLowerCase() === restName);
  if (byName) return byName;

  const byIncludes = branches.find(b => restName && (b.branchName || '').toLowerCase().includes(restName));
  if (byIncludes) return byIncludes;

  const bySiteIncludes = branches.find(b =>
    b.branchName && trimmed.toLowerCase().includes(b.branchName.toLowerCase())
  );
  return bySiteIncludes || null;
};

// productOptions items look like: { parentProductId, variationId, sku, upc, companySku, fullName, price }
export const matchProductToItem = (item, productOptions) => {
  if (!Array.isArray(productOptions) || !productOptions.length) return null;

  const norm = (v) => (v || '').toString().trim().toLowerCase();
  const article = norm(item.articleCode);
  const gtin = norm(item.gtin);

  let match = productOptions.find(opt => norm(opt.sku) === article);
  if (match) return { option: match, matchedBy: 'sku (article)' };

  match = productOptions.find(opt => norm(opt.companySku) === article);
  if (match) return { option: match, matchedBy: 'company SKU (article)' };

  match = productOptions.find(opt => norm(opt.upc) === gtin);
  if (match) return { option: match, matchedBy: 'UPC (gtin)' };

  match = productOptions.find(opt => norm(opt.sku) === gtin);
  if (match) return { option: match, matchedBy: 'sku (gtin)' };

  match = productOptions.find(opt => norm(opt.upc) === article);
  if (match) return { option: match, matchedBy: 'UPC (article)' };

  return null;
};