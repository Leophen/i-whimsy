import { NextApiRequest, NextApiResponse } from 'next';
import { withIronSessionApiRoute } from 'iron-session/next';
import { ironOptions } from 'config';
import { prepareConnection } from 'db/index';
import { User } from 'db/entity/index';

async function login(req: NextApiRequest, res: NextApiResponse) {
  const { phone = '', verify = '' } = req.body;

  const db = await prepareConnection();
  const userDB = db.getRepository(User);

  const users = await userDB.find();

  console.log(phone, verify, users);
  res?.status(200).json({
    phone,
    verify,
  });
}

export default withIronSessionApiRoute(login, ironOptions);
