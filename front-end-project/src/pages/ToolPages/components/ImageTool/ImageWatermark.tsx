import { Upload, Message, Slider } from '@arco-design/web-react';
import { useState } from 'react';
import { UsualContent } from '../ToolContent/UsualContent';
import { fileToArrayBuffer, isAcceptFile } from './utils';
import { Form } from '@arco-design/web-react';
import { Jimp, JimpMime } from 'jimp';
import { Input } from '@arco-design/web-react';
import { useRef } from 'react';
import { ColorPicker } from '@arco-design/web-react';

const FormItem = Form.Item;

export const ImageWatermark = () => {
  const canvasRef = useRef(null);

  const [img, setImg] = useState({
    /**
     * 原图地址
     */
    oldSrc: '',
    /**
     * 水印文本
     */
    watermarkText: '水印',
    /**
     * 水印颜色
     */
    color: '#fff',
    /**
     * 水印间距
     */
    spacing: 100,
    /**
     * 水印文本大小
     */
    fontSize: 20,
    /**
     * 水印透明度
     */
    opacity: 0.6,
  });

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
      updateImage({ ...img });
      return false;
    }
  };

  const updateImage = (img: any) => {
    if (canvasRef.current && img.oldSrc) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const newImg = new Image();
      newImg.src = img.oldSrc;

      newImg.onload = () => {
        canvas.width = newImg.width;
        canvas.height = newImg.height;
        ctx.drawImage(newImg, 0, 0);
        ctx.font = `${img.fontSize}px Arial`;
        ctx.fillStyle = img.color;
        ctx.globalAlpha = img.opacity;

        const xCount = Math.ceil(
          canvas.width /
            (ctx.measureText(img.watermarkText).width + img.spacing)
        );
        const yCount = Math.ceil(canvas.height / (img.fontSize + img.spacing));

        // 计算水印的旋转角度
        const angle = (Math.PI / 180) * 45; // 45度转换为弧度

        for (let x = 0; x < xCount; x++) {
          for (let y = 0; y < yCount; y++) {
            const xPos =
              x * (ctx.measureText(img.watermarkText).width + img.spacing);
            const yPos = y * (img.fontSize + img.spacing);

            // 保存当前状态
            ctx.save();
            // 移动到水印位置
            ctx.translate(
              xPos + img.fontSize / 2 - 5,
              yPos + img.fontSize / 2 - 5
            );
            // 旋转
            ctx.rotate(angle);
            // 绘制水印
            ctx.fillText(img.watermarkText, 0, 0);
            // 恢复状态
            ctx.restore();
          }
        }
      };
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
              <section className="img-wrap watermark-img-wrap">
                {!img.oldSrc ? (
                  <div className="watermark-img-txt">请先上传图片</div>
                ) : (
                  <canvas ref={canvasRef} className="watermark-canvas" />
                )}
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
                value={img.watermarkText}
                onChange={(val) => {
                  img.watermarkText = val;
                  setImg({ ...img });
                  if (img.oldSrc) {
                    updateImage({ ...img });
                  }
                }}
              />
            </FormItem>

            <FormItem label="水印透明度">
              <Slider
                min={0}
                max={1}
                step={0.1}
                showTicks
                showInput
                value={img.opacity}
                disabled={!img.oldSrc}
                onChange={(value) => {
                  img.opacity = value;
                  setImg({ ...img });
                }}
                onAfterChange={(val) => {
                  img.opacity = val;
                  setImg({ ...img });
                  if (img.oldSrc) {
                    updateImage({ ...img });
                  }
                }}
              />
            </FormItem>

            <FormItem label="水印间距">
              <Slider
                min={0}
                max={200}
                step={5}
                showTicks
                showInput
                value={img.spacing}
                disabled={!img.oldSrc}
                onChange={(value) => {
                  img.spacing = value;
                  setImg({ ...img });
                }}
                onAfterChange={(val) => {
                  img.spacing = val;
                  setImg({ ...img });
                  if (img.oldSrc) {
                    updateImage({ ...img });
                  }
                }}
              />
            </FormItem>

            <FormItem label="水印文字大小">
              <Slider
                min={8}
                max={72}
                step={2}
                showTicks
                showInput
                value={img.fontSize}
                disabled={!img.oldSrc}
                onChange={(value) => {
                  img.fontSize = value;
                  setImg({ ...img });
                }}
                onAfterChange={(val) => {
                  img.fontSize = val;
                  setImg({ ...img });
                  if (img.oldSrc) {
                    updateImage({ ...img });
                  }
                }}
              />
            </FormItem>

            <FormItem label="水印颜色">
              <ColorPicker
                value={img.color}
                disabled={!img.oldSrc}
                className="watermark-tool-color-picker"
                onChange={(value) => {
                  img.color = value;
                  setImg({ ...img });
                  if (img.oldSrc) {
                    updateImage({ ...img });
                  }
                }}
                showText
              />
            </FormItem>
          </Form>
        </section>
      </div>
    </UsualContent>
  );
};
