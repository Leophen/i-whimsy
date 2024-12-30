import { TextConvert } from './components/TextTool/TextConvert';
import { TextCount } from './components/TextTool/TextCount';
import { TextChange } from './components/TextTool/TextChange';
import { EToolType } from '../../enums';
import { ImageCompress } from './components/ImageTool/ImageCompress';
// import { TextTranslate } from './components/TextTool/TextTranslate';

export const tools = [
  {
    cnTitle: EToolType.getLabelById(EToolType.TEXT),
    enTitle: 'Text Tools',
    path: EToolType.TEXT,
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
        name: EToolType.getLabelById(EToolType.TEXT_CONVERT),
        path: EToolType.TEXT_CONVERT,
        content: <TextConvert />,
      },
      {
        name: EToolType.getLabelById(EToolType.TEXT_REPLACE),
        path: EToolType.TEXT_REPLACE,
        content: <TextChange />,
      },
      {
        name: EToolType.getLabelById(EToolType.TEXT_COUNT),
        path: EToolType.TEXT_COUNT,
        content: <TextCount />,
      },
      //   {
      //     name: EToolType.getLabelById(EToolType.TEXT_TRANSLATE),
      //     path: EToolType.TEXT_TRANSLATE,
      //     content: <TextTranslate />,
      //   },
    ],
  },
  {
    cnTitle: EToolType.getLabelById(EToolType.IMAGE),
    enTitle: 'Image Tools',
    path: EToolType.IMAGE,
    icon: (
      <svg
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        p-id="14209"
        width="200"
        height="200"
      >
        <path
          d="M710.698667 149.333333H313.301333A163.968 163.968 0 0 0 149.333333 313.301333v397.397334A163.968 163.968 0 0 0 313.301333 874.666667h397.397334A163.968 163.968 0 0 0 874.666667 710.698667V313.301333A163.968 163.968 0 0 0 710.698667 149.333333z m0 64A100.074667 100.074667 0 0 1 810.666667 313.301333v397.397334A100.074667 100.074667 0 0 1 710.698667 810.666667H313.301333A100.074667 100.074667 0 0 1 213.333333 710.698667V313.301333A100.074667 100.074667 0 0 1 313.301333 213.333333h397.397334z"
          p-id="14210"
        ></path>
        <path
          d="M374.954667 252.949333a114.794667 114.794667 0 0 0-114.666667 114.666667 114.794667 114.794667 0 0 0 114.666667 114.645333 114.773333 114.773333 0 0 0 114.666666-114.645333 114.773333 114.773333 0 0 0-114.666666-114.666667m0 64a50.730667 50.730667 0 0 1 50.666666 50.666667 50.730667 50.730667 0 0 1-50.666666 50.645333 50.730667 50.730667 0 0 1-50.666667-50.645333 50.730667 50.730667 0 0 1 50.666667-50.666667M440.170667 851.093333l-60.330667-21.290666a15.210667 15.210667 0 0 0-0.853333 5.034666c0-50.325333 7.68-99.456 22.528-146.026666-53.610667-43.029333-150.613333-43.946667-196.309334 0.490666l-44.586666-45.866666c64.213333-62.485333 185.621333-66.944 265.237333-15.786667a478.08 478.08 0 0 1 93.077333-130.986667 476.266667 476.266667 0 0 1 320.128-139.648l2.389334 63.957334a412.565333 412.565333 0 0 0-277.269334 120.96 411.562667 411.562667 0 0 0-121.216 292.906666c0 5.546667-0.938667 10.986667-2.816 16.256"
          p-id="14211"
        ></path>
      </svg>
    ),
    list: [
      {
        name: EToolType.getLabelById(EToolType.IMAGE_COMPRESS),
        path: EToolType.IMAGE_COMPRESS,
        content: <ImageCompress />,
      },
    ],
  },
];
