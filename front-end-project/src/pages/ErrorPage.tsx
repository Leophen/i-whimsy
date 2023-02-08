import { Result, Button } from '@arco-design/web-react';
import { IconFaceFrownFill } from '@arco-design/web-react/icon';
import { useNavigate } from 'react-router-dom'

const ErrorPage = () => {
  const navigate = useNavigate()

  return (
    <div className="blog-error-wrapper">
      <Result
        status='error'
        icon={<IconFaceFrownFill />}
        title='出错啦!'
        subTitle='访问的页面不存在'
        extra={<Button type='primary' onClick={() => navigate('/')}>返回首页</Button>}
      >
      </Result>
    </div>
  )
}

export default ErrorPage
