import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Breadcrumb,
  Divider,
  Typography,
  Message,
  Modal,
  Tag,
} from '@arco-design/web-react';
import { IconHome, IconEdit, IconDelete } from '@arco-design/web-react/icon';
import { getTime } from './BlogList';
import BlogEdit from './BlogEdit';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getBlogDetail, updateBlog, deleteBlog } from '../../http/api/blog';
import { Avatar } from '@arco-design/web-react';
import { BackTop } from '@arco-design/web-react';
import { Spin } from '@arco-design/web-react';
import { LoginReducer } from '../Header';

const { Title } = Typography;
const BreadcrumbItem = Breadcrumb.Item;

const BlogDetail = () => {
  const loginStatus =
    useSelector <
    {
      loginReducer: LoginReducer,
    } >
    ((state) => state.loginReducer.status);
  const loginUsername =
    useSelector <
    {
      loginReducer: LoginReducer,
    } >
    ((state) => state.loginReducer.username);

  const navigate = useNavigate();
  const params = useParams();

  const { blogId } = params;
  const [blogData, setBlogData] = useState({
    title: '标题',
    content: '内容',
    updatetime: 0,
    author: '作者',
    tag: [],
  });

  const [editShow, setEditShow] = useState(false);
  const handleEdit = () => {
    if (loginStatus) {
      setEditShow(true);
    } else {
      Message.warning('您还未登录，请先登录');
    }
  };

  const [updateVal, setUpdateVal] = useState(0);
  const handleEditSuccess = (values) => {
    const { title = '', content = '', tag = [] } = values;
    if (blogData.author !== loginUsername) {
      Message.error('不能编辑他人的博客');
    } else {
      updateBlog({
        id: blogId,
        title,
        content,
        author: blogData.author,
        tag: JSON.stringify(tag),
      })
        .then((res) => {
          if (res.data.errno !== -1) {
            Message.success('更新博客成功');
            setUpdateVal(new Date().getTime());
            setEditShow(false);
          } else {
            Message.error(res.data.message);
          }
        })
        .catch((err) => {
          console.error(err);
        });
    }
  };

  useEffect(() => {
    getBlogDetail({ id: blogId })
      .then((res) => {
        if (res.data.data) {
          const { title, content, updatetime, author, tag } = res.data.data;
          blogData.title = title;
          blogData.content = content;
          blogData.updatetime = updatetime;
          blogData.author = author;
          blogData.tag = tag ? JSON.parse(tag) : [];
          setBlogData({ ...blogData });
          setLoad(false);
        } else {
          Message.error('博客不存在');
          navigate('/');
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, [updateVal]);

  const handleDelete = () => {
    if (loginStatus) {
      Modal.confirm({
        title: '删除博客',
        content: `您确定要删除「${blogData.title}」这篇博客吗，删除后将无法恢复。`,
        okButtonProps: {
          status: 'danger',
        },
        onOk: () => {
          deleteBlog({
            id: blogId,
          })
            .then((res) => {
              if (res.data.errno !== -1) {
                Message.success('删除博客成功');
                navigate('/');
              } else {
                Message.error(res.data.message);
              }
            })
            .catch((err) => {
              console.error(err);
            });
        },
      });
    } else {
      Message.warning('您还未登录，请先登录');
    }
  };

  const [load, setLoad] = useState(true);
  const getStatus = () => {
    if (load) {
      return 'load';
    } else {
      return 'success';
    }
  };

  return (
    <div className="blog-detail-wrapper">
      <div className="blog-detail">
        <Breadcrumb>
          <BreadcrumbItem
            className="blog-back-home"
            onClick={() => navigate(`/`)}
          >
            <IconHome />
          </BreadcrumbItem>
          <BreadcrumbItem>博客详情</BreadcrumbItem>
        </Breadcrumb>
      </div>

      {getStatus() === 'load' && <Spin dot />}
      {getStatus() === 'success' && (
        <Typography className="blog-detail">
          <Title heading={3}>{blogData.title}</Title>
          <section className="blog-detail-info">
            <Avatar size={40}>{blogData.author.slice(0, 1)}</Avatar>
            <div className="blog-detail-info-txt">
              <span className="blog-detail-author">{blogData.author}</span>
              <span className="blog-detail-time">
                修改于 {getTime(blogData.updatetime)}
              </span>
            </div>
          </section>
          <section className="blog-item-type">
            {blogData.tag &&
              blogData.tag.map((item, index) => (
                <Tag key={index} bordered>
                  {item}
                </Tag>
              ))}
          </section>
          {/* <Divider /> */}
          <article
            className="blog-detail-content"
            dangerouslySetInnerHTML={{ __html: blogData.content }}
          />
        </Typography>
      )}

      <div className="blog-detail">
        <Divider>End</Divider>

        <footer className="blog-detail-footer">
          <section className="blog-detail-change">
            <span className="blog-detail-edit" onClick={handleEdit}>
              <IconEdit />
              编辑博客
            </span>
            <span className="blog-detail-delete" onClick={handleDelete}>
              <IconDelete />
              删除博客
            </span>
          </section>
        </footer>
      </div>

      <BackTop visibleHeight={30} />

      <BlogEdit
        mode="update"
        visible={editShow}
        title={blogData.title}
        content={blogData.content}
        tag={blogData.tag}
        onSuccess={handleEditSuccess}
        onClose={() => setEditShow(false)}
      />
    </div>
  );
};

export default BlogDetail;
