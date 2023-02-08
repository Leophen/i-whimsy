const {
  exec,
  escape
} = require('../db/mysql')

/**
 * 获取博客总数
 * @returns 博客总数
 */
const getTotal = async () => {
  const sql = `select count(*) from blogs`

  const rows = await exec(sql)
  const result = rows[0]
  return result['count(*)']
}

/**
 * 获取博客列表
 * @param {*} page_num 页码
 * @param {*} page_size 每页展示条目
 * @returns 博客列表数据
 */
const getList = async (page_num, page_size) => {
  let sql = `select * from blogs order by updatetime desc`
  if (page_num && page_size) {
    sql += ` limit ${(parseInt(page_num) - 1) * parseInt(page_size)},${parseInt(page_size)}`
  }

  // 返回 promise
  return await exec(sql)
}

/**
 * 获取博客详情
 * @param {*} id 博客ID
 * @returns 博客详情数据
 */
const getDetail = async (id) => {
  const sql = `select * from blogs where id = '${id}'`

  const rows = await exec(sql)
  return rows[0]
}

/**
 * 新建博客
 * @param {*} blogData 新建的博客数据
 * @param {*} sessionAuthor 编辑人
 * @returns 新建的博客ID
 */
const newBlog = async (blogData = {}, sessionAuthor) => {
  let {
    title,
    content,
    tag
  } = blogData
  title = escape(title)
  content = escape(content)
  tag = escape(tag)
  const createTime = Date.now()

  const sql = `
    insert into blogs (title, content, updatetime, author, tag) values (${title}, ${content}, ${createTime}, '${sessionAuthor}', ${tag})
  `

  const insertData = await exec(sql)
  return {
    id: insertData.insertId
  }
}

/**
 * 更新博客
 * @param {*} blogData 更新的博客数据
 * @param {*} sessionAuthor 编辑人
 * @returns
 * 0 编辑成功
 * -1 不能编辑他人的博客
 * -2 未知错误
 */
const updateBlog = async (blogData = {}, sessionAuthor) => {
  let {
    id,
    title,
    content,
    author,
    tag
  } = blogData
  title = escape(title)
  content = escape(content)
  tag = escape(tag)
  const updateTime = Date.now()

  const sql = `
    update blogs set title = ${title}, content = ${content}, updatetime = ${updateTime}, author = '${author}', tag = ${tag}
    where id = ${id}
  `

  const updateData = await exec(sql)
  if (author !== sessionAuthor) {
    return -1
  }
  if (updateData.affectedRows > 0) {
    return 0
  }
  return -2
}

/**
 * 删除博客
 * @param {*} id 要删除的博客 ID
 * @param {*} sessionAuthor 删除人
 * @returns
 * 0 删除成功
 * -1 不能删除他人的博客
 * -2 未知错误
 */
const delBlog = async (id, sessionAuthor) => {
  const checkSql = `SELECT * FROM blogs WHERE id = '${id}'`;
  const delSql = `delete from blogs where id = '${id}' and author='${sessionAuthor}'`

  const rows = await exec(checkSql)
  const author = rows[0].author
  if (author === sessionAuthor) {
    const delData = await exec(delSql)
    if (delData.affectedRows > 0) {
      return 0
    }
    return -2
  } else {
    return -1
  }
}

module.exports = {
  getTotal,
  getList,
  getDetail,
  newBlog,
  updateBlog,
  delBlog
}