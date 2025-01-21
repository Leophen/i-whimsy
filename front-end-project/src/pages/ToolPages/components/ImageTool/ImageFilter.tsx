import { Upload, Message, Slider, Image } from '@arco-design/web-react';
import { useState } from 'react';
import { UsualContent } from '../ToolContent/UsualContent';
import { useRef } from 'react';
import { isAcceptFile } from './utils';
import { Form } from '@arco-design/web-react';
import { Jimp, JimpInstance, JimpMime } from 'jimp';

const FormItem = Form.Item;

export const ImageFilter = () => {
  const [img, setImg] = useState({
    /**
     * 原图地址
     */
    oldSrc: '',
    /**
     * 处理后图片地址
     */
    newSrc: '',

    /**
     * 亮度
     */
    brightness: 1,
    /**
     * 对比度
     */
    contrast: 0,
    /**
     * 灰度
     */
    desaturate: 0,
    /**
     * 鲜明度
     */
    saturate: 0,
    /**
     * 色相
     */
    hue: 0,
  });

  const updateImage = async (image: JimpInstance) => {
    const newBuffer = await image.getBuffer(JimpMime.jpeg);
    const newImage = await Jimp.read(newBuffer);
    newImage
      .brightness(img.brightness)
      .contrast(img.contrast)
      .color([
        { apply: 'saturate', params: [img.saturate] },
        { apply: 'desaturate', params: [img.desaturate] },
        { apply: 'hue', params: [img.hue] },
      ]);

    const newUrl = await newImage?.getBase64(JimpMime.jpeg);

    img.newSrc = newUrl;
    setImg({ ...img });
  };

  function fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result); // 结果为 ArrayBuffer
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file); // 读取为 ArrayBuffer
    });
  }

  // 上传显示图片操作
  const uploadImage = async (originFile) => {
    // 限制图片大小
    if (originFile.size > 50 * 1024 * 1024) {
      Message.error('图片不得大于 50M，请重新上传');
    } else {
      const buffer = await fileToArrayBuffer(originFile);
      const image = await Jimp.read(buffer as ArrayBuffer);
      const url = await image?.getBase64(JimpMime.jpeg);

      img.oldSrc = url;
      setImg({ ...img });
      updateImage(image as JimpInstance);
      return false;
    }
  };

  const handleUsualSliderChange = async (key, value) => {
    img[key] = value;
    setImg({ ...img });
    if (img.oldSrc) {
      const oldImage = await Jimp.read(img.oldSrc);
      updateImage(oldImage as JimpInstance);
    }
  };

  return (
    <UsualContent>
      <div className="tool-container">
        <div className="tool-compress-item">
          <h4 className="tool-content-title-small">上传原图</h4>
          <Upload
            drag
            multiple
            accept="image/*"
            onDrop={(e) => {
              let uploadFile = e.dataTransfer.files[0];
              if (isAcceptFile(uploadFile, 'image/*')) {
                return;
              } else {
                Message.error('文件类型错误，请重新上传');
              }
            }}
            onChange={(_, currentFile) => {
              uploadImage(currentFile.originFile);
            }}
            tip="Only pictures can be uploaded"
          />
        </div>

        <section className="top24 bottom24">
          <h4 className="tool-content-title-small">图片预览</h4>

          <div className="tool-compress-show-item">
            <div className="compress-show-item">
              <section className="img-wrap">
                <Image src={img.oldSrc} alt="未上传原图" />
              </section>
            </div>
            <div className="compress-show-item">
              <section className="img-wrap">
                <Image src={img.newSrc} alt="未上传原图" />
              </section>
            </div>
          </div>
        </section>

        <section className="top24">
          <h4 className="tool-content-title-small">
            滤镜调整{!img.oldSrc && <>（上传原图后可调整图片）</>}
          </h4>

          <Form
            className="top24 tool-color-convert"
            labelAlign="left"
            size="large"
            layout="vertical"
          >
            <FormItem label="亮度">
              <Slider
                min={-1}
                max={1}
                step={0.1}
                showTicks
                showInput
                value={img.brightness - 1}
                disabled={!img.oldSrc}
                onChange={(val) => {
                  img.brightness = val + 1;
                  setImg({ ...img });
                }}
                onAfterChange={(val) =>
                  handleUsualSliderChange('brightness', val + 1)
                }
              />
            </FormItem>

            <FormItem label="对比度">
              <Slider
                min={-1}
                max={1}
                step={0.1}
                showTicks
                showInput
                value={img.contrast}
                disabled={!img.oldSrc}
                onChange={(val) => {
                  img.contrast = val;
                  setImg({ ...img });
                }}
                onAfterChange={(val) =>
                  handleUsualSliderChange('contrast', val)
                }
              />
            </FormItem>

            <FormItem label="灰度">
              <Slider
                min={0}
                max={100}
                step={1}
                showTicks
                showInput
                value={img.desaturate}
                disabled={!img.oldSrc}
                onChange={(val) => {
                  img.desaturate = val;
                  setImg({ ...img });
                }}
                onAfterChange={(val) =>
                  handleUsualSliderChange('desaturate', val)
                }
              />
            </FormItem>

            <FormItem label="鲜明度">
              <Slider
                min={0}
                max={100}
                step={1}
                showTicks
                showInput
                value={img.saturate}
                disabled={!img.oldSrc}
                onChange={(val) => {
                  img.saturate = val;
                  setImg({ ...img });
                }}
                onAfterChange={(val) =>
                  handleUsualSliderChange('saturate', val)
                }
              />
            </FormItem>

            <FormItem label="色相">
              <Slider
                min={-360}
                max={360}
                step={1}
                showTicks
                showInput
                value={img.hue}
                disabled={!img.oldSrc}
                onChange={(val) => {
                  img.hue = val;
                  setImg({ ...img });
                }}
                onAfterChange={(val) => handleUsualSliderChange('hue', val)}
              />
            </FormItem>
          </Form>
        </section>
      </div>
    </UsualContent>
  );
};
