const env = process.env.NODE_ENV  // 环境参数

// 配置
let MYSQL_CONFIG
let REDIS_CONFIG

if (env === 'dev') {
  MYSQL_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: 'Ljh870040425',
    port: 3306,
    database: 'myblog'
  }

  REDIS_CONFIG = {
    port: 6379,
    host: '127.0.0.1'
  }
}

if (env === 'production') {
  // 这里应为线上配置，暂时用本地替代
  MYSQL_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: 'Ljh870040425',
    port: 3306,
    database: 'myblog'
  }

  REDIS_CONFIG = {
    port: 6379,
    host: '127.0.0.1'
  }
}

module.exports = {
  MYSQL_CONFIG,
  REDIS_CONFIG
}