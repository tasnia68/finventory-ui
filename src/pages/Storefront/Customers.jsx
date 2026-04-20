import React, { useEffect, useState } from 'react';
import { getStorefrontCustomers } from '../../services/storefrontService';

const formatDateTime = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
};

const StorefrontCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getStorefrontCustomers()
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.email || '').toLowerCase().includes(q) || (c.name || '').toLowerCase().includes(q);
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Storefront Customers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {customers.length} customer{customers.length !== 1 ? 's' : ''} registered
          </p>
        </div>
      </div>

      <div>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading customers…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
          {search ? 'No customers match your search.' : 'No storefront customers yet.'}
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Verified</th>
                <th className="px-4 py-3 font-medium">Last login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{c.email}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.name || '—'}</td>
                  <td className="px-4 py-3">
                    {c.emailVerifiedAt ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Verified
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Unverified</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDateTime(c.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StorefrontCustomers;
