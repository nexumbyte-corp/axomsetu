import React from 'react';
import { Spinner } from './Spinner.jsx';

export const PageLoader = ({ label = 'Loading page...' }) => {
  return (
    <div className="min-h-[400px] w-full flex items-center justify-center p-8">
      <Spinner size="lg" label={label} />
    </div>
  );
};

export default PageLoader;
