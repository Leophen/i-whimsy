export const isAcceptFile = (file, accept) => {
  if (accept && file) {
    const accepts = Array.isArray(accept)
      ? accept
      : accept
          .split(',')
          .map((x) => x.trim())
          .filter((x) => x);
    const fileExtension =
      file.name.indexOf('.') > -1 ? file.name.split('.').pop() : '';
    return accepts.some((type) => {
      const text = type && type.toLowerCase();
      const fileType = (file.type || '').toLowerCase();
      if (text === fileType) {
        // 类似excel文件这种
        // 比如application/vnd.ms-excel和application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
        // 本身就带有.字符的，不能走下面的.jpg等文件扩展名判断处理
        // 所以优先对比input的accept类型和文件对象的type值
        return true;
      }
      if (new RegExp('/*').test(text)) {
        // image/* 这种通配的形式处理
        const regExp = new RegExp('/.*$');
        return fileType.replace(regExp, '') === text.replace(regExp, '');
      }
      if (new RegExp('..*').test(text)) {
        // .jpg 等后缀名
        return text === `.${fileExtension && fileExtension.toLowerCase()}`;
      }
      return false;
    });
  }
  return !!file;
};

/**
 * 将文件转换为 ArrayBuffer
 *
 * @param file 要转换的文件对象
 * @returns 返回一个 Promise，该 Promise 解析为文件的 ArrayBuffer 表示
 */
export const fileToArrayBuffer = (file: File) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result); // 结果为 ArrayBuffer
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file); // 读取为 ArrayBuffer
  });
};
