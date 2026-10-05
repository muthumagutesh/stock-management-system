/**
 * Indian Rupee (₹) and Indian Numbering System Formatters
 * APEXSTOCK™ India Edition
 */

export const formatINR = (amount: number | string | undefined | null): string => {
  if (amount === undefined || amount === null) return '₹0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';

  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatINRLakhs = (amount: number | string | undefined | null): string => {
  if (amount === undefined || amount === null) return '₹0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0';

  if (Math.abs(num) >= 10000000) {
    return '₹' + (num / 10000000).toFixed(2) + ' Cr';
  } else if (Math.abs(num) >= 100000) {
    return '₹' + (num / 100000).toFixed(2) + ' L';
  } else if (Math.abs(num) >= 1000) {
    return '₹' + (num / 1000).toFixed(1) + ' k';
  }
  return formatINR(num);
};

export const formatIndianDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
};

export const calculateGST = (taxableAmount: number, gstRate: number, isInterState: boolean) => {
  const totalTax = (taxableAmount * gstRate) / 100;
  if (isInterState) {
    return {
      taxableAmount,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: totalTax,
      totalAmount: taxableAmount + totalTax
    };
  } else {
    const halfTax = totalTax / 2;
    return {
      taxableAmount,
      cgstAmount: halfTax,
      sgstAmount: halfTax,
      igstAmount: 0,
      totalAmount: taxableAmount + totalTax
    };
  }
};
