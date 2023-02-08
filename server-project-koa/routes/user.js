const router = require('koa-router')()
const { login, register } = require('../controller/user')
const { SuccessModel, ErrorModel } = require('../model/resModel')

router.prefix('/api/user')

// 注册
router.post('/register', async (ctx, next) => {
  const { username, password } = ctx.request.body
  const result = await register(username, password)

  if (result === -2) {
    ctx.body = new ErrorModel('账号已存在')
  } else if (result === -1) {
    ctx.body = new ErrorModel('注册失败')
  } else {
    ctx.body = new SuccessModel()
  }
});

// 登录
router.post('/login', async (ctx, next) => {
  const { username, password } = ctx.request.body
  const result = await login(username, password)

  if (result.username) {
    // 设置 Session
    ctx.session.username = result.username
    ctx.body = new SuccessModel({
      username: ctx.session.username
    })
  } else {
    ctx.body = new ErrorModel('登录失败')
  }
});

// 退出登录
router.get('/logout', (ctx, next) => {
  if (ctx.session.username) {
    ctx.session.username = null
    ctx.body = new SuccessModel('退出登录成功')
  } else {
    ctx.body = new ErrorModel('退出登录失败')
  }
});

// 登陆验证的测试
router.get('/login-test', (ctx, next) => {
  if (ctx.session.username) {
    ctx.body = new SuccessModel({
      username: ctx.session.username
    })
  } else {
    ctx.body = new ErrorModel('尚未登录')
  }
});

module.exports = router
