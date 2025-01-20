import { Message } from '@arco-design/web-react';

/**
 * 处理复制操作
 *
 * @param value 要复制的内容
 * @param showVal 是否在提示信息中显示复制的内容，默认为 false
 * @returns 无返回值
 */
export const handleCopy = (value: string, showVal?: boolean) => {
  // 创建一个临时的文本区域元素
  const textArea = document.createElement('textarea');
  textArea.value = value;

  // 设置样式以避免影响布局
  textArea.style.position = 'fixed'; // Prevent scrolling to bottom of page in MS Edge.
  textArea.style.opacity = '0';

  document.body.appendChild(textArea);

  // 选择文本区域内容
  textArea.select();
  textArea.setSelectionRange(0, 99999); // For mobile devices

  // 尝试使用 Clipboard API 进行复制
  const successful = document.execCommand('copy');

  // 清理
  document.body.removeChild(textArea);

  // 根据复制结果显示提示
  if (successful) {
    showVal
      ? Message.success(`复制成功: ${value}`)
      : Message.success('复制成功');
  } else {
    showVal ? Message.error(`复制失败: ${value}`) : Message.error('复制失败');
  }
};
