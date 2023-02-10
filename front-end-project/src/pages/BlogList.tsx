import { Divider, Tag, Pagination } from '@arco-design/web-react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { getBlogCount, getBlogList } from '../http/api/blog'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

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
        page.num = pageNum
        setPage({ ...page })
      })
      .catch((err) => {
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

  return (
    <div className="blog-list-wrapper">
      {blogList.map((item, index) => (
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
      ))}
      <footer className="blog-list-footer">
        <Pagination showTotal total={page.count} current={parseInt(page.num)} pageSize={page.size} showJumper sizeCanChange onChange={handlePageChange} />
      </footer>
    </div>
  )
}

export default BlogList
