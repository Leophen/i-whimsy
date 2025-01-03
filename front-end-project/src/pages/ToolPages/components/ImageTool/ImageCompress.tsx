import { Input, Upload, Message, Slider, Image } from '@arco-design/web-react';
import { useState } from 'react';
import { UsualContent } from '../ToolContent/UsualContent';
import Compressor from 'compressorjs';
import { useRef } from 'react';
import { Table } from '@arco-design/web-react';
import { isAcceptFile } from './utils';

const columns = [
  {
    title: '压缩率',
    dataIndex: 'quality',
  },
  {
    title: '原图大小',
    dataIndex: 'oldsize',
  },
  {
    title: '压缩后大小',
    dataIndex: 'newsize',
  },
  {
    title: '压缩大小比',
    dataIndex: 'ratio',
  },
  {
    title: '描述',
    dataIndex: 'desp',
  },
];

const data = [
  {
    key: '1',
    quality: '0',
    oldsize: '2.12 MB',
    newsize: '114.61 KB',
    ratio: '94.72%',
    desp: '-',
  },
  {
    key: '2',
    quality: '20%',
    oldsize: '2.12 MB',
    newsize: '349.57 KB',
    ratio: '83.90%',
    desp: '-',
  },
  {
    key: '3',
    quality: '40%',
    oldsize: '2.12 MB',
    newsize: '517.10 KB',
    ratio: '76.18%',
    desp: '-',
  },
  {
    key: '4',
    quality: '60%',
    oldsize: '2.12 MB',
    newsize: '694.99 KB',
    ratio: '67.99%',
    desp: '推荐',
  },
  {
    key: '5',
    quality: '80%',
    oldsize: '2.12 MB',
    newsize: '1.14 MB',
    ratio: '46.41%',
    desp: '推荐',
  },
  {
    key: '6',
    quality: '100%',
    oldsize: '2.12 MB',
    newsize: '2.12 MB',
    ratio: '0%',
    desp: '不推荐',
  },
];

export const ImageCompress = () => {
  const [img, setImg] = useState({
    old: {
      src: '',
      size: 0,
    },
    new: {
      src: '',
      size: 0,
    },
  });

  const [compressVal, setCompressVal] = useState(0.8);

  const updateNewImg = (file: File, compress: number) => {
    new Compressor(file, {
      quality: compress,
      success(result) {
        img.new.src = URL.createObjectURL(result);
        img.new.size = (result.size / 1024).toFixed(1);
        setImg({ ...img });
      },
      error(err) {
        Message.error(err.message);
        img.new.src = '';
        img.new.size = 0;
        setImg({ ...img });
      },
    });
  };

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

      // 压缩图片
      updateNewImg(file, compressVal);
    }
  };

  const handleChangeCompressVal = (val) => {
    updateNewImg(uploadFile.current, val);
  };

  const formatSize = (size: number) => {
    if (size < 1024) {
      return `${size}KB`;
    } else {
      return `${(size / 1024).toFixed(1)}MB`;
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
                <Image src={img.old.src} alt="未上传原图" />
              </section>
              <p>原图：{formatSize(img.old.size)}</p>
            </div>
            <div className="compress-show-item">
              <section className="img-wrap">
                <Image src={img.new.src} alt="未上传原图" />
              </section>
              <p>压缩后：{formatSize(img.new.size)}</p>
            </div>
          </div>
        </section>

        <section className="top24">
          <h4 className="tool-content-title-small">
            压缩率{!img.old.src && <>（上传原图后可调整压缩率）</>}
          </h4>
          <Slider
            value={compressVal}
            min={0.1}
            max={1}
            step={0.1}
            onChange={setCompressVal}
            onAfterChange={handleChangeCompressVal}
            formatTooltip={(val) => <span>{val * 100}%</span>}
            disabled={!img.old.src}
            showTicks
          />
        </section>

        <section className="top24">
          <h4 className="tool-content-title-small">说明</h4>
          <div className="bottom12">
            输出图片的质量取决于压缩率的设置，压缩率默认值为
            80%，该值不代表图片大小的压缩比例，具体压缩比例参考下表：
          </div>
          <Table columns={columns} data={data} pagination={false} />
        </section>
      </div>
    </UsualContent>
  );
};
