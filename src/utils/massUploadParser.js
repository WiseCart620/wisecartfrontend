const MONTH_NAMES = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
];
const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const monthNameToNumber = (word) => {
    const w = (word || '').toLowerCase().replace(/[^a-z]/g, '');
    let idx = MONTH_NAMES.indexOf(w);
    if (idx >= 0) return idx + 1;
    idx = MONTH_ABBR.indexOf(w.slice(0, 3));
    return idx >= 0 ? idx + 1 : null;
};


export const parseAccountingPeriod = (rawText) => {
    if (!rawText) return { month: null, year: null };

    const periodIdx = rawText.search(/Accounting\s*Period/i);
    if (periodIdx === -1) return { month: null, year: null };

    // Look at a window of text after the label (handles stray whitespace/newlines
    // or unrelated tokens injected by PDF column extraction)
    const window = rawText.slice(periodIdx, periodIdx + 200);

    // Try "Month YYYY" or "Month, YYYY" or "Month-YYYY"
    const monthYearMatch = window.match(/([A-Za-z]{3,9})\.?\s*,?\s*-?\s*(\d{4})/);
    if (monthYearMatch) {
        const month = monthNameToNumber(monthYearMatch[1]);
        if (month) {
            return { month, year: parseInt(monthYearMatch[2], 10) };
        }
    }

    // Try "MM/YYYY" or "MM-YYYY"
    const numericMatch = window.match(/(\d{1,2})[\/\-](\d{4})/);
    if (numericMatch) {
        const month = parseInt(numericMatch[1], 10);
        if (month >= 1 && month <= 12) {
            return { month, year: parseInt(numericMatch[2], 10) };
        }
    }

    return { month: null, year: null };
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