const mysql = require('mysql2')
const { MYSQL_CONFIG } = require('../config/db')

// 创建连接对象
const connection = mysql.createConnection(MYSQL_CONFIG)

// 开始连接
connection.connect()

// 统一执行 SQL 的函数
function exec(sql) {
  const promise = new Promise((resolve, reject) => {
    connection.query(sql, (err, res) => {
      if (err) {
        reject(err)
        return
      }
      resolve(res)
    })
  })

  return promise
}

module.exports = {
  exec,
  escape: mysql.escape
}