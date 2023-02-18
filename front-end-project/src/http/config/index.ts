const ENV = process.env.NODE_ENV === 'development' ? 'dev' : 'prd';
// const ADMIN = 'http://43.136.107.135:7676';
const ADMIN = 'https://api.leophen.top';

const serverConfig = {
  baseURL: ENV === 'dev' ? 'http://localhost:7676' : ADMIN,
  useTokenAuthorization: true, // 是否开启 token 认证
};

export default serverConfig;
