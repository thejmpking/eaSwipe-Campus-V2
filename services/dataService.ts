
import { UserRole } from '../types';

/**
 * Institutional Data Service (Supabase SQL Edition)
 * Pure PostgREST implementation for Sovereign Ledger Access.
 */

const getConfig = () => {
  const rawUrl = (localStorage.getItem('SUPABASE_URL') || '').trim();
  // Remove wrapping quotes and trailing slashes
  const url = rawUrl.replace(/^["']|["']$/g, '').replace(/\/+$/, "");
  
  const rawKey = (localStorage.getItem('SUPABASE_KEY') || '').trim();
  // Ensure the key is clean: remove quotes, remove "Bearer " if present, and trim whitespace
  const key = rawKey
    .replace(/^["']|["']$/g, '')      
    .replace(/^Bearer\s+/i, '')
    .trim();      
    
  return { url, key };
};

const getHeaders = (key: string, extraHeaders: Record<string, string> = {}) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  if (key) {
    // Supabase PostgREST requires both 'apikey' and 'Authorization'
    headers['apikey'] = key;
    headers['Authorization'] = `Bearer ${key}`;
  }
  return headers;
};

const toSnake = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnake);
  return Object.keys(obj).reduce((acc: any, key) => {
    const hasUpperCase = /[A-Z]/.test(key);
    const snakeKey = hasUpperCase 
      ? key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
      : key;
    
    // Safety check: Don't overwrite if the snake_case version already exists and the camelCase version is just a duplicate
    if (acc[snakeKey] !== undefined && hasUpperCase) {
       // if we have both 'isRead' and 'is_read', and we're processing 'isRead', 
       // only update if the new value is truthy (or different)
       acc[snakeKey] = obj[key];
    } else {
       acc[snakeKey] = typeof obj[key] === 'object' ? toSnake(obj[key]) : obj[key];
    }
    return acc;
  }, {});
};

const toCamel = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  return Object.keys(obj).reduce((acc: any, key) => {
    const camelKey = key.replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', '').replace('_', ''));
    acc[camelKey] = typeof obj[key] === 'object' ? toCamel(obj[key]) : obj[key];
    return acc;
  }, {});
};

export const dataService = {
  syncRecord: async (table: string, data: any) => {
    const { url, key } = getConfig();
    if (!url) return { status: 'error', message: 'Network Identity Node (URL) is missing.' };

    try {
      const dbReadyData = toSnake(data);
      const endpoint = `${url}/rest/v1/${table}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: getHeaders(key, { 
          'Prefer': 'resolution=merge-duplicates,return=representation' 
        }),
        body: JSON.stringify(dbReadyData)
      });
      
      if (!response.ok) {
        const rawErr = await response.text();
        let errorMessage = rawErr;
        try {
          const jsonErr = JSON.parse(rawErr);
          if (jsonErr.code === '42P01') errorMessage = `The table "${table}" does not exist in the SQL schema. Please run the SQL blueprint first.`;
          else errorMessage = jsonErr.message || jsonErr.error_description || jsonErr.code || rawErr;
        } catch (e) {}
        return { status: 'error', message: errorMessage };
      }

      const text = await response.text();
      const result = text ? JSON.parse(text) : {};
      return { status: 'success', data: toCamel(result) };
    } catch (error: any) {
      console.error("Network Error during Sync", error);
      return { status: 'error', message: error.message || 'Node connection refused.' };
    }
  },

  deleteRecord: async (table: string, id: string | number): Promise<{ status: 'success' | 'error', message?: string }> => {
    const { url, key } = getConfig();
    if (!url) return { status: 'error', message: 'Registry Node URL missing.' };
    
    const safeId = String(id).trim();
    const endpoint = `${url}/rest/v1/${table}?id=eq.${encodeURIComponent(safeId)}`;

    try {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: getHeaders(key, {
          'Prefer': 'return=representation'
        })
      });
      
      if (!response.ok) {
        const rawErr = await response.text();
        let msg = rawErr;
        try { 
          const json = JSON.parse(rawErr);
          msg = json.message || json.error_description || rawErr;
        } catch(e) {}
        return { status: 'error', message: msg || 'Decommissioning handshake refused.' };
      }

      return { status: 'success' };
    } catch (error: any) {
      return { status: 'error', message: error.message || 'Registry Node connection timed out.' };
    }
  },

  getRecords: async (table: string) => {
    const { url, key } = getConfig();
    if (!url || !key) return [];
    try {
      const endpoint = `${url}/rest/v1/${table}?select=*`;
      const response = await fetch(endpoint, { 
        headers: getHeaders(key) 
      });
      if (!response.ok) return [];
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
    const { url, key } = getConfig();
    if (!url || !key) return null;
    try {
      const query = new URLSearchParams({
        id: `eq.${id}`,
        password: `eq.${pin}`,
        select: '*'
      }).toString();

      const endpoint = `${url}/rest/v1/users?${query}`;
      const response = await fetch(endpoint, { headers: getHeaders(key) });
      
      const users = await response.json();
      if (users && users.length > 0) {
        const user = toCamel(users[0]);
        // Update heartbeat
        fetch(`${url}/rest/v1/users?id=eq.${id}`, {
          method: 'PATCH', 
          headers: getHeaders(key, { 'Prefer': 'return=minimal' }),
          body: JSON.stringify({ last_active: new Date().toISOString() })
        });
        return user;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
};
