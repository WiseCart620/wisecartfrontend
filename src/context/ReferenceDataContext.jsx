// src/context/ReferenceDataContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const ReferenceDataContext = createContext(null);

export const ReferenceDataProvider = ({ children }) => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);

  const loadReferenceData = useCallback(async (force = false) => {
    if (hasFetched.current && !force) return;
    hasFetched.current = true;
    try {
      setLoading(true);
      const [branchesRes, productsRes, warehousesRes, companiesRes] = await Promise.all([
        api.get('/branches'),
        api.get('/products'),
        api.get('/warehouse'),
        api.get('/companies')
      ]);
      if (branchesRes.success) setBranches(branchesRes.data || []);
      if (productsRes.success) setProducts(productsRes.data || []);
      if (warehousesRes.success) setWarehouses(warehousesRes.data || []);
      if (companiesRes.success) setCompanies(companiesRes.data || []);
    } catch (err) {
      console.error('Failed to load reference data', err);
      hasFetched.current = false; // allow retry on next mount/call
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadReferenceData();
    }
  }, [user, loadReferenceData]);

  const refreshReferenceData = useCallback(() => loadReferenceData(true), [loadReferenceData]);

  return (
    <ReferenceDataContext.Provider value={{
      branches,
      products,
      warehouses,
      companies,
      loading,
      refreshReferenceData
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