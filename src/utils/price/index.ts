export const formattedPrice = (price: number) => {
  const roundedPrice = Math.floor(price);
  return roundedPrice.toLocaleString('en-US');
};

export const priceWithoutLastTwoDigits = (price: number) => {
  if (price) {
    return price > 0 ? parseInt(price.toString().slice(0, -2)) : 0;
  } else {
    return 0;
  }
};
