import { Routes, Route, useLocation } from 'react-router-dom'
import { Avatar, Dropdown, Menu, Button, Message } from '@arco-design/web-react'
import { IconUser, IconPlus } from '@arco-design/web-react/icon'
import logo from '../public/logo.svg'
import BlogDetail from './pages/BlogDetail'
import BlogList from './pages/BlogList'
import ErrorPage from './pages/ErrorPage'
import './App.scss'
import LoginModal from './pages/components/LoginModal'
import { useState, useEffect } from 'react'
import BlogEdit from './pages/BlogEdit'
import { useDispatch, useSelector } from 'react-redux'
import { loginTest, logoutBlog } from '../src/http/api/user'
import { createBlog } from '../src/http/api/blog'
import { useNavigate } from 'react-router-dom'
import TermPage from './pages/TermPage'

export interface LoginReducer {
  status: boolean
  username: string
}

const App = () => {
  const loginStatus = useSelector<{
    loginReducer: LoginReducer
  }>((state) => state.loginReducer.status)
  const loginUsername = useSelector<{
    loginReducer: LoginReducer
  }>((state) => state.loginReducer.username)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const location = useLocation()

  useEffect(() => {
    loginTest().then((res) => {
      if (res.data.errno !== -1) {
        dispatch.loginReducer.login(res.data.data.username)
      }
    })
  }, [])

  const getPageName = () => {
    const { pathname } = location
    if (pathname.search('detail') !== -1) {
      return '博客详情'
    }
    return '博客列表'
  }

  const handleAddBlog = () => {
    setEditShow(true)
  }

  const handleLogout = (key: string) => {
    if (key === 'logout') {
      logoutBlog().then(() => {
        dispatch.loginReducer.logout()
        Message.success('已退出登录')
      })
    }
  }

  const [editShow, setEditShow] = useState(false)
  const [loginShow, setLoginShow] = useState(false)

  const handleAddSuccess = (values) => {
    const { title, content, tag } = values
    createBlog({
      title,
      content,
      tag: JSON.stringify(tag),
    })
      .then((res) => {
        const { errno } = res.data
        if (errno !== -1) {
          Message.success('创建博客成功')
          const createTime = new Date().getTime()
          setUpdateListVal(createTime)
          setEditShow(false)
          navigate(`/`)
        } else {
          Message.error('创建博客失败')
        }
      })
      .catch((err) => {
        console.error(err)
      })
  }
  const [updateListVal, setUpdateListVal] = useState(0)

  return (
    <div className="blog-wrapper">
      <header className="blog-header">
        <div className="blog-header-txt">
          <section className='blog-logo-wrap' onClick={() => navigate(`/`)}>
            <img className='blog-logo-icon' src={logo} alt="iWhimsy" />
            iWhimsy
          </section>
          <section className="blog-header-user">
            {loginStatus && (
              <>
                <Button shape="round" type="primary" icon={<IconPlus />} onClick={handleAddBlog}>
                  新建博客
                </Button>
                <BlogEdit mode="new" visible={editShow} onSuccess={handleAddSuccess} onClose={() => setEditShow(false)} />
              </>
            )}

            {loginStatus ? (
              <>
                <Dropdown
                  droplist={
                    <Menu onClickMenuItem={handleLogout}>
                      <Menu.Item key="logout">退出登录</Menu.Item>
                    </Menu>
                  }
                  trigger="click"
                  position="bottom"
                >
                  <Avatar size={28}>
                    <IconUser />
                  </Avatar>
                </Dropdown>
                <span className="login-username">{loginUsername as string}</span>
              </>
            ) : (
              <Button shape="round" type="primary" onClick={() => setLoginShow(true)}>
                登录
              </Button>
            )}
          </section>
          <LoginModal visible={loginShow} onClose={() => setLoginShow(false)} />
        </div>
      </header>
      <article className="blog-content">
        <Routes>
          <Route path="/" element={<BlogList key={updateListVal} />} />
          <Route path="detail/:blogId" element={<BlogDetail />} />
          <Route path="terms" element={<TermPage />} />
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </article>
    </div>
  )
}

export default App
