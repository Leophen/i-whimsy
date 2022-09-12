import { NextApiRequest, NextApiResponse } from 'next';
import dayjs from 'dayjs';
import md5 from 'md5';
import { encode } from 'js-base64';
import request from 'service/fetch';
import { withIronSessionApiRoute } from 'iron-session/next';
import { ironOptions } from 'config';
import { ISession } from 'pages/api/index';

async function sendVerifyCode(req: NextApiRequest, res: NextApiResponse) {
  const session: ISession = req.session;

  const { to = '', templateId = '1' } = req.body;
  // 容联云短信接口文档 https://doc.yuntongxun.com/pe/5a533de33b8496dd00dce07c

  const AppId = '8aaf070882ede8b301832b6202fe0b49';
  const AccountId = '8aaf070882ede8b301832b6202080b42';
  const AuthToken = 'ac6e6ec653aa4b728cb17ca5aa1c8772';
  const NowDate = dayjs().format('YYYYMMDDHHmmss');

  const SigParameter = md5(`${AccountId}${AuthToken}${NowDate}`);
  const Authorization = encode(`${AccountId}:${NowDate}`);

  // 验证码
  const verifyCode = Math.floor(Math.random() * (9999 - 1000)) + 1000;
  // 过期时间
  const expireMinute = '5';

  const url = `https://app.cloopen.com:8883/2013-12-26/Accounts/${AccountId}/SMS/TemplateSMS?sig=${SigParameter}`;

  const response = await request.post(
    url,
    {
      to,
      templateId,
      appId: AppId,
      dates: [verifyCode, expireMinute],
    },
    {
      headers: { Authorization },
    }
  );

  const { statusCode, TemplateSMS, statusMsg } = response as any;
  
  if (statusCode === '000000') {
    session.verifyCode = verifyCode;
    await session.save();
    res.status(200).json({
      code: 0,
      msg: statusMsg,
      data: {
        TemplateSMS
      }
    })
  } else {
    res.status(200).json({
      code: statusCode,
      msg: statusMsg,
    })
  }
}

export default withIronSessionApiRoute(sendVerifyCode, ironOptions);
