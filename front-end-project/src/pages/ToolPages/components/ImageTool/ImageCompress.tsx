import { Input } from '@arco-design/web-react';
import { useState } from 'react';
import { Descriptions } from '@arco-design/web-react';
import { UsualContent } from '../ToolContent/UsualContent';

const TextArea = Input.TextArea;

const tips = [
  {
    title: '统计功能',
    content:
      '该功能能够全面统计文本内容，包括总字符数、数字、汉字总数、汉字符号、外文字母、外文单词以及外文符号等。',
  },
];

export const ImageCompress = () => {
  const [val, setVal] = useState('');

  return (
    <UsualContent
      title="图像压缩"
      content={
        <div className="textconvert-container">
          <TextArea
            className="text-tool-textarea"
            placeholder="请输入要统计的文本"
            value={val}
            onChange={setVal}
            autoSize={{ minRows: 20 }}
            allowClear
          />
        </div>
      }
      tips={tips}
    />
  );
};
