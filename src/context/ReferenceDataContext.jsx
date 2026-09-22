import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { api } from '../services/api';


const ReferenceDataContext = createContext(null);

export const ReferenceDataProvider = ({ children }) => {
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);

  const safeGet = async (url) => {
    try {
      return await api.get(url);
    } catch (err) {
      if (err?.response?.status !== 403) {
        console.error(`Failed to load ${url}`, err);
      }
      return { success: false, data: [] };
    }
  };

  const loadReferenceData = useCallback(async (force = false) => {
    if (hasFetched.current && !force) return;
    hasFetched.current = true;
    try {
      setLoading(true);
      const [branchesRes, productsRes, warehousesRes, companiesRes] = await Promise.all([
        safeGet('/branches/list'),
        safeGet('/products'),
        safeGet('/warehouse'),
        safeGet('/companies'),
      ]);
      if (branchesRes.success) {
        const normalizedBranches = (branchesRes.data || []).map(b => ({
          ...b,
          branchName: b.branchName ?? b.name,
          branchCode: b.branchCode ?? b.code,
        }));
        setBranches(normalizedBranches);
      }
      if (productsRes.success) setProducts(productsRes.data || []);
      if (warehousesRes.success) setWarehouses(warehousesRes.data || []);
      if (companiesRes.success) setCompanies(companiesRes.data || []);
    } finally {
      setLoading(false);
    }
  }, []);


  const refreshReferenceData = useCallback(() => loadReferenceData(true), [loadReferenceData]);
  const ensureReferenceData = useCallback(() => loadReferenceData(false), [loadReferenceData]);

  return (
    <ReferenceDataContext.Provider value={{
      branches,
      products,
      warehouses,
      companies,
      loading,
      refreshReferenceData,
      ensureReferenceData
    }}>
      {children}
    </ReferenceDataContext.Provider>
  );
};

export const useReferenceData = () => {
  const ctx = useContext(ReferenceDataContext);
  if (!ctx) throw new Error('useReferenceData must be used within a ReferenceDataProvider');
  return ctx;
};