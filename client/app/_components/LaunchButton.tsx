"use client";

import Link from 'next/link';

export default function LaunchButton() {
  return (
    <Link 
      href="/launch"
      className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-lg font-semibold"
    >
      Auctions
    </Link>
  );
} 