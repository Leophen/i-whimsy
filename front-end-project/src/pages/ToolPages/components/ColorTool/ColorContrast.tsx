import { Form } from '@arco-design/web-react';
import { UsualContent } from '../ToolContent/UsualContent';
import { ColorPicker } from '@arco-design/web-react';
import { IconLanguage } from '@arco-design/web-react/icon';
import { useState } from 'react';
import { Tag } from '@arco-design/web-react';

const tips = [
  {
    title: '关于 WCAG',
    content: `在 WCAG（Web Content Accessibility Guidelines）Web 内容无障碍指南中，有一系列关于在使用对比度和颜色的准则，其中关于文本和背景颜色的对比度，要求文本和背景之间的对比度至少为 4.5:1，以保证文本的可读性，避免对视觉障碍人士造成困扰。`,
  },
];

const FormItem = Form.Item;

function HexToDec(c) {
  if (RegExp(/^[a-f|0-9]+$/i).test(c)) {
    return parseInt(c, 16);
  }
}

function getsRGB(c) {
  c = HexToDec(c) / 255;
  c = c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return c;
}

function getL(c) {
  const x = 0.2126 * getsRGB(c.substr(0, 2));
  const y = 0.7152 * getsRGB(c.substr(2, 2));
  const z = 0.0722 * getsRGB(c.substr(4, 2));

  return x + y + z;
}

// Adapted from https://marcodiiga.github.io/rgba-to-rgb-conversion
function RGBAtoRGB(fc, bc) {
  // fc and bc are hex values, without the leading #
  const fa = {
    r: HexToDec(fc.substr(0, 2)),
    g: HexToDec(fc.substr(2, 2)),
    b: HexToDec(fc.substr(4, 2)),
    a: HexToDec(fc.substr(6, 2)) / 255,
  };
  const ba = {
    r: HexToDec(bc.substr(0, 2)),
    g: HexToDec(bc.substr(2, 2)),
    b: HexToDec(bc.substr(4, 2)),
  };
  var a = fa.a;
  if (isNaN(a)) a = 1;
  var modR = Math.round((1 - a) * ba.r + a * fa.r);
  var modG = Math.round((1 - a) * ba.g + a * fa.g);
  var modB = Math.round((1 - a) * ba.b + a * fa.b);
  var modColor =
    ('0' + modR.toString(16)).slice(-2) +
    ('0' + modG.toString(16)).slice(-2) +
    ('0' + modB.toString(16)).slice(-2);
  return modColor;
}

function Dec2(num) {
  num = String(num);
  if (num.indexOf('.') !== -1) {
    var numarr = num.split('.');
    if (numarr.length == 1) {
      return Number(num);
    } else {
      return Number(
        numarr[0] + '.' + numarr[1].charAt(0) + numarr[1].charAt(1)
      );
    }
  } else {
    return Number(num);
  }
}

function checkContrast(color) {
  const foreColor = color.foreground.split('#')[1];
  const backColor = color.background.split('#')[1];
  var fMod = RGBAtoRGB(foreColor, backColor);

  var L1 = getL(fMod),
    L2 = getL(backColor),
    ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);

  const res = Dec2((ratio * 100) / 100);

  return {
    ratio: res,
    normalAAA: res >= 7,
    normalAA: res >= 4.5,
    bigAAA: res >= 4.5,
    bigAA: res >= 3,
    uiAA: res >= 3,
  };
}

export const ColorContrast = () => {
  const [color, setColor] = useState({
    foreground: '#ffffff',
    background: '#000000',
  });

  const getWCAGTag = (level: string, isPass: boolean) => (
    <div className="tool-color-contrast-info">
      <span>WCAG {level}:</span>
      <Tag color={isPass ? 'green' : 'red'} bordered>
        {isPass ? 'Pass' : 'Fail'}
      </Tag>
    </div>
  );

  return (
    <UsualContent tips={tips}>
      <div className="tool-container">
        <Form
          className="top24 tool-color-contrast"
          labelAlign="left"
          size="large"
          layout="vertical"
        >
          <FormItem label="前景色 Foreground">
            <ColorPicker
              value={color.foreground}
              onChange={(val) => setColor({ ...color, foreground: val })}
              showText
              triggerProps={{
                position: 'rt',
              }}
            />
          </FormItem>
          <FormItem label="背景色 Background">
            <ColorPicker
              value={color.background}
              onChange={(val) => setColor({ ...color, background: val })}
              showText
              triggerProps={{
                position: 'rt',
              }}
            />
          </FormItem>
          <FormItem label="对比度 Contrast Ratio">
            <div
              className="tool-color-contrast-ratio"
              style={{
                borderColor:
                  checkContrast(color).ratio >= 4.5
                    ? 'rgb(var(--green-6))'
                    : 'var(--border-color)',
              }}
            >
              {checkContrast(color).ratio}:1
            </div>
          </FormItem>
          <FormItem label="预览">
            <section className="tool-color-contrast-preview">
              <FormItem label="▶ Normal Text 普通文本效果">
                {getWCAGTag('AA', checkContrast(color).normalAA)}
                {getWCAGTag('AAA', checkContrast(color).normalAAA)}
                <div
                  className="tool-color-contrast-block"
                  style={{ backgroundColor: color.background }}
                >
                  <span
                    className="tool-color-contrast-small-txt"
                    style={{ color: color.foreground }}
                  >
                    Choose a foreground and background color in Color Picker.
                  </span>
                </div>
              </FormItem>
              <FormItem label="▶ Large Text 大文本效果">
                {getWCAGTag('AA', checkContrast(color).bigAA)}
                {getWCAGTag('AAA', checkContrast(color).bigAAA)}
                <div
                  className="tool-color-contrast-block"
                  style={{ backgroundColor: color.background }}
                >
                  <span
                    className="tool-color-contrast-large-txt"
                    style={{ color: color.foreground }}
                  >
                    Choose a foreground and background color in Color Picker.
                  </span>
                </div>
              </FormItem>
              <FormItem label="▶ Interface Components 组件交互效果">
                {getWCAGTag('AA', checkContrast(color).uiAA)}
                <div
                  className="tool-color-contrast-block"
                  style={{ backgroundColor: color.background }}
                >
                  <IconLanguage style={{ color: color.foreground }} />
                  <input
                    type="text"
                    className="tool-color-contrast-input"
                    defaultValue="Text Input"
                    style={{ border: `2px solid ${color.foreground}` }}
                  />
                </div>
              </FormItem>
            </section>
          </FormItem>
        </Form>
      </div>
    </UsualContent>
  );
};
