import { TextConvert } from './components/TextTool/TextConvert';
import { TextCount } from './components/TextTool/TextCount';
import { TextChange } from './components/TextTool/TextChange';
import { EToolType } from '../../enums';
import { ImageCompress } from './components/ImageTool/ImageCompress';
import { ImageCrop } from './components/ImageTool/ImageCrop';
import { ImageFilter } from './components/ImageTool/ImageFilter';
import { ImageWatermark } from './components/ImageTool/ImageWatermark';
import { ImageTheme } from './components/ImageTool/ImageTheme';
import { ColorContrast } from './components/ColorTool/ColorContrast';
import { ColorConvert } from './components/ColorTool/ColorConvert';
import { TimeCompute } from './components/TimeTool/TimeCompute';
import { TimeCalculate } from './components/TimeTool/TimeCalculate';
// import { TextTranslate } from './components/TextTool/TextTranslate';

export interface Tools {
  cnTitle: string;
  enTitle: string;
  path: typeof EToolType.idsEnum;
  icon: React.ReactNode;
  list: {
    name: string;
    path: typeof EToolType.idsEnum;
    content: React.ReactNode;
  }[];
}

export const tools: Tools[] = [
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
      {
        name: EToolType.getLabelById(EToolType.IMAGE_CROP),
        path: EToolType.IMAGE_CROP,
        content: <ImageCrop />,
      },
      {
        name: EToolType.getLabelById(EToolType.IMAGE_FILTER),
        path: EToolType.IMAGE_FILTER,
        content: <ImageFilter />,
      },
      {
        name: EToolType.getLabelById(EToolType.IMAGE_WATERMARK),
        path: EToolType.IMAGE_WATERMARK,
        content: <ImageWatermark />,
      },
      {
        name: EToolType.getLabelById(EToolType.IMAGE_THEME),
        path: EToolType.IMAGE_THEME,
        content: <ImageTheme />,
      },
    ],
  },
  {
    cnTitle: EToolType.getLabelById(EToolType.COLOR),
    enTitle: 'Color Tools',
    path: EToolType.COLOR,
    icon: (
      <svg
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        p-id="2374"
        width="200"
        height="200"
      >
        <path
          d="M0 524.288C0 218.794667 283.392 54.997333 595.114667 89.984 845.738667 118.186667 1024 290.005333 1024 501.632c0 112.170667-55.893333 161.450667-166.272 191.701333-7.509333 2.090667-14.592 3.882667-28.373333 7.466667-47.957333 12.458667-66.986667 20.778667-75.093334 32.426667-9.984 14.506667-10.794667 24.789333-5.888 56.746666 1.706667 11.392 2.389333 16.341333 3.072 23.210667 5.546667 59.221333-18.517333 103.850667-88.618666 144.298667-80.725333 46.634667-245.12 22.528-388.693334-51.882667C107.690667 819.328 0 684.458667 0 524.288z m586.410667-354.986667c-270.762667-30.506667-507.648 106.410667-507.648 354.986667 0 125.44 88.576 236.373333 231.253333 310.357333 122.325333 63.402667 261.461333 83.84 313.728 53.632 43.818667-25.301333 51.84-40.234667 49.28-67.541333a304.768 304.768 0 0 0-2.474667-18.602667c-7.765333-50.602667-5.674667-78.677333 19.242667-114.688 23.125333-33.493333 52.736-46.336 119.893333-63.829333 13.909333-3.626667 20.48-5.333333 27.477334-7.253333 79.957333-21.888 108.074667-46.634667 108.074666-114.773334 0-167.936-145.749333-308.394667-358.826666-332.373333v0.042667z m-333.653334 321.749334c36.224 0 65.621333 29.738667 65.621334 66.432s-29.44 66.432-65.664 66.432c-36.266667 0-65.621333-29.738667-65.621334-66.432s29.354667-66.432 65.621334-66.432z m377.386667-202.069334c36.266667 0 65.664 29.738667 65.664 66.432s-29.44 66.432-65.664 66.432c-36.266667 0-65.621333-29.781333-65.621333-66.432 0-36.693333 29.397333-66.432 65.621333-66.432z m-262.570667-3.84c23.466667 0 45.141333 12.672 56.874667 33.194667a67.114667 67.114667 0 0 1 0 66.432 65.493333 65.493333 0 0 1-56.874667 33.237333c-36.266667 0-65.621333-29.738667-65.621333-66.432s29.397333-66.432 65.621333-66.432z"
          fill="#909399"
          p-id="2375"
        ></path>
      </svg>
    ),
    list: [
      {
        name: EToolType.getLabelById(EToolType.COLOR_CONVERT),
        path: EToolType.COLOR_CONVERT,
        content: <ColorConvert />,
      },
      {
        name: EToolType.getLabelById(EToolType.COLOR_CONTRAST),
        path: EToolType.COLOR_CONTRAST,
        content: <ColorContrast />,
      },
    ],
  },
  {
    cnTitle: EToolType.getLabelById(EToolType.TIME),
    enTitle: 'Time Tools',
    path: EToolType.TIME,
    icon: (
      <svg
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        p-id="14974"
        width="200"
        height="200"
      >
        <path
          d="M688.2304 147.4048v-30.1056c0-14.1312-11.4688-25.6-25.6-25.6s-25.6 11.4688-25.6 25.6v29.44h-270.848v-29.44c0-14.1312-11.4688-25.6-25.6-25.6s-25.6 11.4688-25.6 25.6v30.0544C197.12 155.5456 103.7312 253.952 103.7312 373.8112v338.8416c0 125.184 101.8368 227.072 227.072 227.072h341.2992c125.184 0 227.072-101.8368 227.072-227.072v-105.7792c0-14.1312-11.4688-25.6-25.6-25.6s-25.6 11.4688-25.6 25.6v105.7792c0 96.9728-78.8992 175.872-175.872 175.872H330.8032c-96.9728 0-175.872-78.8992-175.872-175.872V439.9616h692.992v11.9808c0 14.1312 11.4688 25.6 25.6 25.6s25.6-11.4688 25.6-25.6V373.8112c0-119.7568-93.2352-218.112-210.8928-226.4064zM154.9312 388.7616v-14.8992c0-91.648 70.4512-167.0656 160.0512-175.104v42.24c0 14.1312 11.4688 25.6 25.6 25.6s25.6-11.4688 25.6-25.6v-43.008h270.848v43.008c0 14.1312 11.4688 25.6 25.6 25.6s25.6-11.4688 25.6-25.6v-42.24c89.4464 8.192 159.744 83.5584 159.744 175.104v14.8992H154.9312z"
          fill="#44454A"
          p-id="14975"
        ></path>
        <path
          d="M873.5232 500.1216c-14.1312 0-25.6 11.4688-25.6 25.6v5.4272c0 14.1312 11.4688 25.6 25.6 25.6s25.6-11.4688 25.6-25.6v-5.4272c0-14.1312-11.4688-25.6-25.6-25.6zM325.4784 536.4736c-18.5344 0-33.536 15.0016-33.536 33.536s15.0016 33.536 33.536 33.536c18.5344 0 33.536-15.0016 33.536-33.536s-15.0016-33.536-33.536-33.536z"
          fill="#44454A"
          p-id="14976"
        ></path>
        <path
          d="M503.7568 570.0096m-33.536 0a33.536 33.536 0 1 0 67.072 0 33.536 33.536 0 1 0-67.072 0Z"
          fill="#44454A"
          p-id="14977"
        ></path>
        <path
          d="M679.424 536.4736c-18.5344 0-33.536 15.0016-33.536 33.536s15.0016 33.536 33.536 33.536 33.536-15.0016 33.536-33.536-15.0016-33.536-33.536-33.536zM325.4784 695.1424c-18.5344 0-33.536 15.0016-33.536 33.536s15.0016 33.536 33.536 33.536c18.5344 0 33.536-15.0016 33.536-33.536s-15.0016-33.536-33.536-33.536z"
          fill="#44454A"
          p-id="14978"
        ></path>
        <path
          d="M503.7568 728.7296m-33.536 0a33.536 33.536 0 1 0 67.072 0 33.536 33.536 0 1 0-67.072 0Z"
          fill="#44454A"
          p-id="14979"
        ></path>
        <path
          d="M679.424 695.1424c-18.5344 0-33.536 15.0016-33.536 33.536s15.0016 33.536 33.536 33.536 33.536-15.0016 33.536-33.536-15.0016-33.536-33.536-33.536z"
          fill="#44454A"
          p-id="14980"
        ></path>
      </svg>
    ),
    list: [
      {
        name: EToolType.getLabelById(EToolType.TIME_COMPUTE),
        path: EToolType.TIME_COMPUTE,
        content: <TimeCompute />,
      },
      {
        name: EToolType.getLabelById(EToolType.TIME_CALCULATE),
        path: EToolType.TIME_CALCULATE,
        content: <TimeCalculate />,
      },
    ],
  },
];
