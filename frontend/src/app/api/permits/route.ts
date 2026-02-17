
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // In production, this will call the backend API
    // During development, we'll proxy to the backend
    // Use same domain for API
    const backendUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const response = await fetch(`${backendUrl}/api/permits`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {

      return new Response(
        JSON.stringify({ error: 'Failed to fetch permits' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in permits API route:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}