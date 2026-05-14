/**
 * Generates a unique order number like PED-20260514-0042
 */
export function generateOrderNumber() {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `PED-${dateStr}-${rand}`;
}