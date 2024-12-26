import { Input } from '@arco-design/web-react'
import { Button } from '@arco-design/web-react'
import { Message } from '@arco-design/web-react'
import { Tabs, Modal } from '@arco-design/web-react'
import { useFormik } from 'formik'
import _ from 'lodash'
import * as Yup from 'yup'
import { loginBlog, registerBlog } from '../../http/api/user'
import { useDispatch } from 'react-redux'
import { useEffect } from 'react'
import { Checkbox } from '@arco-design/web-react'
import { useState } from 'react'
import { IconUser } from '@arco-design/web-react/icon'

const TabPane = Tabs.TabPane

interface LoginModal {
  visible: boolean
  onClose: () => void
}

interface InnerPageType {
  visible: boolean
  type: 'login' | 'register'
  onClose: () => void
}

const InnerPage = (props: InnerPageType) => {
  const { visible = false, type = 'login', onClose } = props

  const dispatch = useDispatch()

  const formik = useFormik({
    initialValues: {
      username: '',
      password: '',
    },
    validationSchema: Yup.object({
      username: Yup.string().max(10, '用户名不得超过10个字符').required('请输入用户名'),
      password: Yup.string().max(25, '密码不得超过20个字符').required('请输入密码'),
    }),
    onSubmit: (values) => {
      const { username, password } = values
      if (type === 'login') {
        loginBlog({
          username,
          password,
        })
          .then((res) => {
            const { errno } = res.data
            if (errno !== -1) {
              Message.success('登录成功')
              dispatch.loginReducer.login(res.data.data.username)
              onClose?.()
            } else {
              Message.error('账号或密码错误')
            }
          })
          .catch((err) => {
            console.error(err)
          })
      } else {
        registerBlog({
          username,
          password,
        })
          .then((res) => {
            const { errno } = res.data
            if (errno !== -1) {
              Message.success('注册成功')
              onClose?.()
            } else {
              Message.error(res.data.message || '注册失败')
            }
          })
          .catch((err) => {
            console.error(err)
          })
      }
    },
  })

  useEffect(() => {
    if (visible) {
      setFieldValue('username', '')
      setFieldValue('password', '')
    }
  }, [visible])

  const { values, setFieldValue, errors, handleSubmit } = formik

  const handleLogin = () => {
    if (!_.isEmpty(errors)) {
      Message.error(errors?.username || errors?.password)
    } else {
      handleSubmit()
    }
  }

  const [agreeTerms, setAgreeTerms] = useState(false);
  const handleToTerms = () => {
    window.open('/terms');
    onClose?.();
  };

  return (
    <section className="login-page">
      <Input
        prefix={<IconUser />}
        value={values.username}
        maxLength={10}
        showWordLimit={false}
        placeholder="请输入用户名"
        onChange={(val: string) => setFieldValue('username', val)}
      />
      <Input.Password value={values.password} maxLength={25} showWordLimit={false} placeholder="请输入密码" onChange={(val: string) => setFieldValue('password', val)} />
      <div className="check-terms-wrap">
        <Checkbox
          checked={agreeTerms}
          onChange={(checked) => setAgreeTerms(checked)}
        ></Checkbox>
        <div className='check-txt'>
          已阅读并同意
          <span className='check-terms' onClick={handleToTerms}>
            用户协议
          </span>
        </div>
      </div>
      <Button disabled={!agreeTerms} type="primary" onClick={handleLogin}>
        {type === 'login' ? '登录' : '注册'}
      </Button>
    </section>
  )
}

const LoginModal = (props: LoginModal) => {
  const { visible = false, onClose } = props

  return (
    <Modal title={null} footer={null} visible={visible} className="login-modal" onCancel={() => onClose?.()}>
      <Tabs defaultActiveTab="login">
        <TabPane key="login" title="登录">
          <InnerPage visible={visible} type="login" onClose={() => onClose?.()} />
        </TabPane>
        <TabPane key="register" title="注册">
          <InnerPage visible={visible} type="register" onClose={() => onClose?.()} />
        </TabPane>
      </Tabs>
    </Modal>
  )
}

export default LoginModal
