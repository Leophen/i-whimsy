import { Upload, Message, Image } from '@arco-design/web-react';
import { useState } from 'react';
import { UsualContent } from '../ToolContent/UsualContent';
import { useRef } from 'react';
import { isAcceptFile } from './utils';
import { prominent } from 'color.js';
import { useEffect } from 'react';
import tinycolor from 'tinycolor2';
import { Button } from '@arco-design/web-react';
import { handleCopy } from '../../utils';

export const ImageTheme = () => {
    const [src, setSrc] = useState('');

    const imgRef = useRef(null);

    // 上传显示图片操作
    const uploadImage = (file) => {
        // 限制图片大小
        if (file.size > 10 * 1024 * 1024) {
            Message.error('图片不得大于 10M，请重新上传');
        } else {
            // 回显原图
            let reader = new FileReader();
            reader.onload = (event) => {
                let curImgUrl = event.target.result;
                setSrc(curImgUrl);
            };
            reader.readAsDataURL(file);
        }
    };

    const [color, setColor] = useState({ r: 0, g: 0, b: 0 });
    const handleGetThemeColor = () => {
        const img = document.querySelector('#imgThemePreview');
        prominent(img as any, { amount: 1 })
            .then((val) => {
                color.r = val[0];
                color.g = val[1];
                color.b = val[2];
                setColor({ ...color });
            })
            .catch((err) => console.error(err));
    };

    useEffect(() => {
        const img = document.querySelector('#imgThemePreview');
        img.addEventListener('load', handleGetThemeColor);
        return () => img.removeEventListener('load', handleGetThemeColor);
    }, []);

    const getRgb = (col) => `rgb(${col.r}, ${col.g}, ${col.b})`;
    const getHex = (col) => tinycolor({ r: col.r, g: col.g, b: col.b }).toHexString();

    return (
        <UsualContent>
            <div className="tool-container">
                <div className="tool-theme-item">
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
                    <div className="tool-theme-show-item">
                        <h4 className="tool-content-title-small">图片预览</h4>
                        <div className="theme-show-item">
                            <section className="img-wrap">
                                <Image
                                    src={src}
                                    alt="未上传图片"
                                    ref={imgRef}
                                    id="imgThemePreview"
                                />
                            </section>
                        </div>
                    </div>
                </section>

                <div className="top24">
                    <h4 className="tool-content-title-small">主题色</h4>
                    <section className="tool-theme-color-block-wrap">
                        <div
                            className="tool-theme-color-block"
                            style={{ background: getRgb(color) }}
                        />

                        <section>
                            <div className="tool-theme-color-txt-wrap top12">
                                <div className="tool-theme-color-txt">
                                    rgb
                                </div>
                                <Button type='outline' disabled={!src} onClick={() => handleCopy(getRgb(color))}>{getRgb(color)}</Button>
                            </div>

                            <div className="tool-theme-color-txt-wrap top12">
                                <div className="tool-theme-color-txt">
                                    hex
                                </div>
                                <Button type='outline' disabled={!src} onClick={() => handleCopy(getHex(color))}>{getHex(color)}</Button>
                            </div>
                        </section>
                    </section>
                </div>
            </div>
        </UsualContent>
    );
};
