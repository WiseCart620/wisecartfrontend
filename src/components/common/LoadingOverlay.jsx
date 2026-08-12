import React, { useState, useEffect, useRef } from 'react';
import { Database } from 'lucide-react';

export const LoadingOverlay = ({ show, message = 'Loading...', progress }) => {
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const intervalRef = useRef(null);
  const isReal = typeof progress === 'number';

  useEffect(() => {
    if (isReal) return;

    if (show) {
      setSimulatedProgress(0);
      intervalRef.current = setInterval(() => {
        setSimulatedProgress((prev) => {
          if (prev >= 90) return prev;
          const increment = prev < 50 ? 8 : prev < 75 ? 4 : 1.5;
          return Math.min(prev + increment, 90);
        });
      }, 200);
    } else {
      setSimulatedProgress(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [show, isReal]);

  if (!show) return null;

  const displayProgress = isReal ? progress : simulatedProgress;

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            <Database size={22} className="absolute text-blue-600" />
          </div>

          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">{message}</p>
            <p className="text-sm text-gray-600 mt-1">
              Please wait, we're syncing a large volume of delivery data to ensure real-time accuracy.
            </p>
          </div>

          <div className="w-full">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-medium text-gray-500">
                {isReal ? 'Fetching data' : 'Processing'}
              </span>
              <span className="text-xs font-semibold text-blue-600">{Math.round(displayProgress)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;