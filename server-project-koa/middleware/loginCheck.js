const { ErrorModel } = require('../model/resModel');

module.exports = async (ctx, next) => {
  if (ctx.session.username) {
    await next()
  } else {
    ctx.body = new ErrorModel('尚未登录')
  }
}