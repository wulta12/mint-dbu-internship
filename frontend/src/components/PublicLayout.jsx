import React from 'react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';

// Wraps public pages with the shared header + footer so every public page has
// a consistent top bar, language switcher, navigation and footer.
const PublicLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-mint-light font-sans flex flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
};

export default PublicLayout;