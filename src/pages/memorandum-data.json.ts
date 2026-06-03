import type { APIRoute } from 'astro';
import { loadMemorandumData } from '../lib/memorandumContent';

export const GET: APIRoute = async () => {
  const data = await loadMemorandumData();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
};
