import { enumxFactory } from "../utils/enumxFactory";

/**
 * 工具类型
 */
export const EToolType = enumxFactory({
    TEXT: {id: 'text' as const, label: '文本类工具'},
    TEXT_CONVERT: {id: 'textconvert' as const, label: '文本转换'},
    TEXT_REPLACE: {id: 'textreplace' as const, label: '文本替换'},
    TEXT_COUNT: {id: 'textcount' as const, label: '文本统计'},
    TEXT_TRANSLATE: {id: 'texttranslate' as const, label: '生成变量名'},

    IMAGE: {id: 'image' as const, label: '图片类工具'},
    IMAGE_COMPRESS: {id: 'imagecompress' as const, label: '图片压缩'},
    IMAGE_CROP: {id: 'imagecrop' as const, label: '图片裁剪'},
    IMAGE_FILTER: {id: 'imagefilter' as const, label: '图片滤镜调整'},
    IMAGE_THEME: {id: 'imagetheme' as const, label: '图片主题色提取'},

    COLOR: {id: 'color' as const, label: '颜色类工具'},
    COLOR_CONVERT: {id: 'colorconvert' as const, label: '颜色转换'},
    COLOR_CONTRAST: {id: 'colorcontrast' as const, label: '颜色对比度检查'},

    TIME: {id: 'time' as const, label: ' 时间类工具'},
    TIME_COMPUTE: {id: 'timecompute' as const, label: '计算日期差'},
    TIME_CALCULATE: {id: 'timecalculate' as const, label: '日期推算器'},
});