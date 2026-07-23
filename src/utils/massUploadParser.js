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
    const headerWords = ['ARTICLE', 'GTIN', 'DESCRIPTION', 'QTY', 'UNIT', 'COST', 'AMOUNT'];
    let hitFooter = false;
    let section = null;

    lines.forEach((line) => {
        if (hitFooter) return;
        if (/^Site Name:/i.test(line) || /^Vendor Name:/i.test(line) || /^Accounting Period/i.test(line)) return;

        if (/Total Item\(s\) Sold/i.test(line)) { hitFooter = true; return; }

        const upper = line.toUpperCase();
        const isHeaderLine = headerWords.filter(w => upper.includes(w)).length >= 4;
        if (isHeaderLine) {
            section = upper.startsWith('RETURNS') ? 'returns' : 'sales';
            return;
        }

        if (section !== 'sales') return;

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


const normalizeSiteName = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

const coreBranchName = (name) => {
    if (!name) return '';
    const withoutLeadingCode = name.trim().replace(/^\d+\s+/, '');
    const parts = withoutLeadingCode.split('-');
    const tail = parts.length > 1 ? parts[parts.length - 1] : withoutLeadingCode;
    return tail.trim().toLowerCase().replace(/\s+/g, ' ');
};
export const parseMassUploadReports = (rawText) => {
    if (!rawText || !rawText.trim()) return [];

    const hasPeriodMarkers = /Accounting\s*Period/i.test(rawText);
    let segments = hasPeriodMarkers
        ? rawText.split(/(?=Accounting\s*Period)/i).filter(seg => /Site Name:/i.test(seg))
        : [rawText];

    if (!segments.length) segments = [rawText];

    const parsedPages = segments.map(parseMassUploadText).filter(r => r.siteName);

    const merged = [];
    parsedPages.forEach((page) => {
        const last = merged[merged.length - 1];
        if (last && normalizeSiteName(last.siteName) === normalizeSiteName(page.siteName)) {
            last.items = [...last.items, ...page.items];
            if (!last.month && page.month) last.month = page.month;
            if (!last.year && page.year) last.year = page.year;
        } else {
            merged.push({ ...page, items: [...page.items] });
        }
    });

    // Drop branches with zero sale items (e.g. a page that was RETURNS-only)
    return merged.filter(r => r.items.length > 0);
};


export const buildSaleItemsFromMatches = (matchedRows) =>
    matchedRows
        .filter(r => r.matched)
        .map(r => ({
            productId: r.matched.option.parentProductId,
            variationId: r.matched.option.variationId || null,
            quantity: r.qty,
            unitPrice: null,
        }));


export const isReportComplete = (matchedRows) =>
    matchedRows.length > 0 && matchedRows.every(r => !!r.matched);

const uniqueMatch = (matches) => (matches.length === 1 ? matches[0] : null);

export const matchBranch = (siteName, branches) => {
    if (!siteName || !branches?.length) return null;

    const trimmed = siteName.trim();
    const codeMatch = trimmed.match(/^(\S+)\s+(.*)$/);
    const leadingCode = codeMatch ? codeMatch[1] : null;

    if (leadingCode) {
        const byCode = uniqueMatch(branches.filter(b => (b.branchCode || '').toLowerCase() === leadingCode.toLowerCase()));
        if (byCode) return byCode;
    }


    const siteCore = coreBranchName(trimmed);
    if (!siteCore) return null;

    const byCoreExact = uniqueMatch(branches.filter(b => coreBranchName(b.branchName) === siteCore));
    if (byCoreExact) return byCoreExact;

    return null;
};


const normalizeCode = (v) => {
    const digitsOnly = (v || '').toString().replace(/\D/g, '');
    const stripped = digitsOnly.replace(/^0+/, '');
    return stripped || digitsOnly || '';
};


const last9Digits = (v) => (v || '').toString().replace(/\D/g, '').slice(-9);

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
            return (normVal && (normVal === article || normVal === gtin));
        });
        if (match) return { option: match, matchedBy: `${field} (code match)` };
    }

    for (const field of codeFields) {
        const match = productOptions.find(opt =>
            rawSkuNorm(opt[field]) === rawSkuNorm(item.articleCode) ||
            rawSkuNorm(opt[field]) === rawSkuNorm(item.gtin)
        );
        if (match) return { option: match, matchedBy: `${field} (exact match)` };
    }


    const articleLast9 = last9Digits(item.articleCode);
    const gtinLast9 = last9Digits(item.gtin);
    if (articleLast9.length === 9 || gtinLast9.length === 9) {
        for (const field of codeFields) {
            const match = productOptions.find(opt => {
                const val = opt[field];
                if (!val) return false;
                const valLast9 = last9Digits(val);
                if (valLast9.length !== 9) return false;
                return (articleLast9.length === 9 && valLast9 === articleLast9)
                    || (gtinLast9.length === 9 && valLast9 === gtinLast9);
            });
            if (match) return { option: match, matchedBy: `${field} (last-9-digit match)` };
        }
    }

    return null;
};