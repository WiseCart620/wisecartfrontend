import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles } from 'lucide-react';

const Welcome = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-orange-100 flex items-center justify-center">
          <Sparkles className="text-[#F97316]" size={28} />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Welcome{user?.fullName ? `, ${user.fullName}` : ''}!
        </h1>
        <p className="text-gray-500 text-[15px]">
          Use the menu to get to Sales, Deliveries, or any other section you have access to.
        </p>
      </div>
    </div>
  );
};

export default Welcome;