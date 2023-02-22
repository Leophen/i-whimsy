import { Divider, Tag, Pagination } from '@arco-design/web-react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { getBlogCount, getBlogList } from '../http/api/blog'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BackTop } from '@arco-design/web-react'
import { Empty } from '@arco-design/web-react'
import { IconExclamation } from '@arco-design/web-react/icon'
import errorIcon from '../assets/error.svg'
import { Spin } from '@arco-design/web-react'

export const getTime = (time: number) => dayjs(time).format('YYYY年MM月DD日 HH:mm:ss')

const BlogList = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [page, setPage] = useState({
    count: 0,
    num: 1,
    size: 10,
  })
  const handlePageChange = (pageNum: number, pageSize: number) => {
    getBlogList({
      page_num: pageNum,
      page_size: pageSize,
    })
      .then((res) => {
        setBlogList(res.data.data)
        setSearchParams({
          page: pageNum,
        })
        page.num = pageNum
        page.size = pageSize
        setPage({ ...page })
      })
      .catch((err) => {
        console.error(err)
      })
  }

  const [blogList, setBlogList] = useState([])
  const updateBlogList = (pageNum: number) => {
    getBlogCount().then((res) => {
      page.count = res.data.data || 0
      setPage({ ...page })
    })
    getBlogList({
      page_num: pageNum,
      page_size: page.size,
    })
      .then((res) => {
        setBlogList(res.data.data)
        setIsErr(false)
        setLoad(false)
        page.num = pageNum
        setPage({ ...page })
      })
      .catch((err) => {
        setIsErr(true)
        setLoad(false)
        console.error(err)
      })
  }
  useEffect(() => {
    // 分页重定向
    if (!searchParams.get('page')) {
      setSearchParams({
        page: page.num,
      })
      updateBlogList(page.num)
    } else {
      const pageNum = searchParams.get('page')
      updateBlogList(pageNum)
    }
  }, [])

  const [isErr, setIsErr] = useState(false)
  const [load, setLoad] = useState(true)
  const getStatus = () => {
    if (load) {
      return 'load'
    } else {
      if (blogList.length > 0) {
        return 'success'
      }
      if (isErr) {
        return 'error'
      }
      return 'empty'
    }
  }

  return (
    <div className="blog-list-wrapper">
      {getStatus() === 'load' && <Spin dot />}
      {getStatus() === 'empty' && <Empty />}
      {getStatus() === 'error' && (
        <Empty
          className='blog-list-error'
          icon={<img className='blog-list-error-icon' src={errorIcon} alt="error" />}
          description={'加载列表失败，接口在当前网络环境下不可用，请更换网络环境重试!'}
        />
      )}
      {getStatus() === 'success' && (
        blogList.map((item, index) => (
          <section className="blog-list-item" key={`${item.id}${index}`}>
            <div className="blog-item-header" onClick={() => navigate(`/detail/${item.id}`)}>
              {item.title}
            </div>

            <article className="blog-item-content" dangerouslySetInnerHTML={{ __html: item.content.replace(/<.+?>/g, '') }} />

            <footer className="blog-item-footer">
              <section className="blog-item-type">
                {item.tag &&
                  JSON.parse(item.tag).map((item, index) => (
                    <Tag key={index} bordered>
                      {item}
                    </Tag>
                  ))}
              </section>
              <div className="blog-item-info">
                <span className="blog-item-author">{item.author}</span>
                <Divider type="vertical" />
                <span className="blog-item-time">修改于 {getTime(item.updatetime)}</span>
              </div>
            </footer>
          </section>
        ))
      )}

      <BackTop
        visibleHeight={30}
      />

      <footer className="blog-list-footer">
        <Pagination showTotal total={page.count} current={parseInt(page.num)} pageSize={page.size} showJumper sizeCanChange onChange={handlePageChange} />
      </footer>
    </div>
  )
}

export default BlogList
