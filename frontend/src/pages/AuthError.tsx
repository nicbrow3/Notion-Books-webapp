import React from 'react';

const AuthError: React.FC = () => {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold text-red-600 mb-4">
        Authentication Failed
      </h1>
      <p className="text-gray-600">
        There was an error connecting your Notion account. Please try again.
      </p>
    </div>
  );
};

export default AuthError; 