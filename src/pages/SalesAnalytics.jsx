import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3, Download, Printer, Calendar,
  MapPin, DollarSign, Ticket, TrendingUp,
  Percent, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

export const SalesAnalytics = () => {
  const { db, currentUser, showToast } = useApp();

  const [dateRange, setDateRange]       = useState('monthly');
  const [customStart, setCustomStart]   = useState('');
  const [customEnd, setCustomEnd]       = useState('');
  const [filterSiteId, setFilterSiteId] = useState('all');
  const [filterProfileId, setFilterProfileId] = useState('all');

  if (!currentUser) return null;

  // ── Data filtering ─────────────────────────────────────────────────────────
  const getFilteredSales = () => {
    let sold = db.coupons.filter(c => c.status === 'Sold');

    if (filterSiteId !== 'all')    sold = sold.filter(c => c.siteId    === filterSiteId);
    if (filterProfileId !== 'all') sold = sold.filter(c => c.profileId === filterProfileId);

    const now = Date.now();
    if (dateRange === 'daily')   return sold.filter(c => new Date(c.soldAt).getTime() >= now - 86400000);
    if (dateRange === 'weekly')  return sold.filter(c => new Date(c.soldAt).getTime() >= now - 604800000);
    if (dateRange === 'monthly') return sold.filter(c => new Date(c.soldAt).getTime() >= now - 2592000000);
    if (dateRange === 'custom') {
      const start = customStart ? new Date(customStart).getTime() : 0;
      const end   = customEnd   ? new Date(customEnd + 'T23:59:59').getTime() : now;
      return sold.filter(c => {
        const t = new Date(c.soldAt).getTime();
        return t >= start && t <= end;
      });
    }
    return sold;
  };

  const sales = getFilteredSales();

  // ── Metrics ────────────────────────────────────────────────────────────────
  const totalRevenue = sales.reduce((s, c) => s + c.salePrice, 0);
  const totalCost    = sales.reduce((s, c) => s + c.cost, 0);
  const totalProfit  = totalRevenue - totalCost;
  const margin       = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  // Per-site breakdown
  const siteBreakdown = db.sites.map(site => {
    const siteSales   = sales.filter(c => c.siteId === site.id);
    const revenue     = siteSales.reduce((s, c) => s + c.salePrice, 0);
    const cost        = siteSales.reduce((s, c) => s + c.cost, 0);
    return { site, count: siteSales.length, revenue, profit: revenue - cost };
  }).filter(r => r.count > 0).sort((a, b) => b.revenue - a.revenue);

  // Per-profile breakdown
  const profileBreakdown = db.couponProfiles.map(prof => {
    const profSales = sales.filter(c => c.profileId === prof.id);
    const revenue   = profSales.reduce((s, c) => s + c.salePrice, 0);
    return { prof, count: profSales.length, revenue };
  }).filter(r => r.count > 0).sort((a, b) => b.count - a.count);

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (sales.length === 0) { showToast('No data to export'); return; }

    const rows = [
      ['Coupon Code', 'Profile', 'Site', 'Sold By', 'Sale Price (AED)', 'Cost Price (AED)', 'Profit (AED)', 'Sold At'],
      ...sales.map(c => {
        const prof = db.couponProfiles.find(p => p.id === c.profileId)?.name || c.profileId;
        const site = db.sites.find(s => s.id === c.siteId)?.name || c.siteId;
        const user = db.users.find(u => u.id === c.soldByUserId)?.name || c.soldByUserId;
        return [c.code, prof, site, user, c.salePrice, c.cost, c.salePrice - c.cost, new Date(c.soldAt).toLocaleString()];
      })
    ];

    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `sales_analytics_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully');
  };

  // ── Print ──────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title-main">Sales Analytics</h1>
          <p className="page-subtitle">Full financial breakdown across all sites, profiles and date ranges</p>
        </div>
        <div className="page-actions-group">
          <button className="action-btn btn-outlined" onClick={handlePrint}>
            <Printer size={14} /> Print Report
          </button>
          <button className="action-btn btn-brand-blue" onClick={handleExportCSV}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-container-row" style={{ background: 'var(--surface)', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <div className="flex-align-items-center" style={{ gap: '0.5rem' }}>
          <Calendar size={14} style={{ color: 'var(--text-3)' }} />
          <select className="filter-dropdown-select" value={dateRange} onChange={e => setDateRange(e.target.value)}>
            <option value="daily">Past 24 Hours</option>
            <option value="weekly">Past 7 Days</option>
            <option value="monthly">Past 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {dateRange === 'custom' && (
          <div className="flex-align-items-center" style={{ gap: '0.5rem' }}>
            <input type="date" className="filter-dropdown-select" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>to</span>
            <input type="date" className="filter-dropdown-select" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
          </div>
        )}

        <div className="flex-align-items-center" style={{ gap: '0.5rem' }}>
          <MapPin size={14} style={{ color: 'var(--text-3)' }} />
          <select className="filter-dropdown-select" value={filterSiteId} onChange={e => setFilterSiteId(e.target.value)}>
            <option value="all">All Sites</option>
            {db.sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="flex-align-items-center" style={{ gap: '0.5rem' }}>
          <Ticket size={14} style={{ color: 'var(--text-3)' }} />
          <select className="filter-dropdown-select" value={filterProfileId} onChange={e => setFilterProfileId(e.target.value)}>
            <option value="all">All Profiles</option>
            {db.couponProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid" style={{ marginTop: '1.5rem' }}>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label-text">Total Revenue</span>
            <div className="metric-icon-wrapper" style={{ background: 'var(--green-light)', color: 'var(--green)' }}>
              <DollarSign size={14} />
            </div>
          </div>
          <div className="metric-value-text">{totalRevenue.toFixed(2)} AED</div>
          <div className="metric-sub-detail">Gross sales in period</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label-text">Total Cost</span>
            <div className="metric-icon-wrapper" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>
              <Ticket size={14} />
            </div>
          </div>
          <div className="metric-value-text">{totalCost.toFixed(2)} AED</div>
          <div className="metric-sub-detail">Inventory purchase cost</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label-text">Net Profit</span>
            <div className="metric-icon-wrapper" style={{ background: 'var(--purple-light)', color: 'var(--purple)' }}>
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="metric-value-text" style={{ color: totalProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {totalProfit.toFixed(2)} AED
          </div>
          <div className="metric-sub-detail" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            {totalProfit >= 0
              ? <ArrowUpRight size={12} style={{ color: 'var(--green)' }} />
              : <ArrowDownRight size={12} style={{ color: 'var(--red)' }} />}
            Margin: {margin}%
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label-text">Coupons Sold</span>
            <div className="metric-icon-wrapper" style={{ background: 'var(--yellow-light)', color: 'var(--yellow)' }}>
              <Percent size={14} />
            </div>
          </div>
          <div className="metric-value-text">{sales.length}</div>
          <div className="metric-sub-detail">Units activated</div>
        </div>
      </div>

      {/* Site Breakdown */}
      {siteBreakdown.length > 0 && (
        <div className="ui-card" style={{ marginTop: '1.5rem' }}>
          <div className="ui-card-header">
            <span className="ui-card-title">Revenue by Site</span>
          </div>
          <div className="ui-card-body" style={{ padding: 0 }}>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Coupons Sold</th>
                    <th>Revenue (AED)</th>
                    <th>Profit (AED)</th>
                    <th>Share %</th>
                  </tr>
                </thead>
                <tbody>
                  {siteBreakdown.map(({ site, count, revenue, profit }) => (
                    <tr key={site.id}>
                      <td style={{ fontWeight: 600 }}>{site.name}</td>
                      <td>{count}</td>
                      <td style={{ color: 'var(--green)', fontWeight: 600 }}>{revenue.toFixed(2)}</td>
                      <td style={{ color: profit >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{profit.toFixed(2)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${totalRevenue > 0 ? (revenue / totalRevenue * 100) : 0}%`, height: '100%', background: 'var(--brand-blue)', borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', minWidth: '36px' }}>
                            {totalRevenue > 0 ? (revenue / totalRevenue * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Profile Breakdown */}
      {profileBreakdown.length > 0 && (
        <div className="ui-card" style={{ marginTop: '1.5rem' }}>
          <div className="ui-card-header">
            <span className="ui-card-title">Sales by Profile</span>
          </div>
          <div className="ui-card-body" style={{ padding: 0 }}>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Profile</th>
                    <th>Units Sold</th>
                    <th>Revenue (AED)</th>
                    <th>% of Total Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {profileBreakdown.map(({ prof, count, revenue }) => (
                    <tr key={prof.id}>
                      <td style={{ fontWeight: 600 }}>{prof.name}</td>
                      <td>{count}</td>
                      <td style={{ color: 'var(--green)', fontWeight: 600 }}>{revenue.toFixed(2)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${sales.length > 0 ? (count / sales.length * 100) : 0}%`, height: '100%', background: 'var(--purple)', borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', minWidth: '36px' }}>
                            {sales.length > 0 ? (count / sales.length * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Full Transaction Table */}
      <div className="ui-card" style={{ marginTop: '1.5rem' }}>
        <div className="ui-card-header">
          <span className="ui-card-title">Transaction Detail</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{sales.length} records</span>
        </div>
        <div className="ui-card-body" style={{ padding: 0 }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Coupon Code</th>
                  <th>Profile</th>
                  <th>Site</th>
                  <th>Sold By</th>
                  <th>Sale Price</th>
                  <th>Cost</th>
                  <th>Profit</th>
                  <th>Sold At</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-view-state" style={{ padding: '3rem 1rem' }}>
                      <div className="empty-view-title">No transactions found for the selected filters</div>
                    </td>
                  </tr>
                ) : (
                  sales.map(c => {
                    const prof   = db.couponProfiles.find(p => p.id === c.profileId);
                    const site   = db.sites.find(s => s.id === c.siteId);
                    const user   = db.users.find(u => u.id === c.soldByUserId);
                    const profit = c.salePrice - c.cost;
                    return (
                      <tr key={c.id}>
                        <td className="td-monospaced td-emphasis">{c.code}</td>
                        <td>{prof?.name || '-'}</td>
                        <td>{site?.name || '-'}</td>
                        <td>{user?.name || '-'}</td>
                        <td style={{ fontWeight: 600, color: 'var(--green)' }}>{c.salePrice} AED</td>
                        <td>{c.cost} AED</td>
                        <td style={{ fontWeight: 600, color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>{profit} AED</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{new Date(c.soldAt).toLocaleString()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          #sidebar-nav, #main-viewport > nav, .page-actions-group,
          .filters-container-row { display: none !important; }
          .ui-card { break-inside: avoid; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
};
