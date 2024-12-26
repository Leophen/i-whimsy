import '@wangeditor/editor/dist/css/style.css' // 引入 css
import { useState, useEffect } from 'react'
import { Editor, Toolbar } from '@wangeditor/editor-for-react'
import { IEditorConfig, IToolbarConfig } from '@wangeditor/editor'

export interface ComposeEditorType {
  /**
   * 编辑器内容
   */
  value: string
  /**
   * 修改时触发
   */
  onChange: (val: string) => void
}

const ComposeEditor = (props: ComposeEditorType) => {
  const {
    value = '',
    onChange
  } = props

  // editor 实例
  const [editor, setEditor] = useState(null)   // TS 语法

  // 工具栏配置
  const toolbarConfig: Partial<IToolbarConfig> = {
    toolbarKeys: [
      'blockquote',
      'headerSelect',
      '|',
      'bold',
      'underline',
      'italic',
      'through',
      'color',
      'bgColor',
      'clearStyle',
      '|',
      'bulletedList',
      'numberedList',
      'justifyLeft',
      'justifyCenter',
      'justifyRight',
      '|',
      'insertLink',
      'insertImage',
      'emotion',
      '|',
      'insertTable',
      'code',
      'codeBlock',
    ]
  }  // TS 语法

  // 编辑器配置
  const editorConfig: Partial<IEditorConfig> = {    // TS 语法
    placeholder: '请输入博客内容'
  }

  // 及时销毁 editor ，重要！
  useEffect(() => {
    return () => {
      if (editor == null) return
      editor.destroy()
      setEditor(null)
    }
  }, [editor])

  return (
    <div className="blog-edit-editor">
      <Toolbar
        editor={editor}
        defaultConfig={toolbarConfig}
        mode="simple"
        className='blog-edit-editor-header'
      />
      <Editor
        defaultConfig={editorConfig}
        value={value}
        onCreated={setEditor}
        onChange={editor => onChange?.(editor.getHtml())}
        mode="default"
        className='blog-edit-editor-content'
      />
    </div>
  )
}

export default ComposeEditor