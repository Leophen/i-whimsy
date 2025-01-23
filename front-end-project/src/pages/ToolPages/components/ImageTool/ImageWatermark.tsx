import { Upload, Message, Slider, Image } from '@arco-design/web-react';
import { useState } from 'react';
import { UsualContent } from '../ToolContent/UsualContent';
import { fileToArrayBuffer, isAcceptFile } from './utils';
import { Form } from '@arco-design/web-react';
import {
  HorizontalAlign,
  Jimp,
  JimpInstance,
  JimpMime,
  loadFont,
  VerticalAlign,
} from 'jimp';
import { Input } from '@arco-design/web-react';

const FormItem = Form.Item;

export const ImageWatermark = () => {
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
    // const newBuffer = await image.getBuffer(JimpMime.jpeg);
    // const newImage = await Jimp.read(newBuffer);
    // const font = await loadFont(OpenSans32Black);
    // newImage.print({
    //   font,
    //   x: 10,
    //   y: 10,
    //   text: {
    //     text: watermarkText,
    //     alignmentX: HorizontalAlign.LEFT,
    //     alignmentY: VerticalAlign.TOP,
    //   },
    //   maxWidth: newImage.bitmap.width,
    //   maxHeight: newImage.bitmap.height,
    // });
    // const newUrl = await newImage?.getBase64(JimpMime.jpeg);
    // img.newSrc = newUrl;
    // setImg({ ...img });
  };

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

  const [watermarkText, setWatermarkText] = useState('水印');
  const [opacity, setOpacity] = useState(0.5);

  const handleChangeOpacity = async (value) => {
    setOpacity(value / 100);
    // if (img.oldSrc) {
    //   const oldImage = await Jimp.read(img.oldSrc);
    //   updateImage(oldImage as JimpInstance);
    // }
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
            添加水印{!img.oldSrc && <>（上传原图后可添加水印）</>}
          </h4>

          <Form
            className="top24 tool-color-convert"
            labelAlign="left"
            size="large"
            layout="vertical"
          >
            <FormItem label="水印文本">
              <Input
                value={watermarkText}
                onChange={async (val) => {
                  setWatermarkText(val);
                  //   if (img.oldSrc) {
                  //     const oldImage = await Jimp.read(img.oldSrc);
                  //     updateImage(oldImage as JimpInstance);
                  //   }
                }}
              />
            </FormItem>

            <FormItem label="水印透明度">
              <Slider
                marks={{ 0: '0%', 100: '100%' }}
                showTicks
                showInput
                value={opacity * 100}
                disabled={!img.oldSrc}
                onChange={(value) => setOpacity(value / 100)}
                onAfterChange={handleChangeOpacity}
              />
            </FormItem>
          </Form>
        </section>
      </div>
    </UsualContent>
  );
};
