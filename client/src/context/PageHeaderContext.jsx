import React, { createContext, useContext, useState } from 'react';

const PageHeaderContext = createContext({
  headerInfo: null,
  setHeaderInfo: () => {},
});

export const PageHeaderProvider = ({ children }) => {
  const [headerInfo, setHeaderInfo] = useState(null);

  return (
    <PageHeaderContext.Provider value={{ headerInfo, setHeaderInfo }}>
      {children}
    </PageHeaderContext.Provider>
  );
};

export const usePageHeader = () => useContext(PageHeaderContext);
