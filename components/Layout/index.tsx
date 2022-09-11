import type { NextPage } from 'next';
import React from 'react';
import Navbar from 'components/Navbar';
import Footer from 'components/Footer';
import { BackTop } from '@arco-design/web-react';

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
      <BackTop visibleHeight={30} />
    </div>
  );
};

export default Layout;
