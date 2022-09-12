import { NextApiRequest, NextApiResponse } from 'next';
import { withIronSessionApiRoute } from 'iron-session/next';
import { ironOptions } from 'config';
import { prepareConnection } from 'db/index';
import { User } from 'db/entity/index';

async function register(req: NextApiRequest, res: NextApiResponse) {
  const { account = '', password = '' } = req.body;

  const db = await prepareConnection();
  const userDB = db.getRepository(User);

  const currentAccount = await userDB
    .createQueryBuilder('user')
    .where('user.account = :account', { account })
    .getOne();

  let status = 0;
  let msg = '';
  if (currentAccount) {
    msg = '该账号已存在';
  } else {
    await userDB
      .createQueryBuilder()
      .insert()
      .into(User)
      .values([{ account, password }])
      .execute();
    status = 1;
  }

  res?.status(200).json({
    status,
    msg,
  });
}

export default withIronSessionApiRoute(register, ironOptions);
