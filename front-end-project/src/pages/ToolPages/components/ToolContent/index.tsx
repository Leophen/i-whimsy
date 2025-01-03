import { Menu } from '@arco-design/web-react';
import { tools } from '../../data';
import { BackTop } from '@arco-design/web-react';
import { Button } from '@arco-design/web-react';
import { IconUp } from '@arco-design/web-react/icon';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useEffect } from 'react';
import { Empty } from '@arco-design/web-react';
import { useMemo } from 'react';

const MenuItem = Menu.Item;
const SubMenu = Menu.SubMenu;

export const ToolContent = () => {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const query = new URLSearchParams(location.search);

  /**
   * 工具类型 toolsPath
   * eg: text
   */
  const [toolsPath, setToolsPath] = useState(
    params?.toolsPath || new URL(window.location.href).pathname.split('/')[2]
  );
  useEffect(() => {
    const path =
      params?.toolsPath || new URL(window.location.href).pathname.split('/')[2];
    setToolsPath(path);
  }, [params]);

  /**
   * 当前工具类型 currentTools
   * eg: tools[0]
   */
  const currentTools = useMemo(
    () => tools.find((tool) => tool.path === toolsPath),
    [toolsPath]
  );

  /**
   * 具体工具 toolType
   * eg: textconvert
   */
  const toolType = useMemo(
    () => query.get('type') || currentTools?.list[0]?.path,
    [toolsPath, currentTools]
  );

  const handleToQuery = (toolsPath: string, toolType: string) => {
    navigate(`/tool/${toolsPath}?type=${toolType}`);
  };

  const renderContent = () => {
    if (currentTools?.list) {
      return currentTools.list.find((item) => item.path === toolType)?.content;
    }
    return <Empty />;
  };

  return (
    <section className="tools-content">
      <nav className="tools-content-nav">
        <Menu
          accordion
          defaultOpenKeys={[toolsPath]}
          defaultSelectedKeys={toolType}
          autoScrollIntoView
        >
          {tools.map((item) => (
            <SubMenu
              key={item.path}
              title={
                <div className="tools-content-nav-title">
                  {item.icon}
                  <div>{item.cnTitle}</div>
                </div>
              }
            >
              {item.list.map((it) => (
                <MenuItem
                  key={it.path}
                  onClick={() => handleToQuery(item.path, it.path)}
                >
                  {it.name}
                </MenuItem>
              ))}
            </SubMenu>
          ))}
        </Menu>
      </nav>
      <article className="tools-content-right">
        {renderContent()}

        <BackTop visibleHeight={30}>
          <Button shape="circle" type="primary" icon={<IconUp />} />
        </BackTop>
      </article>
    </section>
  );
};
