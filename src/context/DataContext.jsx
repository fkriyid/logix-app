import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadBaseData, getMergedData, createShipment, updateShipment, deleteShipment, resetOverrides } from '../services/dataService';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [baseData, setBaseData] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBaseData()
      .then(base => {
        setBaseData(base);
        setData(getMergedData(base));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load data');
        setLoading(false);
      });
  }, []);

  const addShipment = useCallback((record) => {
    const newData = createShipment(baseData, record);
    setData(newData);
  }, [baseData]);

  const editShipment = useCallback((shipment_id, changes) => {
    const newData = updateShipment(baseData, shipment_id, changes);
    setData(newData);
  }, [baseData]);

  const removeShipment = useCallback((shipment_id) => {
    const newData = deleteShipment(baseData, shipment_id);
    setData(newData);
  }, [baseData]);

  const resetData = useCallback(() => {
    resetOverrides();
    setData(getMergedData(baseData));
  }, [baseData]);

  return (
    <DataContext.Provider value={{ data, baseData, loading, error, addShipment, editShipment, removeShipment, resetData }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
