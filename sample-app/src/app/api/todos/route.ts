import { NextResponse } from 'next/server';

// Mock todo endpoint — keeps the sample app fully self-contained (no external calls)
export function GET() {
  return NextResponse.json({
    userId:    1,
    id:        1,
    title:     'Build something awesome with ReplayKit',
    completed: false,
  });
}
