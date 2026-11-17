export const ONE_UNUSU_URL = import.meta.env.VITE_ONE_UNUSU_URL || (import.meta.env.DEV ? 'http://localhost:5173' : '');
if (!ONE_UNUSU_URL) throw new Error('Missing required VITE_ONE_UNUSU_URL configuration.');
if (!/^https?:$/.test(new URL(ONE_UNUSU_URL).protocol)) throw new Error('VITE_ONE_UNUSU_URL must use HTTP(S).');
