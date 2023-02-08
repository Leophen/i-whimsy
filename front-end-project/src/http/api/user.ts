import serviceAxios from '../index'

export const registerBlog = (data?) => {
  return serviceAxios({
    url: '/api/user/register',
    method: 'post',
    data,
  })
}

export const loginBlog = (data?) => {
  return serviceAxios({
    url: '/api/user/login',
    method: 'post',
    data,
  })
}

export const logoutBlog = () => {
  return serviceAxios({
    url: '/api/user/logout',
    method: 'get',
  })
}

export const loginTest = () => {
  return serviceAxios({
    url: '/api/user/login-test',
    method: 'get',
  })
}
