import React from 'react';

export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export const ChartCardSkeleton = ({ height = 'h-[280px] sm:h-[350px]' }) => (
  <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
    <Skeleton className="h-5 w-1/3 mb-2" />
    <Skeleton className="h-3 w-1/2 mb-6" />
    <Skeleton className={`w-full ${height}`} />
  </div>
);

export const ProductAnalysisSkeleton = () => (
  <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-4 space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-8 w-full" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="lg:col-span-8 space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[250px] w-full" />
      </div>
    </div>
  </div>
);