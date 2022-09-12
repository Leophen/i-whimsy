import { NextApiRequest, NextApiResponse } from 'next';
import { withIronSessionApiRoute } from 'iron-session/next';
import { ironOptions } from 'config';

async function login(req: NextApiRequest, res: NextApiResponse) {
  const { phone = '', verify = '' } = req.body;
  console.log(phone, verify);
  res?.status(200).json({
    phone,
    verify,
  });
}

export default withIronSessionApiRoute(login, ironOptions);
