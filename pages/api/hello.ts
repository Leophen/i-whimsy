// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import { mock, Random } from 'mockjs';

type Data = {
  name: string,
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  res.status(200).json(
    mock({
      // 属性 list 的值是一个数组，其中含有 1 到 10 个元素
      'list|1-10': [
        {
          'name|1': [Random.cname(), Random.cname(), Random.cname()],
          birthday: Random.date('yyyy-MM-dd'),
          address: Random.county(true),
        },
      ],
    })
  );
}
