import React from 'react';

const Loader = ({ size = 'md', message = '', fullscreen = false, type = 'spinner' }) => {
  // Size classes
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const sizeTextClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  // Pharmacy-themed pulse loader
  const PulseLoader = () => (
    <div className="flex space-x-2 justify-center items-center">
      <div className={`rounded-full bg-green-500 ${sizeClasses[size]} animate-bounce`} style={{ animationDelay: '0ms' }}></div>
      <div className={`rounded-full bg-green-500 ${sizeClasses[size]} animate-bounce`} style={{ animationDelay: '150ms' }}></div>
      <div className={`rounded-full bg-green-500 ${sizeClasses[size]} animate-bounce`} style={{ animationDelay: '300ms' }}></div>
    </div>
  );

  // Spinner loader
  const SpinnerLoader = () => (
    <div className={`${sizeClasses[size]} border-4 border-gray-200 border-t-green-500 rounded-full animate-spin`}></div>
  );

  // Pharmacy cross loader
  const CrossLoader = () => (
    <div className="relative">
      <div className={`${sizeClasses[size]} border-4 border-green-500 rounded-lg animate-pulse flex items-center justify-center`}>
        <div className="absolute w-1/2 h-1 bg-green-500 rotate-45"></div>
        <div className="absolute w-1/2 h-1 bg-green-500 -rotate-45"></div>
      </div>
    </div>
  );

  // Wave loader
  const WaveLoader = () => (
    <div className="flex space-x-1">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`w-2 bg-green-500 rounded-full ${sizeClasses[size]}`}
          style={{ 
            animation: 'wave 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`
          }}
        ></div>
      ))}
    </div>
  );

  const renderLoader = () => {
    switch (type) {
      case 'pulse':
        return <PulseLoader />;
      case 'cross':
        return <CrossLoader />;
      case 'wave':
        return <WaveLoader />;
      default:
        return <SpinnerLoader />;
    }
  };

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
        {renderLoader()}
        {message && (
          <p className={`mt-4 text-gray-700 font-medium text-center px-4 ${sizeTextClasses[size]}`}>
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-4">
      {renderLoader()}
      {message && (
        <p className={`mt-3 text-gray-600 ${sizeTextClasses[size]} text-center`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default Loader;