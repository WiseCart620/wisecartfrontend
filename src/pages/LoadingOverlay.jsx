import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingOverlay = ({ message = 'Loading...', show }) => {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-lg font-semibold text-gray-900">{message}</p>
      </div>
    </div>
  );
};