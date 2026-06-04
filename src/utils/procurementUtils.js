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
    const multiplier = Math.pow(10, decimals);
    const currentUnits = Math.round(parseFloat(currentValue || '0') * multiplier);
    const currentStr = currentUnits.toString().padStart(1, '0');

    let newUnits;
    if (isBackspace) {
        newUnits = Math.floor(currentUnits / 10);
    } else {
        const digit = newInput.replace(/[^0-9]/g, '').slice(-1);
        if (digit) {
            newUnits = parseInt(currentStr + digit);
        } else {
            return currentValue;
        }
    }
    return (newUnits / multiplier).toFixed(decimals);
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