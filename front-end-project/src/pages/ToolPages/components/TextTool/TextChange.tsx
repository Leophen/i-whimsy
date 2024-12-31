import { Input } from '@arco-design/web-react';
import { UsualContent } from '../ToolContent/UsualContent';
import { Button } from '@arco-design/web-react';
import { IconRight } from '@arco-design/web-react/icon';
import { useState } from 'react';
import { IconCopy } from '@arco-design/web-react/icon';
import { Message } from '@arco-design/web-react';
import { Tooltip } from '@arco-design/web-react';
import { IconRefresh } from '@arco-design/web-react/icon';
import { usualReplace } from './utils';

const TextArea = Input.TextArea;

const tips = [
  {
    title: '替换用法',
    content: '在文本中查找特定的词或短语，并将其替换为另一个词或短语。',
  },
];

export const TextChange = () => {
  const [replaceVal, setReplaceVal] = useState({
    old: '',
    new: '',
  });

  const [oldVal, setOldVal] = useState('');
  const [newVal, setNewVal] = useState('');

  const handleConvert = () => {
    const val = usualReplace(oldVal, replaceVal);
    setNewVal(val);
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
    <UsualContent title="文本替换" tips={tips}>
      <div className="tool-container">
        <section className="text-tool-bar col">
          <div className="text-tool-bar-item">
            <h4 className="tool-content-title-small">查找目标</h4>
            <Input
              placeholder="请输入被替换的文本"
              value={replaceVal.old}
              onChange={(val) => setReplaceVal({ ...replaceVal, old: val })}
            />
          </div>
          <div className="text-tool-bar-item">
            <h4 className="tool-content-title-small">替换为</h4>
            <Input
              placeholder="请输入要替换成的文本"
              value={replaceVal.new}
              onChange={(val) => setReplaceVal({ ...replaceVal, new: val })}
            />
          </div>
        </section>

        <h4 className="tool-content-title-small">替换文本</h4>
        <div className="text-tool-content">
          <TextArea
            className="text-tool-textarea"
            placeholder="请输入替换原文"
            value={oldVal}
            onChange={setOldVal}
            autoSize={{ minRows: 20 }}
            allowClear
          />
          <div className="text-tool-content-handle">
            <Tooltip mini position="right" content="替换">
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
            onClick={handleCopy}
          >
            一键复制
          </Button>
        </div>
      </div>
    </UsualContent>
  );
};
