import { Input } from '@arco-design/web-react';
import { UsualContent } from '../ToolContent/UsualContent';
import { Button } from '@arco-design/web-react';
import { IconRight } from '@arco-design/web-react/icon';
import { Radio } from '@arco-design/web-react';
import { useState } from 'react';
import { IconCopy } from '@arco-design/web-react/icon';
import { Message } from '@arco-design/web-react';
import { Tooltip } from '@arco-design/web-react';
import { IconRefresh } from '@arco-design/web-react/icon';
import { textConvertOptions, usualConvert } from './utils';
import { handleCopy } from '../../utils';

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

export const TextConvert = () => {
  const [mode, setMode] = useState('zhuandaxie');

  const [oldVal, setOldVal] = useState('');
  const [newVal, setNewVal] = useState('');

  const handleConvert = () => {
    const val = usualConvert(oldVal, mode);
    setNewVal(val);
  };

  const handleRevert = () => {
    setOldVal('');
    setNewVal('');
  };

  return (
    <UsualContent tips={tips}>
      <div className="tool-container">
        <section className="text-tool-bar">
          <RadioGroup
            options={textConvertOptions}
            size="large"
            value={mode}
            onChange={setMode}
          />
        </section>

        <div className="text-tool-content">
          <TextArea
            className="text-tool-textarea"
            placeholder="请输入要转换的文本"
            value={oldVal}
            onChange={setOldVal}
            autoSize={{ minRows: 20 }}
            allowClear
          />
          <div className="text-tool-content-handle">
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
            className="text-tool-textarea"
            placeholder="已处理的文本"
            value={newVal}
            onChange={setNewVal}
            autoSize={{ minRows: 20 }}
            readOnly
          />
          <Button
            type="outline"
            className="tool-copy-btn"
            icon={<IconCopy />}
            onClick={() => handleCopy(newVal)}
          >
            一键复制
          </Button>
        </div>
      </div>
    </UsualContent>
  );
};
