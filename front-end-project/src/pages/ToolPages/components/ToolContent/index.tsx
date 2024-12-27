import { Menu } from '@arco-design/web-react';
import { tools } from '../../data';
import { BackTop } from '@arco-design/web-react';
import { Button } from '@arco-design/web-react';
import { IconUp } from '@arco-design/web-react/icon';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

const MenuItem = Menu.Item;
const SubMenu = Menu.SubMenu;

export const ToolContent = () => {
  const navigate = useNavigate();

  /**
   * 工具类型 toolsPath
   * eg: text
   */
  const params = useParams();
  let toolsPath = params?.toolsPath || '';
  if (!toolsPath) {
    const url = new URL(window.location.href);

    const pathSegments = url.pathname.split('/');

    toolsPath = pathSegments[2];
  }

  /**
   * 当前工具类型 currentTools
   * eg: tools[0]
   */
  const currentTools = tools.find((tools) => tools.path === toolsPath);

  const handleToQuery = (toolsPath: string, toolType: string) => {
    navigate(`/tool/${toolsPath}?type=${toolType}`);
  };

  /**
   * 具体工具 toolType
   * eg: daxiaoxie
   */
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  let toolType = query.get('type');
  if (!toolType) {
    toolType = currentTools.list[0].path;
  }

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
        {currentTools.list.find((item) => item.path === toolType).content}

        <BackTop visibleHeight={30}>
          <Button shape="circle" type="primary" icon={<IconUp />} />
        </BackTop>
      </article>
    </section>
  );
};
