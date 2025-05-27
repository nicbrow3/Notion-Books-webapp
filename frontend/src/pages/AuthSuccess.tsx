import React from 'react';

const AuthSuccess: React.FC = () => {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold text-green-600 mb-4">
        Authentication Successful!
      </h1>
      <p className="text-gray-600">
        You have successfully connected your Notion account.
      </p>
    </div>
  );
};

export default AuthSuccess; 