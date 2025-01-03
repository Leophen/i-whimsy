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
    IMAGE_THEME: {id: 'imagetheme' as const, label: '图片主题色提取'},
});