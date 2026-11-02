'use client';
import { useSocketConnected } from '@/lib/useGame';

export function ConnectionBanner() {
  const connected = useSocketConnected();
  if (connected) return null;
  return (
    <div className="bg-rose-600 text-white text-sm font-semibold text-center py-2 px-4 rounded-lg mb-4">
      Mất kết nối, đang tự kết nối lại...
    </div>
  );
}
