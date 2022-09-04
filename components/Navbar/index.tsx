import type { NextPage } from 'next';
import React from 'react';
import styles from './index.module.scss';
import Link from 'next/link';
import { navs } from './config';
import { useRouter } from 'next/router';

const Navbar: NextPage = () => {
  const { pathname } = useRouter();

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
        <div className={styles.navbarRight}>right</div>
      </div>
    </div>
  );
};

export default Navbar;
