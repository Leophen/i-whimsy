'use client';

import * as React from 'react';
import { ImageUp, Trash2, UploadCloud } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/utils';
import { isAcceptFile } from '@/lib/core/browser';

export interface SelectedImage {
  file: File;
  url: string;
  width: number;
  height: number;
  size: number;
  type: string;
  name: string;
}

export interface FileDropzoneProps {
  onFile: (file: File) => void;
  accept?: string;
  className?: string;
  hint?: string;
  /** 是否默认展示已选文件的预览（由外部传入 current） */
  current?: { name: string; size: number; url?: string } | null;
  onRemove?: () => void;
  disabled?: boolean;
}

export function FileDropzone({
  onFile,
  accept = 'image/*',
  className,
  hint,
  current,
  onRemove,
  disabled,
}: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    setError(null);
    const file = files?.[0];
    if (!file) return;
    if (!isAcceptFile(file, accept)) {
      setError(`不支持的文件类型：${file.type || file.name}`);
      return;
    }
    onFile(file);
  };

  if (current) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border border-border bg-background p-3',
          className,
        )}
      >
        <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface-2">
          {current.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.url} alt="" className="size-full object-cover" />
          ) : (
            <ImageUp className="size-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground">{current.name}</p>
          <p className="text-xs text-muted-foreground">{formatBytes(current.size)}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-50"
          >
            更换
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label="移除文件"
              className="grid size-7 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-danger/40 hover:text-danger"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-label="选择或拖拽文件上传"
        aria-describedby={error ? 'file-dropzone-error' : undefined}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        disabled={disabled}
        className={cn(
          'group flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-9',
          'transition-all duration-200',
          dragging
            ? 'border-primary bg-primary-subtle/60'
            : 'border-border-strong bg-background hover:border-primary/60 hover:bg-surface-2',
          disabled && 'pointer-events-none opacity-60',
          className,
        )}
      >
        <div
          className={cn(
            'grid size-12 place-items-center rounded-full border border-border bg-surface-2',
            'transition-transform duration-200 group-hover:scale-105',
            dragging && 'border-primary/40 bg-primary-subtle',
          )}
        >
          <UploadCloud
            className={cn('size-5', dragging ? 'text-primary' : 'text-muted-foreground')}
          />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            拖拽文件到此处，或<span className="text-primary"> 点击选择</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hint ?? '文件仅在本地浏览器处理，不会上传到任何服务器'}
          </p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && (
        <p id="file-dropzone-error" className="mt-2 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 快捷选择：从剪贴板粘贴图片
 * ------------------------------------------------------------------ */

export interface LoadedImageMeta {
  name: string;
  size: number;
  type: string;
  width: number;
  height: number;
  url: string;
  file: File;
}

/** 把 File 连同尺寸一起读出来。 */
export async function readImageFile(file: File): Promise<LoadedImageMeta> {
  const url = URL.createObjectURL(file);
  const dim = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('无法读取图片尺寸'));
    img.src = url;
  });
  return { name: file.name, size: file.size, type: file.type, ...dim, url, file };
}
