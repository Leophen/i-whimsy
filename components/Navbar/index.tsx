import type { NextPage } from 'next';
import React, { useState } from 'react';
import styles from './index.module.scss';
import Link from 'next/link';
import { navs } from './config';
import { useRouter } from 'next/router';
import { Button } from '@arco-design/web-react';
import LoginModal from 'components/LoginModal';

const Navbar: NextPage = () => {
  const { pathname } = useRouter();

  const handleQuestion = () => {
    alert('提问');
  };

  const [loginVisible, setLoginVisible] = useState(false);

  const handleLogin = () => {
    setLoginVisible(true);
  };

  return (
    <div className={styles.navbar}>
      <div className={styles.navbarInner}>
        <div className={styles.logo}>iWhimsy</div>
        <div className={styles.itemWrapper}>
          {navs?.map((nav) => (
            <Link key={nav?.label} href={nav?.value}>
              <div
                className={
                  pathname === nav?.value
                    ? styles.navbarItemActive
                    : styles.navbarItem
                }
              >
                {nav?.label}
              </div>
            </Link>
          ))}
        </div>
        <div className={styles.navbarRight}>
          <Button shape="round" onClick={handleQuestion}>
            提问
          </Button>
          <Button shape="round" type="primary" onClick={handleLogin}>
            登录
          </Button>
        </div>
      </div>
      <LoginModal
        visible={loginVisible}
        onClose={() => setLoginVisible(false)}
      />
    </div>
  );
};

export default Navbar;
