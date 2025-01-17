import { Upload, Message, Image } from '@arco-design/web-react';
import { useState, useRef } from 'react';
import { UsualContent } from '../ToolContent/UsualContent';
import { isAcceptFile } from './utils';
import 'cropperjs/dist/cropper.css';
import { Cropper } from 'react-cropper';
import { Tooltip } from '@arco-design/web-react';
import { Button } from '@arco-design/web-react';
import { IconScissor } from '@arco-design/web-react/icon';
import classNames from 'classnames';
import { Empty } from '@arco-design/web-react';
import { Radio } from '@arco-design/web-react';

const RadioGroup = Radio.Group;

const aspectRatioList = [
  {
    label: '自由比例',
    value: 0,
  },
  {
    label: '正方形',
    value: 1,
  },
  {
    label: '16:9',
    value: 16 / 9,
  },
  {
    label: '5:4',
    value: 5 / 4,
  },
  {
    label: '4:3',
    value: 4 / 3,
  },
  {
    label: '3:2',
    value: 3 / 2,
  },
];

export const ImageCrop = () => {
  const [img, setImg] = useState({
    old: {
      src: '',
    },
    new: {
      src: '',
    },
  });

  const uploadFile = useRef(null);

  // 上传显示图片操作
  const uploadImage = (file) => {
    // 限制图片大小
    if (file.size > 50 * 1024 * 1024) {
      Message.error('图片不得大于 50M，请重新上传');
    } else {
      uploadFile.current = file;
      img.old.size = (file.size / 1024).toFixed(1);

      // 回显原图
      let reader = new FileReader();
      reader.onload = (event) => {
        let curImgUrl = event.target.result;
        img.old.src = curImgUrl;
        setImg({ ...img });
      };
      reader.readAsDataURL(file);
    }
  };

  const cropperRef = useRef(null);

  const handleCrop = () => {
    if (typeof cropperRef.current.cropper !== 'undefined') {
      img.new.src = cropperRef.current.cropper.getCroppedCanvas().toDataURL();
      setImg({ ...img });
    }
  };

  const [aspectRatio, setAspectRatio] = useState(0);

  const handleChangeAspectRatio = (label) => {
    const currentVal = aspectRatioList.find(
      (item) => item.label === label
    ).value;
    setAspectRatio(currentVal);
    if (typeof cropperRef.current.cropper !== 'undefined') {
      cropperRef.current.cropper.setAspectRatio(currentVal);
    }
  };

  return (
    <UsualContent>
      <div className="tool-container">
        <div className="tool-crop-item">
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
          <h4 className="tool-content-title-small">图片裁剪</h4>

          <div className="tool-crop-show-item">
            <div className="crop-show-item">
              <section
                className={classNames(
                  'img-wrap-crop',
                  !img.old.src && 'img-wrap-crop-no-img'
                )}
              >
                <Cropper
                  src={img.old.src}
                  initialAspectRatio={aspectRatio}
                  aspectRatio={aspectRatio}
                  guides={false}
                  ref={cropperRef}
                  zoomable={false}
                />
                <Empty className="img-crop-bg" description="请先上传原图" />
              </section>
            </div>
            <Tooltip mini position="right" content="裁剪图片">
              <Button
                shape="circle"
                type="primary"
                icon={<IconScissor />}
                onClick={handleCrop}
                disabled={!img.old.src}
              />
            </Tooltip>
            <div className="crop-show-item">
              <section className="img-wrap">
                <Image
                  src={img.new.src}
                  alt="未上传原图"
                  className={classNames(img.new.src && 'image-shadow')}
                />
              </section>
            </div>
          </div>
        </section>

        <section>
          <RadioGroup
            type="button"
            name="lang"
            value={
              aspectRatioList.find((item) => item.value === aspectRatio).label
            }
            onChange={handleChangeAspectRatio}
          >
            {aspectRatioList.map((item) => (
              <Radio value={item.label}>{item.label}</Radio>
            ))}
          </RadioGroup>
        </section>
      </div>
    </UsualContent>
  );
};
