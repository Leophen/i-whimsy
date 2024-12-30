import { TextConvert } from './components/TextTool/TextConvert';
import { TextCount } from './components/TextTool/TextCount';
import { TextReplace } from './components/TextTool/TextReplace';
// import { TextTranslate } from './components/TextTool/TextTranslate';

export const tools = [
  {
    cnTitle: '文本类工具',
    enTitle: 'Text Tools',
    path: 'text',
    icon: (
      <svg
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        p-id="13200"
        width="200"
        height="200"
      >
        <path
          d="M149.76 512a26.24 26.24 0 0 1-10.24 0 31.36 31.36 0 0 1-20.48-40.32l128-384A32.64 32.64 0 0 1 275.84 64a32.64 32.64 0 0 1 30.72 21.76l128 384A31.36 31.36 0 0 1 416 512a32 32 0 0 1-40.96-19.84L276.48 197.12 179.84 490.24a31.36 31.36 0 0 1-30.08 21.76z"
          fill="#4D4D4D"
          p-id="13201"
        ></path>
        <path
          d="M341.76 384h-128a32 32 0 0 1 0-64h128a32 32 0 0 1 0 64zM405.76 960h-256a32 32 0 0 1-21.76-51.84L339.2 640h-192a32 32 0 0 1 0-64h256a32 32 0 0 1 24.96 51.84L216.32 896h192a32 32 0 0 1 0 64zM725.76 896a32 32 0 0 1-32-32v-768a32 32 0 0 1 32-32 32 32 0 0 1 32 32v768a32 32 0 0 1-32 32z"
          fill="#4D4D4D"
          p-id="13202"
        ></path>
        <path
          d="M725.76 949.12a32.64 32.64 0 0 1-23.04-9.6l-181.12-181.12a32 32 0 0 1 0-44.8 32 32 0 0 1 45.44 0l158.72 158.08 158.08-158.08a32 32 0 0 1 45.44 0 32 32 0 0 1 0 44.8l-181.12 181.12a32 32 0 0 1-22.4 9.6z"
          fill="#4D4D4D"
          p-id="13203"
        ></path>
      </svg>
    ),
    list: [
      {
        name: '文本转换',
        path: 'textconvert',
        content: <TextConvert />,
      },
      {
        name: '文本替换',
        path: 'textreplace',
        content: <TextReplace />,
      },
      {
        name: '文本统计',
        path: 'textcount',
        content: <TextCount />,
      },
      //   {
      //     name: '生成变量名',
      //     path: 'texttranslate',
      //     content: <TextTranslate />,
      //   },
    ],
  },
];
