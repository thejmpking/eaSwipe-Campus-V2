
import { UserRole } from '../types';

/**
 * Institutional Data Service (Supabase & Bridge Edition)
 * Enhanced with action-based routing for restricted environments.
 */

const getSupabaseConfig = () => {
  const url = (localStorage.getItem('SUPABASE_URL') || '').trim().replace(/^["']|["']$/g, '');
  const key = (localStorage.getItem('SUPABASE_KEY') || '').trim().replace(/^["']|["']$/g, '');
  return { url, key };
};

const getHeaders = (key: string) => ({
  'Content-Type': 'application/json',
  'apikey': key,
  'Authorization': `Bearer ${key}`
});

// Helper: Convert camelCase to snake_case for DB writes
const toSnake = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnake);
  
  return Object.keys(obj).reduce((acc: any, key) => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    const value = obj[key];
    
    if (value === null) {
      acc[snakeKey] = null;
    } else if (Array.isArray(value)) {
      acc[snakeKey] = value.map(toSnake);
    } else if (typeof value === 'object') {
      acc[snakeKey] = toSnake(value);
    } else {
      acc[snakeKey] = value;
    }
    
    return acc;
  }, {});
};

// Helper: Convert snake_case to camelCase for DB reads
const toCamel = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  
  return Object.keys(obj).reduce((acc: any, key) => {
    const camelKey = key.replace(/([-_][a-z])/g, group =>
      group.toUpperCase().replace('-', '').replace('_', '')
    );
    acc[camelKey] = typeof obj[key] === 'object' ? toCamel(obj[key]) : obj[key];
    return acc;
  }, {});
};

export const dataService = {
  syncRecord: async (table: string, data: any) => {
    const { url, key } = getSupabaseConfig();
    if (!url || !key) return { status: 'success' }; 

    try {
      const dbReadyData = toSnake(data);
      const hasId = Array.isArray(dbReadyData) 
        ? dbReadyData.every(item => item.id !== undefined) 
        : dbReadyData.id !== undefined;

      const endpoint = hasId 
        ? `${url}/rest/v1/${table}?on_conflict=id` 
        : `${url}/rest/v1/${table}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...getHeaders(key),
          'Prefer': hasId ? 'resolution=merge-duplicates' : 'return=minimal'
        },
        body: JSON.stringify(dbReadyData)
      });
      
      if (!response.ok) {
        const errText = await response.text();
        console.error(`DB Write Error [${table}]:`, errText);
        throw new Error(`Supabase Sync Failed: ${errText}`);
      }
      return { status: 'success' };
    } catch (error) {
      console.error(`Supabase Sync Error [${table}]:`, error);
      return { status: 'error' };
    }
  },

  deleteRecord: async (table: string, id: string | number) => {
    const { url, key } = getSupabaseConfig();
    if (!url || !key) {
        console.warn("Local Simulation: Skipping actual DB delete.");
        return { status: 'success' }; 
    }

    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const stringId = String(id);

    try {
      console.log(`DELETING: ${table} WHERE id = ${stringId}`);
      // 1. Attempt Standard PostgREST DELETE
      const response = await fetch(`${cleanUrl}/rest/v1/${table}?id=eq.${stringId}`, {
        method: 'DELETE',
        headers: {
          ...getHeaders(key),
          'Prefer': 'return=minimal' // Recommended for Supabase DELETE
        }
      });
      
      if (response.ok || response.status === 204) {
          console.log("Delete Handshake Successful.");
          return { status: 'success' };
      }

      // If the response is not ok, read the error body
      const errorDetail = await response.text();
      console.warn("REST Verb rejected:", response.status, errorDetail);

      // 2. Fallback: Action-based deletion via bridge.php
      console.warn("Attempting Bridge Fallback...");
      const fallbackRes = await fetch(`${cleanUrl}/bridge.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'DELETE_RECORD', 
          table, 
          id: stringId 
        })
      });
      
      if (fallbackRes.ok) return { status: 'success' };
      
      const errText = await fallbackRes.text();
      console.error("Critical Deletion Failure:", errText);
      return { status: 'error' };
    } catch (error) {
      console.error("Network Exception during delete:", error);
      return { status: 'error' };
    }
  },

  getRecords: async (table: string) => {
    const { url, key } = getSupabaseConfig();
    if (!url || !key) return [];
    try {
      const response = await fetch(`${url}/rest/v1/${table}?select=*`, {
        headers: getHeaders(key)
      });
      const data = await response.json();
      return toCamel(data);
    } catch (error) { 
      return []; 
    }
  },

  getUsers: async () => dataService.getRecords('users'),
  getCampuses: async () => dataService.getRecords('campuses'),
  getClusters: async () => dataService.getRecords('clusters'),
  getSchools: async () => dataService.getRecords('schools'),

  verifyLogin: async (id: string, pin: string) => {
    const { url, key } = getSupabaseConfig();
    if (!url || !key) return null;
    try {
      const response = await fetch(`${url}/rest/v1/users?id=eq.${id}&password=eq.${pin}&select=*`, {
        headers: getHeaders(key)
      });
      const users = await response.json();
      if (users && users.length > 0) {
        const user = toCamel(users[0]);
        fetch(`${url}/rest/v1/users?id=eq.${id}`, {
          method: 'PATCH',
          headers: { ...getHeaders(key), 'Content-Type': 'application/json' },
          body: JSON.stringify({ last_active: new Date().toISOString() })
        });
        return user;
      }
      return null;
    } catch (error) {
      console.error("Auth Failed", error);
      return null;
    }
  }
};
