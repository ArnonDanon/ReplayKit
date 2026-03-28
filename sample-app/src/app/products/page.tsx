'use client';

import { useState, useEffect } from 'react';

interface Product {
  id:       number;
  name:     string;
  category: string;
  price:    number;
  stock:    number;
}

type SortField = keyof Omit<Product, 'id'>;

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir,   setSortDir]   = useState<'asc' | 'desc'>('asc');

  // Simulates an API call — generates a network event in the tracker
  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then((data: Product[]) => {
        setProducts(data);
        setLoading(false);
        console.log(`[sample-app] Loaded ${data.length} products`);
      });
  }, []);

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  const filtered = products
    .filter(p =>
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.category.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      const av = a[sortField], bv = b[sortField];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  function icon(field: SortField) {
    if (sortField !== field) return <span className="sort-icon" style={{ opacity: 0.3 }}>↕</span>;
    return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <>
      <h1>Products</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
        Filter and sort to generate DOM mutation events.
      </p>

      <div className="card">
        <div className="table-toolbar">
          <input
            className="input"
            style={{ maxWidth: 280 }}
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by name or category…"
          />
          <span className="badge-count">{filtered.length} / {products.length}</span>
          {filter && (
            <button className="btn btn-sm btn-outline" onClick={() => setFilter('')}>
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <p style={{ color: 'var(--muted)' }}>Loading products…</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No products match your filter.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')}>Name {icon('name')}</th>
                <th onClick={() => handleSort('category')}>Category {icon('category')}</th>
                <th onClick={() => handleSort('price')}>Price {icon('price')}</th>
                <th onClick={() => handleSort('stock')}>Stock {icon('stock')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>${p.price.toFixed(2)}</td>
                  <td
                    style={{ color: p.stock < 20 ? 'var(--danger)' : p.stock < 50 ? '#d97706' : 'var(--success)' }}
                    title={p.stock < 20 ? 'Low stock' : undefined}
                  >
                    {p.stock}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
