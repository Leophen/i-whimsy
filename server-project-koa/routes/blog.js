const router = require('koa-router')()
const {
  getTotal,
  getList,
  getDetail,
  newBlog,
  updateBlog,
  delBlog
} = require('../controller/blog')
const { SuccessModel, ErrorModel } = require('../model/resModel')
const loginCheck = require('../middleware/loginCheck')

router.prefix('/api/blog')

// 获取博客列表总数
router.get('/count', async function (ctx, next) {
  const result = await getTotal()

  ctx.body = new SuccessModel(result)
})

// 获取博客列表
router.post('/list', async (ctx, next) => {
  const { page_num, page_size } = ctx.request.body
  const result = await getList(page_num, page_size)

  ctx.body = new SuccessModel(result)
});

// 获取博客详情
router.post('/detail', async (ctx, next) => {
  const { id } = ctx.request.body
  const result = await getDetail(id)

  ctx.body = new SuccessModel(result)
});

// 新建一篇博客
router.post('/new', loginCheck, async (ctx, next) => {
  const result = await newBlog(ctx.request.body, ctx.session.username)

  ctx.body = new SuccessModel(result)
});

// 更新一篇博客
router.post('/update', loginCheck, async (ctx, next) => {
  const result = await updateBlog(ctx.request.body, ctx.session.username)

  if (result === 0) {
    ctx.body = new SuccessModel('编辑成功')
  } else if (result === -1) {
    ctx.body = new ErrorModel('不能编辑他人的博客')
  } else {
    ctx.body = new ErrorModel('编辑失败')
  }
});

// 删除一篇博客
router.post('/del', loginCheck, async (ctx, next) => {
  const { id } = ctx.request.body
  const result = await delBlog(id, ctx.session.username)

  if (result === 0) {
    ctx.body = new SuccessModel('删除成功')
  } else if (result === -1) {
    ctx.body = new ErrorModel('不能删除他人的博客')
  } else {
    ctx.body = new ErrorModel('删除失败')
  }
});

module.exports = router
