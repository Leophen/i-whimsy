/* eslint-disable react/no-unknown-property */
import {
  Button,
  Checkbox,
  Input,
  Message,
  Modal,
  Tabs,
} from '@arco-design/web-react';
import { IconUser } from '@arco-design/web-react/icon';
import type { NextPage } from 'next';
import styles from './index.module.scss';
import { ChangeEvent, useState } from 'react';
import request from 'service/fetch';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
}

interface LoginOtherProps {
  checked: boolean;
}

const LoginOther: NextPage<LoginOtherProps> = (props) => {
  const { checked } = props;

  const loginByGithub = () => {
    if (!checked) {
      return;
    }
    alert('by github');
  };

  return (
    <section className={styles.loginOther}>
      <div className={styles.loginOtherTxt}>
        {!checked ? `请阅读并勾选上述协议条款` : `可选择其它登录方式`}
      </div>
      <div className={styles.loginOtherWrapper}>
        <div
          className={
            checked ? styles.loginOtherItem : styles.loginOtherItemDisabled
          }
          onClick={loginByGithub}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4ZM0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24Z"
              fill="currentColor"
            ></path>
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M19.183 45.4715C18.9896 45.2218 18.9896 42.9972 19.183 38.798C17.1112 38.8695 15.8022 38.7257 15.256 38.3666C14.4368 37.8279 13.6166 36.1666 12.8889 34.9958C12.1612 33.825 10.546 33.6399 9.8938 33.3782C9.24158 33.1164 9.07785 32.0495 11.691 32.8564C14.3042 33.6633 14.4316 35.8606 15.256 36.3744C16.0804 36.8882 18.0512 36.6634 18.9446 36.2518C19.8379 35.8402 19.7722 34.3077 19.9315 33.7006C20.1329 33.1339 19.423 33.0082 19.4074 33.0036C18.5353 33.0036 13.9537 32.0072 12.6952 27.5705C11.4368 23.1339 13.0579 20.234 13.9227 18.9874C14.4992 18.1563 14.4482 16.3851 13.7697 13.6736C16.2333 13.3588 18.1344 14.1342 19.4732 16C19.4745 16.0107 21.2283 14.9571 24 14.9571C26.7718 14.9571 27.7551 15.8153 28.514 16C29.2728 16.1847 29.8798 12.734 34.5666 13.6736C33.5881 15.5968 32.7686 18 33.3941 18.9874C34.0195 19.9748 36.4742 23.1146 34.9664 27.5705C33.9611 30.5412 31.9851 32.3522 29.0382 33.0036C28.7002 33.1114 28.5313 33.2854 28.5313 33.5254C28.5313 33.8855 28.9881 33.9248 29.6463 35.6116C30.085 36.7361 30.1167 39.9479 29.7413 45.2469C28.7904 45.489 28.0506 45.6515 27.5219 45.7346C26.5845 45.8819 25.5667 45.9645 24.5666 45.9964C23.5666 46.0283 23.2193 46.0247 21.8368 45.896C20.9151 45.8102 20.0305 45.6687 19.183 45.4715Z"
              fill="currentColor"
            ></path>
          </svg>
        </div>
      </div>
    </section>
  );
};

const usualReg = /^\w+$/;

const LoginModal: NextPage<LoginModalProps> = (props) => {
  const { visible = false, onClose } = props;

  const [form, setForm] = useState({
    account: '',
    accountNull: false,
    accountLess4: false,
    accountGreater16: false,
    accountIllegal: false,

    password: '',
    passwordNull: false,
    passwordLess6: false,
    passwordGreater18: false,
    passwordIllegal: false,

    confirmPassword: '',
    confirmPasswordError: false,
  });

  const handleChangeAccount = (val: string) => {
    form.account = val;
    val !== '' ? (form.accountNull = false) : (form.accountNull = true);
    if (mode === 'register') {
      val.length >= 4
        ? (form.accountLess4 = false)
        : (form.accountLess4 = true);
      val.length <= 16
        ? (form.accountGreater16 = false)
        : (form.accountGreater16 = true);
      usualReg.test(val)
        ? (form.accountIllegal = false)
        : (form.accountIllegal = true);
    }
    setForm({ ...form });
  };
  const handleBlurAccount = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      form.accountNull = true;
    }
    if (mode === 'register') {
      val.length < 4 && (form.accountLess4 = true);
      val.length > 16 && (form.accountGreater16 = true);
      !usualReg.test(val) && (form.accountIllegal = true);
    }
    setForm({ ...form });
  };
  const accountPass = () => {
    return !(
      form.accountNull ||
      form.accountLess4 ||
      form.accountGreater16 ||
      form.accountIllegal
    );
  };

  const handleChangePassword = (val: string) => {
    form.password = val;
    val !== '' && (form.passwordNull = false);
    if (mode === 'register') {
      val.length >= 6
        ? (form.passwordLess6 = false)
        : (form.passwordLess6 = true);
      val.length <= 18
        ? (form.passwordGreater18 = false)
        : (form.passwordGreater18 = true);
      usualReg.test(val)
        ? (form.passwordIllegal = false)
        : (form.passwordIllegal = true);
    }
    setForm({ ...form });
  };
  const handleBlurPassword = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      form.passwordNull = true;
    }
    if (mode === 'register') {
      val.length < 6 && (form.passwordLess6 = true);
      val.length > 18 && (form.passwordGreater18 = true);
      !usualReg.test(val) && (form.passwordIllegal = true);
    }
    setForm({ ...form });
  };
  const passwordPass = () => {
    return !(
      form.passwordNull ||
      form.passwordLess6 ||
      form.passwordGreater18 ||
      form.passwordIllegal
    );
  };

  const handleChangeConfirmPassword = (val: string) => {
    form.confirmPassword = val;
    val === form.password
      ? (form.confirmPasswordError = false)
      : (form.confirmPasswordError = true);
    setForm({ ...form });
  };
  const handleBlurConfirmPassword = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val !== form.password) {
      form.confirmPasswordError = true;
      setForm({ ...form });
    }
  };

  const [agreeTerms, setAgreeTerms] = useState(false);

  const resetData = () => {
    form.account = '';
    form.accountNull = false;
    form.accountLess4 = false;
    form.accountGreater16 = false;
    form.accountIllegal = false;

    form.password = '';
    form.passwordNull = false;
    form.passwordLess6 = false;
    form.passwordGreater18 = false;
    form.passwordIllegal = false;

    form.confirmPassword = '';
    form.confirmPasswordError = false;
    setForm({ ...form });
    setAgreeTerms(false);
  };
  const closeModal = () => {
    setMode('login');
    resetData();
    onClose?.();
  };

  const handleToTerms = () => {
    window.open('/terms');
    closeModal();
  };

  const curRegTxt = () => {
    if (form.accountNull) {
      return <span className={styles.regErrorTxt}>账号不能为空</span>;
    } else if (form.accountLess4) {
      return <span className={styles.regErrorTxt}>账号不能少于4位</span>;
    } else if (form.accountGreater16) {
      return <span className={styles.regErrorTxt}>账号不能多于16位</span>;
    } else if (form.accountIllegal) {
      return (
        <span className={styles.regErrorTxt}>
          账号只能由字母、数字、下划线组成
        </span>
      );
    } else if (form.passwordNull) {
      return <span className={styles.regErrorTxt}>密码不能为空</span>;
    } else if (form.passwordLess6) {
      return <span className={styles.regErrorTxt}>密码不能少于6位</span>;
    } else if (form.passwordGreater18) {
      return <span className={styles.regErrorTxt}>密码不能多于18位</span>;
    } else if (form.passwordIllegal) {
      return (
        <span className={styles.regErrorTxt}>
          密码只能由字母、数字、下划线组成
        </span>
      );
    } else if (form.confirmPasswordError) {
      return <span className={styles.regErrorTxt}>两次密码输入不一致</span>;
    } else {
      return '';
    }
  };

  const handleSubmit = () => {
    if (mode === 'login') {
      request
        .post('/api/user/login', {
          account: form.account,
          password: form.password,
        })
        .then((res: any) => {
          if (res?.status === 0) {
            Message.error(res?.msg || '未知错误');
          } else {
            Message.success('登录成功');
            onClose?.();
          }
        });
    } else {
      request
        .post('/api/user/register', {
          account: form.account,
          password: form.password,
        })
        .then((res: any) => {
          if (res?.status === 0) {
            Message.error(res?.msg || '未知错误');
          } else {
            Message.success('注册成功');
            onClose?.();
          }
        });
    }
  };

  const [mode, setMode] = useState('login');
  const handleSwitchTabs = (val: string) => {
    setMode(val);
    resetData();
  };

  return (
    <Modal
      className={styles.loginModal}
      title={
        <Tabs activeTab={mode} onChange={handleSwitchTabs}>
          <Tabs.TabPane key="login" title="登录"></Tabs.TabPane>
          <Tabs.TabPane key="register" title="注册"></Tabs.TabPane>
        </Tabs>
      }
      visible={visible}
      footer={null}
      onCancel={closeModal}
    >
      <div className={styles.loginContent}>
        <Input
          placeholder="账号"
          prefix={<IconUser />}
          value={form.account}
          error={!accountPass()}
          onChange={handleChangeAccount}
          onBlur={handleBlurAccount}
        />
        <Input.Password
          placeholder="密码"
          value={form.password}
          error={!passwordPass()}
          onChange={handleChangePassword}
          onBlur={handleBlurPassword}
        />
        {mode === 'register' && (
          <Input.Password
            placeholder="确认密码"
            value={form.confirmPassword}
            error={form.confirmPasswordError}
            onChange={handleChangeConfirmPassword}
            onBlur={handleBlurConfirmPassword}
          />
        )}
        <div className={styles.regTxt}>{curRegTxt()}</div>
        <Checkbox
          checked={agreeTerms}
          onChange={(checked) => setAgreeTerms(checked)}
        ></Checkbox>
        <div className={styles.checkTxt}>
          已阅读并同意
          <span className={styles.checkTerms} onClick={handleToTerms}>
            用户协议
          </span>
        </div>

        <footer className={styles.submitFooter}>
          <Button
            disabled={
              !accountPass() ||
              !passwordPass() ||
              form.confirmPasswordError ||
              !agreeTerms
            }
            type="primary"
            onClick={handleSubmit}
          >
            {mode === 'login' ? '登录' : '注册'}
          </Button>
        </footer>

        <LoginOther checked={agreeTerms} />
      </div>
    </Modal>
  );
};

export default LoginModal;
