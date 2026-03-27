export const parseWeightGrams = (weight: string): number => {
  const normalized = weight.toLowerCase().replace(',', '.');
  const valueMatch = normalized.match(/[\d.]+/);
  if (!valueMatch) {
    return 0;
  }
  const value = Number(valueMatch[0]);
  if (Number.isNaN(value)) {
    return 0;
  }
  if (normalized.includes('кг')) {
    return Math.round(value * 1000);
  }
  if (normalized.includes('г')) {
    return Math.round(value);
  }
  if (normalized.includes('мл')) {
    return Math.round(value);
  }
  return Math.round(value);
};

export const getPricePerKg = (price: number, baseWeightGrams: number): number => {
  if (baseWeightGrams <= 0) {
    return 0;
  }
  return Math.round((price / baseWeightGrams) * 1000);
};

export const getSubtotal = (
  price: number,
  baseWeightGrams: number,
  selectedGrams: number
): number => {
  if (baseWeightGrams <= 0) {
    return 0;
  }
  return Math.round(price * (selectedGrams / baseWeightGrams));
};

export const formatGrams = (grams: number): string => `${grams} г`;
