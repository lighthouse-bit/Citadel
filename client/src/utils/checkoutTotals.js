export const checkoutTotal=(subtotal,shipping=0,discount=0)=>Number((Math.max(0,Number(subtotal)-Number(discount))+Number(shipping)).toFixed(2));
