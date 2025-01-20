import { Form } from '@arco-design/web-react';
import { UsualContent } from '../ToolContent/UsualContent';
import { Input } from '@arco-design/web-react';
import { useState } from 'react';
import tinycolor from 'tinycolor2';
import { Message } from '@arco-design/web-react';
import { handleCopy } from '../../utils';
import { ColorPicker } from '@arco-design/web-react';

const FormItem = Form.Item;

export const ColorConvert = () => {
  const [colorInput, setColorInput] = useState('');
  const [convertedColors, setConvertedColors] = useState({
    hex: '',
    rgb: '',
    rgba: '',
    hsl: '',
    hsla: '',
    hsv: '',
    hsva: '',
    hex8: '',
  });

  const handleConvert = () => {
    const color = tinycolor(colorInput);

    if (!color.isValid()) {
      Message.error('转换失败：输入的颜色值无效');
      setConvertedColors({
        hex: '',
        rgb: '',
        rgba: '',
        hsl: '',
        hsla: '',
        hsv: '',
        hsva: '',
        hex8: '',
      });
      return;
    }

    const alpha = parseFloat(color.getAlpha().toFixed(2));

    const hex = color.toHexString();
    const hex8 = color.toHex8String();

    const rgb = color.toRgbString();
    const rgba = `rgba(${color.toRgb().r}, ${color.toRgb().g}, ${
      color.toRgb().b
    }, ${alpha || 1})`;

    const hsl = color.toHslString();
    const hsla = `hsla(${Math.round(color.toHsl().h)}, ${Math.round(
      color.toHsl().s * 100
    )}%, ${Math.round(color.toHsl().l * 100)}%, ${alpha || 1})`;

    const hsv = color.toHsvString();
    const hsva = `hsva(${Math.round(color.toHsv().h)}, ${Math.round(
      color.toHsv().s * 100
    )}%, ${Math.round(color.toHsv().v * 100)}%, ${alpha || 1})`;

    setConvertedColors({
      ...{
        hex,
        hex8,
        rgb,
        rgba,
        hsl,
        hsla,
        hsv,
        hsva,
      },
    });
  };

  return (
    <UsualContent>
      <div className="tool-container">
        <Form
          className="top24 tool-color-convert"
          labelAlign="left"
          size="large"
          layout="vertical"
        >
          <FormItem label="转换前的颜色">
            <Input.Search
              placeholder="输入任意颜色值"
              searchButton="转换"
              addBefore={
                <ColorPicker value={colorInput} onChange={setColorInput} />
              }
              value={colorInput}
              onChange={setColorInput}
              onSearch={handleConvert}
            />
          </FormItem>

          <FormItem label="转换后的颜色">
            <FormItem label="HEX" className="tool-color-convert-item">
              <Input.Search
                placeholder="转换后的 HEX 颜色值"
                searchButton="一键复制"
                readOnly
                disabled={!convertedColors.hex}
                value={convertedColors.hex}
                onSearch={() => handleCopy(convertedColors.hex, true)}
              />
              <Input.Search
                placeholder="转换后的 HEX8 颜色值"
                searchButton="一键复制"
                readOnly
                disabled={!convertedColors.hex8}
                value={convertedColors.hex8}
                onSearch={() => handleCopy(convertedColors.hex8, true)}
              />
            </FormItem>

            <FormItem label="RGB" className="tool-color-convert-item">
              <Input.Search
                placeholder="转换后的 RGB 颜色值"
                searchButton="一键复制"
                readOnly
                disabled={!convertedColors.rgb}
                value={convertedColors.rgb}
                onSearch={() => handleCopy(convertedColors.rgb, true)}
              />
              <Input.Search
                placeholder="转换后的 RGBA 颜色值"
                searchButton="一键复制"
                readOnly
                disabled={!convertedColors.rgba}
                value={convertedColors.rgba}
                onSearch={() => handleCopy(convertedColors.rgba, true)}
              />
            </FormItem>

            <FormItem label="HSL" className="tool-color-convert-item">
              <Input.Search
                placeholder="转换后的 HSL 颜色值"
                searchButton="一键复制"
                readOnly
                disabled={!convertedColors.hsl}
                value={convertedColors.hsl}
                onSearch={() => handleCopy(convertedColors.hsl, true)}
              />
              <Input.Search
                placeholder="转换后的 HSLA 颜色值"
                searchButton="一键复制"
                readOnly
                disabled={!convertedColors.hsla}
                value={convertedColors.hsla}
                onSearch={() => handleCopy(convertedColors.hsla, true)}
              />
            </FormItem>

            <FormItem label="HSV" className="tool-color-convert-item">
              <Input.Search
                placeholder="转换后的 HSV 颜色值"
                searchButton="一键复制"
                readOnly
                disabled={!convertedColors.hsv}
                value={convertedColors.hsv}
                onSearch={() => handleCopy(convertedColors.hsv, true)}
              />
              <Input.Search
                placeholder="转换后的 HSVA 颜色值"
                searchButton="一键复制"
                readOnly
                disabled={!convertedColors.hsva}
                value={convertedColors.hsva}
                onSearch={() => handleCopy(convertedColors.hsva, true)}
              />
            </FormItem>
          </FormItem>
        </Form>
      </div>
    </UsualContent>
  );
};
