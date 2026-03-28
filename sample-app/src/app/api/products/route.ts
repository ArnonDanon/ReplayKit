import { NextResponse } from 'next/server';

// Mock product catalogue — keeps the sample app fully self-contained
const PRODUCTS = [
  { id:  1, name: 'Widget Alpha',      category: 'Electronics', price:  29.99, stock: 150 },
  { id:  2, name: 'Gadget Beta',       category: 'Electronics', price:  49.99, stock:  75 },
  { id:  3, name: 'Sensor Gamma',      category: 'Electronics', price:  19.99, stock:   8 },
  { id:  4, name: 'Controller Delta',  category: 'Electronics', price:  89.99, stock:  42 },
  { id:  5, name: 'Module Epsilon',    category: 'Components',  price:  14.99, stock: 200 },
  { id:  6, name: 'Board Zeta',        category: 'Components',  price:  34.99, stock:  60 },
  { id:  7, name: 'Cable Eta',         category: 'Accessories', price:   9.99, stock: 300 },
  { id:  8, name: 'Mount Theta',       category: 'Accessories', price:  24.99, stock:  18 },
  { id:  9, name: 'Hub Iota',          category: 'Electronics', price:  64.99, stock:  33 },
  { id: 10, name: 'Adapter Kappa',     category: 'Accessories', price:  12.99, stock: 120 },
  { id: 11, name: 'Display Lambda',    category: 'Electronics', price: 199.99, stock:  25 },
  { id: 12, name: 'Speaker Mu',        category: 'Electronics', price:  79.99, stock:  50 },
  { id: 13, name: 'Keyboard Nu',       category: 'Peripherals', price:  59.99, stock:  45 },
  { id: 14, name: 'Mouse Xi',          category: 'Peripherals', price:  39.99, stock:  88 },
  { id: 15, name: 'Webcam Omicron',    category: 'Peripherals', price:  99.99, stock:  12 },
  { id: 16, name: 'Headset Pi',        category: 'Peripherals', price: 149.99, stock:  30 },
  { id: 17, name: 'Drive Rho',         category: 'Storage',     price:  89.99, stock:  70 },
  { id: 18, name: 'Card Sigma',        category: 'Storage',     price:  49.99, stock:  95 },
  { id: 19, name: 'Enclosure Tau',     category: 'Storage',     price:  34.99, stock:  15 },
  { id: 20, name: 'Dock Upsilon',      category: 'Accessories', price:  69.99, stock:  40 },
];

export function GET() {
  return NextResponse.json(PRODUCTS);
}
