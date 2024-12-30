import { Input } from '@arco-design/web-react';
import { UsualContent } from '../ToolContent/UsualContent';
import { useState } from 'react';
import { Descriptions } from '@arco-design/web-react';

const TextArea = Input.TextArea;

const tips = [
  {
    title: '统计功能',
    content:
      '该功能能够全面统计文本内容，包括总字符数、数字、汉字总数、汉字符号、外文字母、外文单词以及外文符号等。',
  },
];

export const TextCount = () => {
  const [val, setVal] = useState('');
  const [data, setData] = useState([
    {
      label: '总字符数',
      value: 0,
    },
    {
      label: '数字',
      value: 0,
    },
    {
      label: '总汉字数',
      value: 0,
    },
    {
      label: '汉字符号',
      value: 0,
    },
    {
      label: '外文字母',
      value: 0,
    },
    {
      label: '外文单词',
      value: 0,
    },
    {
      label: '外文符号',
      value: 0,
    },
  ]);

  const getByteLength = (text: string) => {
    let byteLength = 0;

    for (const char of text) {
      byteLength += char.charCodeAt(0) > 255 ? 2 : 1;
    }

    return byteLength;
  };

  const getCNSymbols = (txt: string) => {
    // 获取输入值并替换换行符
    const text = txt.replace(/\r\n/g, '\n');

    // 去掉所有非汉字字符
    const h = text.replace(/\n/g, '');

    // 匹配所有汉字
    const cnMatches = text.match(/[\u4e00-\u9fa5]/g) || [];

    // 计算汉字字符的数量
    const totalCnCount = cnMatches.length;

    // 计算非汉字字符的数量
    let nonCnCount = 0;
    for (let i = 0; i < h.length; i++) {
      if (h.charAt(i).match(/[^\x00-\xff]/)) {
        nonCnCount++;
      }
    }

    return nonCnCount - totalCnCount;
  };

  const handleChange = (value: string) => {
    setVal(value);

    const totalChars = getByteLength(value);
    const totalChinese = (value.match(/[\u4e00-\u9fa5]/g) || []).length;
    const chineseSymbols = getCNSymbols(value);
    const foreignLetters = (value.match(/[a-zA-Z]/g) || []).length;
    const foreignWords = (value.match(/[a-zA-Z]+/g) || []).length;
    const foreignSymbols = (value.match(/[.,!?;:()'"~`@#$%^&*]/g) || []).length;
    const numbers = (value.match(/[0-9]/g) || []).length;

    setData([
      { label: '总字符数', value: totalChars },
      { label: '数字', value: numbers },
      { label: '总汉字数', value: totalChinese },
      { label: '汉字符号', value: chineseSymbols },
      { label: '外文字母', value: foreignLetters },
      { label: '外文单词', value: foreignWords },
      { label: '外文符号', value: foreignSymbols },
    ]);
  };

  return (
    <UsualContent
      title="文本统计"
      content={
        <div className="textconvert-container">
          <TextArea
            className="text-tool-textarea"
            placeholder="请输入要统计的文本"
            value={val}
            onChange={handleChange}
            autoSize={{ minRows: 20 }}
            allowClear
          />

          <section className="text-tool-count">
            <h1 className="usual-content-title">统计详情</h1>
            <Descriptions
              column={1}
              data={data}
              border
              labelStyle={{ paddingRight: 36 }}
            />
          </section>
        </div>
      }
      tips={tips}
    />
  );
};
