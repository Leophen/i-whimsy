import { Input } from '@arco-design/web-react';
import { UsualContent } from './UsualContent';
import { Button } from '@arco-design/web-react';
import { IconRight } from '@arco-design/web-react/icon';
import { Radio } from '@arco-design/web-react';
import { useState } from 'react';
import { IconCopy } from '@arco-design/web-react/icon';
import clipboardy from 'clipboard';
import { Message } from '@arco-design/web-react';
import { Tooltip } from '@arco-design/web-react';
import { IconRefresh } from '@arco-design/web-react/icon';

const TextArea = Input.TextArea;
const RadioGroup = Radio.Group;

const tips = [
  {
    title: '英文中句子首字母的大写规则',
    content:
      '在英文中，每个完整句子的开头，首字母必须大写，尤其是在句号、问号和感叹号后面。而相反的，逗号、分号和冒号后面的内容通常不需要大写。',
  },
  {
    title: '什么是驼峰',
    content:
      '驼峰命名法（camelCase）是一种在编程和命名中使用的命名约定，主要用于命名变量、函数或其他标识符。其特点是将多个单词连接在一起，第一个单词的首字母小写，后续单词的首字母大写，从而使得整体名称看起来像骆驼的驼峰。',
  },
];

const options = [
  {
    value: 'zhuandaxie',
    label: '转大写',
  },
  {
    value: 'zhuanxiaoxie',
    label: '转小写',
  },
  {
    value: 'shouzimudaxie',
    label: '首字母大写',
  },
  {
    value: 'shouzimuxiaoxie',
    label: '首字母小写',
  },
  {
    value: 'juzishouzimudaxie',
    label: '句子首字母大写',
  },
  {
    value: 'konggezhuanxiahuaxian',
    label: '空格转下划线',
  },
  {
    value: 'xiahuaxianzhuankongge',
    label: '下划线转空格',
  },
  {
    value: 'quchukongge',
    label: '去除空格',
  },
  {
    value: 'zhuantuofeng',
    label: '空格/下划线转驼峰',
  },
];

export const TextConvert = () => {
  const [mode, setMode] = useState('zhuanxiaoxie');

  const [oldVal, setOldVal] = useState('');
  const [newVal, setNewVal] = useState('');

  const handleConvert = () => {
    // 转大写
    if (mode === 'zhuandaxie') {
      const val = oldVal.toUpperCase();
      setNewVal(val);
    }

    // 转小写
    else if (mode === 'zhuanxiaoxie') {
      const val = oldVal.toLowerCase();
      setNewVal(val);
    }

    // 首字母大写
    else if (mode === 'shouzimudaxie') {
      const val = oldVal
        .split(' ') // 按空格分割成单词
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // 将首字母转大写
        .join(' '); // 重新连接成字符串
      setNewVal(val);
    }

    // 首字母小写
    else if (mode === 'shouzimuxiaoxie') {
      const val = oldVal
        .split(' ') // 按空格分割成单词
        .map((word) => word.charAt(0).toLowerCase() + word.slice(1)) // 将首字母转小写
        .join(' '); // 重新连接成字符串
      setNewVal(val);
    }

    // 句子首字母大写
    else if (mode === 'juzishouzimudaxie') {
      const val = oldVal
        .split(/([.!?])/)
        .map((sentence) => sentence.trim())
        .filter(Boolean) // 过滤空字符串
        .map((sentence) => sentence.charAt(0).toUpperCase() + sentence.slice(1))
        .join(' ');
      setNewVal(val);
    }

    // 空格转下划线
    else if (mode === 'konggezhuanxiahuaxian') {
      const val = oldVal.replace(/ /g, '_');
      setNewVal(val);
    }

    // 下划线转空格
    else if (mode === 'xiahuaxianzhuankongge') {
      const val = oldVal.replace(/_/g, ' ');
      setNewVal(val);
    }

    // 去除空格
    else if (mode === 'quchukongge') {
      const val = oldVal.replace(/\s+/g, '');
      setNewVal(val);
    }

    // 空格/下划线转驼峰
    else if (mode === 'zhuantuofeng') {
      const val = oldVal
        .replace(/[_\s]+(.)/g, (_, char) => char.toUpperCase()) // 转换下划线和空格后的字符为大写
        .replace(/^./, (char) => char.toLowerCase());
      setNewVal(val);
    }
  };

  const handleCopy = () => {
    navigator.clipboard
      .writeText(newVal)
      .then(() => {
        Message.success('复制成功');
      })
      .catch(() => {
        Message.success('复制失败');
      });
  };

  const handleRevert = () => {
    setOldVal('');
    setNewVal('');
  };

  return (
    <UsualContent
      title="文本转换"
      content={
        <div className="textconvert-container">
          <section className="textconvert-bar">
            <RadioGroup
              options={options}
              size="large"
              value={mode}
              onChange={setMode}
            />
          </section>

          <div className="textconvert-content">
            <TextArea
              className="textconvert-textarea"
              placeholder="请输入要转换的文本"
              value={oldVal}
              onChange={setOldVal}
              autoSize={{ minRows: 20 }}
              allowClear
            />
            <div className="textconvert-content-handle">
              <Tooltip mini position="right" content="转换">
                <Button
                  shape="circle"
                  type="primary"
                  icon={<IconRight />}
                  onClick={handleConvert}
                />
              </Tooltip>
              <Tooltip mini position="right" content="重置">
                <Button
                  shape="circle"
                  type="primary"
                  icon={<IconRefresh />}
                  onClick={handleRevert}
                />
              </Tooltip>
            </div>
            <TextArea
              className="textconvert-textarea"
              placeholder="转换后的文本会从这里展示"
              value={newVal}
              onChange={setNewVal}
              autoSize={{ minRows: 20 }}
              readOnly
            />
            <Button
              type="outline"
              className="tool-copy-btn"
              icon={<IconCopy />}
              onClick={handleCopy}
            >
              一键复制
            </Button>
          </div>
        </div>
      }
      tips={tips}
    />
  );
};
