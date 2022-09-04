import type { NextPage } from 'next';
import React from 'react';
import Navbar from 'components/Navbar';
import Footer from 'components/Footer';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: NextPage<LayoutProps> = (props) => {
  const { children } = props;

  return (
    <div>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
