import { Card } from '@arco-design/web-react';
import { tools } from './data';
import { useNavigate } from 'react-router-dom';

const ToolPage = () => {
  const navigate = useNavigate();

  const handleClickItem = (item) => {
    navigate(`tool/${item.path}`);
  };

  return (
    <div className="tool-list">
      {tools.map((item, index) => (
        <Card
          hoverable
          className="tool-item"
          key={index}
          onClick={() => handleClickItem(item)}
        >
          <section className="tool-item-bg">{item.icon}</section>
          <footer className="tool-item-title">
            <div className="tool-item-title-cn">{item.cnTitle}</div>
            <div className="tool-item-title-en">{item.enTitle}</div>
          </footer>
        </Card>
      ))}
    </div>
  );
};

export default ToolPage;
