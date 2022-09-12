import { NextApiRequest, NextApiResponse } from 'next';
import { withIronSessionApiRoute } from 'iron-session/next';
import { ironOptions } from 'config';
import { prepareConnection } from 'db/index';
import { User } from 'db/entity/index';

async function login(req: NextApiRequest, res: NextApiResponse) {
  const { account = '', password = '' } = req.body;

  const db = await prepareConnection();
  const userDB = db.getRepository(User);

  const currentAccount = await userDB
    .createQueryBuilder('user')
    .where('user.account = :account', { account })
    .getOne();

  let status = 0;
  const loginMsg = () => {
    if (!currentAccount) {
      return '账号不存在';
    }
    if (!!currentAccount && currentAccount.password !== password) {
      return '密码不正确';
    }
    status = 1;
    return '';
  };

  res?.status(200).json({
    msg: loginMsg(),
    status,
  });
}

export default withIronSessionApiRoute(login, ironOptions);
