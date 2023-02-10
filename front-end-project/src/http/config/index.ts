const ENV = process.env.NODE_ENV === 'development' ? 'dev' : 'prd';

const serverConfig = {
  baseURL: ENV === 'dev' ? 'http://localhost:7676' : 'https://api.leophen.top',
  useTokenAuthorization: true, // 是否开启 token 认证
};

export default serverConfig;
