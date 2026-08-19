import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Search, TrendingUp } from 'lucide-react';

const ProductUnitCostingTab = () => {
    const [unitCosts, setUnitCosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [hoveredProduct, setHoveredProduct] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [hoverChartData, setHoverChartData] = useState([]);
    const [chartPos, setChartPos] = useState({ x: 0, y: 0 });
    const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
    const hoverTimeout = useRef(null);
    const hoverChartTimeout = useRef(null);

    useEffect(() => {
        loadUnitCosts();
    }, []);

    const loadUnitCosts = async () => {
        try {
            const res = await api.get('/unit-costs');
            if (res.success) {
                const data = res.data?.data || res.data || [];
                setUnitCosts(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadHistory = async (productId, variationId, e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setChartPos({ x: rect.left, y: rect.top });
        try {
            const params = variationId ? `?productId=${productId}&variationId=${variationId}` : `?productId=${productId}`;
            const res = await api.get(`/unit-costs/history${params}`);
            if (res.success) {
                const data = res.data?.data || res.data || [];
                setChartData(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            setChartData([]);
        }
    };

    const filtered = unitCosts.filter(p =>
        p.productName?.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()) ||
        p.upc?.toLowerCase().includes(search.toLowerCase())
    );

    const formatCost = (val) => {
        if (!val) return '₱0.00';
        return `₱${parseFloat(val).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const MiniChart = ({ data, pos, onClose, isHover = false }) => {
        if (!data || data.length === 0) return null;
        const values = data.map(d => parseFloat(d.unitCost) || 0);
        const minV = Math.min(...values);
        const maxV = Math.max(...values);
        const range = maxV - minV || 1;
        const W = isHover ? 320 : 460, H = isHover ? 140 : 180, padX = 48, padY = 20;
        const innerW = W - padX * 2;
        const innerH = H - padY * 2;

        const pts = data.map((d, i) => ({
            x: padX + (i / Math.max(data.length - 1, 1)) * innerW,
            y: padY + innerH - ((parseFloat(d.unitCost) - minV) / range) * innerH,
            date: new Date(d.createdAt).toLocaleDateString(),
            val: parseFloat(d.unitCost)
        }));

        const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

        const style = isHover ? {
            position: 'fixed',
            left: Math.min(pos.x, window.innerWidth - 340),
            top: pos.y - 185,
            zIndex: 99999,
            pointerEvents: 'none',
            ...(pos.y - 185 < 10 && { top: pos.y + 30 })
        } : {};

        return (
            <div style={style} className={isHover ? "bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-80" : ""}>
                <div className="text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1">
                        <TrendingUp size={12} className="text-blue-500" />
                        Unit Cost History
                    </span>
                </div>
                <svg width={W} height={H}>
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                        const y = padY + innerH * (1 - t);
                        const val = minV + range * t;
                        return (
                            <g key={i}>
                                <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="#f0f0f0" strokeWidth="1" />
                                <text x={padX - 4} y={y + 3} fontSize="8" fill="#aaa" textAnchor="end">
                                    {val.toFixed(0)}
                                </text>
                            </g>
                        );
                    })}
                    {/* Line */}
                    <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
                    {/* Area fill */}
                    <path
                        d={`${pathD} L ${pts[pts.length - 1].x} ${padY + innerH} L ${pts[0].x} ${padY + innerH} Z`}
                        fill="url(#grad)"
                        opacity="0.15"
                    />
                    <defs>
                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {/* Dots */}
                    {pts.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#3b82f6" />
                    ))}
                    {/* X labels: show first and last */}
                    {pts.length > 0 && (
                        <>
                            <text x={pts[0].x} y={H - 4} fontSize="8" fill="#aaa" textAnchor="middle">{pts[0].date}</text>
                            {pts.length > 1 && (
                                <text x={pts[pts.length - 1].x} y={H - 4} fontSize="8" fill="#aaa" textAnchor="middle">
                                    {pts[pts.length - 1].date}
                                </text>
                            )}
                        </>
                    )}
                </svg>
            </div>
        );
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading unit costs...</div>;

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, SKU, UPC..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden table-panel">
                <div className="overflow-x-auto table-fit">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variation</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UPC</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost (WAC)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-sm">
                                        No unit cost data found
                                    </td>
                                </tr>
                            ) : filtered.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{p.productName}</td>
                                    <td className="px-6 py-3 text-sm text-gray-600">{p.variationName || '-'}</td>
                                    <td className="px-6 py-3 text-sm text-gray-700">{p.sku || '-'}</td>
                                    <td className="px-6 py-3 text-sm text-gray-700">{p.upc || '-'}</td>
                                    <td className="px-6 py-3">
                                        <span
                                            className="text-sm font-semibold text-blue-700 cursor-pointer underline decoration-dotted hover:text-blue-900 transition"
                                            onClick={(e) => {
                                                if (selectedProduct?.id === p.id) {
                                                    setSelectedProduct(null);
                                                    setChartData([]);
                                                } else {
                                                    setSelectedProduct(p);
                                                    loadHistory(p.productId, p.variationId, e);
                                                }
                                            }}
                                            onMouseEnter={(e) => {
                                                clearTimeout(hoverTimeout.current);
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                hoverChartTimeout.current = setTimeout(() => {
                                                    setHoveredProduct(p);
                                                    setHoverPos({ x: rect.left, y: rect.top });
                                                    const params = p.variationId ? `?productId=${p.productId}&variationId=${p.variationId}` : `?productId=${p.productId}`;
                                                    api.get(`/unit-costs/history${params}`).then(res => {
                                                        if (res.success) {
                                                            const data = res.data?.data || res.data || [];
                                                            setHoverChartData(Array.isArray(data) ? data : []);
                                                        }
                                                    }).catch(() => setHoverChartData([]));
                                                }, 300);
                                            }}
                                            onMouseLeave={() => {
                                                clearTimeout(hoverChartTimeout.current);
                                                hoverTimeout.current = setTimeout(() => {
                                                    setHoveredProduct(null);
                                                    setHoverChartData([]);
                                                }, 200);
                                            }}
                                        >
                                            {formatCost(p.unitCost)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {selectedProduct && chartData.length > 0 && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99998] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                    <TrendingUp size={16} className="text-blue-500" />
                                    Unit Cost History
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {selectedProduct.productName}{selectedProduct.variationName ? ` — ${selectedProduct.variationName}` : ''}
                                </p>
                            </div>
                            <button
                                onClick={() => { setSelectedProduct(null); setChartData([]); }}
                                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700"
                            >✕</button>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-blue-50 rounded-lg p-3">
                                <p className="text-xs text-blue-600 mb-1">Current Cost</p>
                                <p className="text-sm font-bold text-blue-800">{formatCost(selectedProduct.unitCost)}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">Data Points</p>
                                <p className="text-sm font-bold text-gray-800">{chartData.length}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">SKU</p>
                                <p className="text-sm font-bold text-gray-800">{selectedProduct.sku || '-'}</p>
                            </div>
                        </div>
                        <MiniChart data={chartData} pos={{ x: 0, y: 0 }} isHover={false} onClose={() => { setSelectedProduct(null); setChartData([]); }} />
                        <div className="mt-4 border-t pt-3">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-gray-400">
                                        <th className="text-left pb-1">Date</th>
                                        <th className="text-right pb-1">Unit Cost</th>
                                        <th className="text-right pb-1">PO #</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {chartData.map((d, i) => (
                                        <tr key={i}>
                                            <td className="py-1 text-gray-600">{new Date(d.createdAt).toLocaleDateString()}</td>
                                            <td className="py-1 text-right font-medium text-gray-900">{formatCost(d.unitCost)}</td>
                                            <td className="py-1 text-right text-gray-500">{d.poControlNumber || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            {hoveredProduct && hoverChartData.length > 0 && (
                <MiniChart data={hoverChartData} pos={hoverPos} isHover={true} />
            )}
        </div>
    );
};

export default ProductUnitCostingTab;