const {
  exec,
  escape
} = require('../db/mysql')
const {
  encrypt
} = require('../utils/cryp')

/**
 * 登录接口
 * @param {*} username 用户名
 * @param {*} password 密码
 * @returns 登录是否成功
 */
const login = async (username, password) => {
  username = escape(username)
  password = escape(password)
  // password = escape(encrypt(password))

  const sql = `
    select username from users where username = ${username} and password = ${password}
  `

  const rows = await exec(sql)
  return rows[0] || {}
}

/**
 * 注册接口
 * @param {*} username 用户名
 * @param {*} password 密码
 * @returns
 * 返回注册ID 注册成功
 * -1 注册失败
 * -2 账号已存在
 */
const register = async (username, password) => {
  username = escape(username)
  password = escape(password)
  // password = escape(encrypt(password))

  const querySql = `SELECT * FROM users
  WHERE username = ${username}`;
  const insertSql = `INSERT INTO users (username, password)
  VALUES (${username}, ${password})`;

  const queryResult = await exec(querySql)
  if (queryResult.length > 0) {
    return -2
  } else {
    const insertRows = await exec(insertSql)
    return insertRows.insertId || -1
  }
}

module.exports = {
  login,
  register
}