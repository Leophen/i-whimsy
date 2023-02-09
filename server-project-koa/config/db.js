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
  MYSQL_CONFIG = {
    host: 'db4free.net',
    user: 'leophen',
    password: 'Ljh870040425',
    port: 3306,
    database: 'leophensql'
  }

  REDIS_CONFIG = {
    port: 18182,
    host: 'redis-18182.c302.asia-northeast1-1.gce.cloud.redislabs.com'
  }
}

module.exports = {
  MYSQL_CONFIG,
  REDIS_CONFIG
}