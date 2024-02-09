export const formattedPrice = (price: number) => {
  const roundedPrice = Math.floor(price);
  return roundedPrice.toLocaleString('en-US');
};
