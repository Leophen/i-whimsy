import { Avatar, Dropdown, Menu, Button, Message } from '@arco-design/web-react'
import { IconUser, IconPlus } from '@arco-design/web-react/icon'
import logo from '../assets/logo.svg'
import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { loginTest, logoutBlog } from '../http/api/user'
import { createBlog } from '../http/api/blog'
import BlogEdit from '../blogPages/BlogEdit'
import LoginModal from '../blogPages/components/LoginModal'
import { Radio } from '@arco-design/web-react'

const RadioGroup = Radio.Group;

export interface LoginReducer {
    status: boolean
    username: string
}

export const Header = () => {
    const loginStatus = useSelector<{
        loginReducer: LoginReducer
    }>((state) => state.loginReducer.status)
    const loginUsername = useSelector<{
        loginReducer: LoginReducer
    }>((state) => state.loginReducer.username)
    const navigate = useNavigate()
    const dispatch = useDispatch()

    useEffect(() => {
        loginTest().then((res) => {
            if (res.data.errno !== -1) {
                dispatch.loginReducer.login(res.data.data.username)
            }
        })
    }, [])

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

    const [currentPage, setCurrentPage] = useState('tool')
    const handleSwitchPage = (value: string) => {
        setCurrentPage(value)
        if (value === 'blog') {
            navigate(`/blog`)
        } else if (value === 'tool') {
            navigate(`/`)
        }
    }

    return (
        <header className="header">
            <div className="header-txt">
                <section className='header-logo-wrap' onClick={() => navigate(`/`)}>
                    <img className='header-logo-icon' src={logo} alt="iWhimsy" />
                    iWhimsy
                </section>

                <section className='header-switch'>
                    <RadioGroup
                        type='button'
                        size='large'
                        value={currentPage}
                        onChange={handleSwitchPage}
                    >
                        <Radio value='tool'>工具</Radio>
                        <Radio value='blog'>博客</Radio>
                    </RadioGroup>
                </section>

                <section className="header-user">
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
    )
}