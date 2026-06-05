export const formatNumberWithCommas = (value) => {
    if (!value && value !== 0) return '';
    const stringValue = String(value);
    const numericValue = stringValue.replace(/[^0-9.]/g, '');
    if (!numericValue) return '';

    const parts = numericValue.split('.');
    let wholePart = parts[0];
    const decimalPart = parts.length > 1 ? parts[1] : '';
    wholePart = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decimalPart ? `${wholePart}.${decimalPart}` : wholePart;
};

export const parseFormattedNumber = (formattedValue) => {
    if (!formattedValue && formattedValue !== 0) return '';
    const stringValue = String(formattedValue);
    return stringValue.replace(/[^0-9.]/g, '');
};

export const calculateAmountFromPercent = (percent, total) => {
    const percentage = parseFloat(percent) || 0;
    const totalAmount = parseFloat(total) || 0;
    return (totalAmount * percentage) / 100;
};

export const handleCalculatorInput = (currentValue, newInput, isBackspace, decimals = 2) => {
    const raw = parseFloat(currentValue || 0).toFixed(decimals).replace('.', '');

    let newRaw;
    if (isBackspace) {
        newRaw = raw.length > 1 ? raw.slice(0, -1) : '0';
    } else {
        const digit = String(newInput).replace(/[^0-9]/g, '').slice(-1);
        if (!digit) return currentValue;
        const stripped = raw.replace(/^0+/, '') || '0';
        newRaw = stripped + digit;
    }

    const padded = newRaw.padStart(decimals + 1, '0');
    const intPart = padded.slice(0, padded.length - decimals);
    const decPart = padded.slice(padded.length - decimals);

    return `${parseInt(intPart, 10)}.${decPart}`;
};

export const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

export const formatNumber = (num) => {
    if (!num && num !== 0) return '-';
    return parseInt(num).toLocaleString('en-US');
};