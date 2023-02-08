import serviceAxios from '../index'

export const getBlogCount = () => {
  return serviceAxios({
    url: '/api/blog/count',
    method: 'get',
  })
}

export const getBlogList = (data?) => {
  return serviceAxios({
    url: '/api/blog/list',
    method: 'post',
    data,
  })
}

export const getBlogDetail = (data?) => {
  return serviceAxios({
    url: '/api/blog/detail',
    method: 'post',
    data,
  })
}

export const createBlog = (data?) => {
  return serviceAxios({
    url: '/api/blog/new',
    method: 'post',
    data,
  })
}

export const updateBlog = (data?) => {
  return serviceAxios({
    url: '/api/blog/update',
    method: 'post',
    data,
  })
}

export const deleteBlog = (data?) => {
  return serviceAxios({
    url: '/api/blog/del',
    method: 'post',
    data,
  })
}
