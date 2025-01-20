import { useEffect, useState, useMemo } from 'react';
import { Menu } from '@arco-design/web-react';
import { tools } from '../../data';
import { BackTop } from '@arco-design/web-react';
import { Button } from '@arco-design/web-react';
import { IconUp } from '@arco-design/web-react/icon';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const MenuItem = Menu.Item;
const SubMenu = Menu.SubMenu;

export const ToolContent = () => {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const query = new URLSearchParams(location.search);

  const toolsPath = useMemo(
    () =>
      params?.toolsPath || new URL(window.location.href).pathname.split('/')[2],
    [params]
  );

  const [toolType, setToolType] = useState(
    query.get('type') ||
      tools.find((tool) => tool.path === toolsPath)?.list[0]?.path
  );

  useEffect(() => {
    const newToolType =
      query.get('type') ||
      tools.find((tool) => tool.path === toolsPath)?.list[0]?.path;
    setToolType(newToolType);
  }, [location.search, toolsPath]);

  const handleToQuery = (toolsPath: string, toolType: string) => {
    navigate(`/tool/${toolsPath}?type=${toolType}`);
  };

  const renderContent = () => {
    const tool = tools.find((tool) => tool.path === toolsPath);
    return tool?.list.find((item) => item.path === toolType)?.content;
  };

  return (
    <section className="tools-content">
      <nav className="tools-content-nav">
        <Menu
          autoOpen
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
