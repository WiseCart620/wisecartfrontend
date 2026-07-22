const MONTH_NAMES = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
];

// Parses "Accounting Period November 2024" -> { month: 11, year: 2024 }
export const parseAccountingPeriod = (rawText) => {
    const match = rawText.match(/Accounting Period[:\s]+([A-Za-z]+)\s+(\d{4})/i);
    if (!match) return { month: null, year: null };
    const monthIdx = MONTH_NAMES.indexOf(match[1].toLowerCase());
    return {
        month: monthIdx >= 0 ? monthIdx + 1 : null,
        year: parseInt(match[2], 10),
    };
};

// Parses pasted mass-upload text into { siteName, vendorName, items, month, year }
export const parseMassUploadText = (rawText) => {
    if (!rawText || !rawText.trim()) {
        return { siteName: '', vendorName: '', items: [], month: null, year: null };
    }

    const siteMatch = rawText.match(/Site Name:\s*([^\n]+?)(?:\s{2,}|\s+Vendor Name:|\n|$)/i);
    const vendorMatch = rawText.match(/Vendor Name:\s*([^\n]+?)(?:\n|$)/i);

    const siteName = siteMatch ? siteMatch[1].trim() : '';
    const vendorName = vendorMatch ? vendorMatch[1].trim() : '';
    const { month, year } = parseAccountingPeriod(rawText);
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const items = [];
    const headerWords = ['SALES', 'ARTICLE', 'GTIN', 'DESCRIPTION', 'QTY', 'UNIT', 'COST', 'AMOUNT'];

    lines.forEach((line) => {
        if (/^Site Name:/i.test(line) || /^Vendor Name:/i.test(line) || /^Accounting Period/i.test(line)) return;

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

    return { siteName, vendorName, items, month, year };
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

// Strips everything but digits, then strips leading zeros, so
// "S200000294801", "200000294801", and "0200000294801" all compare equal.
const normalizeCode = (v) => {
    const digitsOnly = (v || '').toString().replace(/\D/g, '');
    const stripped = digitsOnly.replace(/^0+/, '');
    return stripped || digitsOnly || '';
};

// productOptions items look like: { parentProductId, variationId, sku, upc, companySku, fullName, price }
export const matchProductToItem = (item, productOptions) => {
    if (!Array.isArray(productOptions) || !productOptions.length) return null;

    const article = normalizeCode(item.articleCode);
    const gtin = normalizeCode(item.gtin);
    const rawSkuNorm = (v) => (v || '').toString().trim().toLowerCase();

    const codeFields = ['sku', 'upc', 'companySku'];

    for (const field of codeFields) {
        const match = productOptions.find(opt => {
            const val = opt[field];
            if (!val) return false;
            const normVal = normalizeCode(val);
            // numeric-code match, ignoring letter prefixes and leading zeros
            return (normVal && (normVal === article || normVal === gtin));
        });
        if (match) return { option: match, matchedBy: `${field} (code match)` };
    }

    // fallback: exact case-insensitive string match, in case SKU is alphanumeric (no digits)
    for (const field of codeFields) {
        const match = productOptions.find(opt =>
            rawSkuNorm(opt[field]) === rawSkuNorm(item.articleCode) ||
            rawSkuNorm(opt[field]) === rawSkuNorm(item.gtin)
        );
        if (match) return { option: match, matchedBy: `${field} (exact match)` };
    }

    return null;
};