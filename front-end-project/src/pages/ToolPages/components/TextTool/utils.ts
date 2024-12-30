export const textConvertOptions = [
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
  {
    value: 'tuofengzhuankongge',
    label: '驼峰转空格',
  },
  {
    value: 'tuofengzhuanxiahuaxian',
    label: '驼峰转下划线',
  },
  {
    value: 'konggezhuanhenggan',
    label: '空格转横杆',
  },
  {
    value: 'hengganzhuankongge',
    label: '横杆转空格',
  },
];

/**
 * 处理文本转换
 *
 * @param oldVal 需要处理的文本
 * @param mode 转换模式
 * @returns 处理后的文本
 */
export const usualConvert = (oldVal: string, mode: string) => {
  // 转大写
  if (mode === 'zhuandaxie') {
    const val = oldVal.toUpperCase();
    return val;
  }

  // 转小写
  else if (mode === 'zhuanxiaoxie') {
    const val = oldVal.toLowerCase();
    return val;
  }

  // 首字母大写
  else if (mode === 'shouzimudaxie') {
    const val = oldVal
      .split(' ') // 按空格分割成单词
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // 将首字母转大写
      .join(' '); // 重新连接成字符串
    return val;
  }

  // 首字母小写
  else if (mode === 'shouzimuxiaoxie') {
    const val = oldVal
      .split(' ') // 按空格分割成单词
      .map((word) => word.charAt(0).toLowerCase() + word.slice(1)) // 将首字母转小写
      .join(' '); // 重新连接成字符串
    return val;
  }

  // 句子首字母大写
  else if (mode === 'juzishouzimudaxie') {
    const val = oldVal
      .split(/([.!?])/)
      .map((sentence) => sentence.trim())
      .filter(Boolean) // 过滤空字符串
      .map((sentence) => sentence.charAt(0).toUpperCase() + sentence.slice(1))
      .join(' ');
    return val;
  }

  // 空格转下划线
  else if (mode === 'konggezhuanxiahuaxian') {
    const val = oldVal.replace(/ /g, '_');
    return val;
  }

  // 下划线转空格
  else if (mode === 'xiahuaxianzhuankongge') {
    const val = oldVal.replace(/_/g, ' ');
    return val;
  }

  // 去除空格
  else if (mode === 'quchukongge') {
    const val = oldVal.replace(/\s+/g, '');
    return val;
  }

  // 空格/下划线转驼峰
  else if (mode === 'zhuantuofeng') {
    const val = oldVal
      .replace(/[_\s]+(.)/g, (_, char) => char.toUpperCase()) // 转换下划线和空格后的字符为大写
      .replace(/^./, (char) => char.toLowerCase());
    return val;
  }

  // 驼峰转空格
  else if (mode === 'tuofengzhuankongge') {
    const val = oldVal
      .replace(/([a-z])([A-Z])/g, '$1 $2') // 在小写字母和大写字母之间插入空格
      .replace(/([A-Z])/g, ' $1') // 在大写字母前插入空格
      .trim(); // 去除首尾空格
    return val;
  }

  // 驼峰转下划线
  else if (mode === 'tuofengzhuanxiahuaxian') {
    const val = oldVal
      .replace(/([a-z])([A-Z])/g, '$1_$2') // 在小写字母和大写字母之间插入下划线
      .toLowerCase(); // 将整个字符串转换为小写
    return val;
  }

  // 空格转横杆
  else if (mode === 'konggezhuanhenggan') {
    const val = oldVal.replace(/ /g, '-');
    return val;
  }

  // 横杆转空格
  else if (mode === 'hengganzhuankongge') {
    const val = oldVal.replace(/-/g, ' ');
    return val;
  }

  return oldVal;
};

export const usualReplace = (
  oldVal: string,
  replaceVal: { old: string, new: string }
) => {
  return oldVal.replace(new RegExp(replaceVal.old, 'g'), replaceVal.new);
};
