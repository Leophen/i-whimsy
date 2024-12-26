import { Card } from '@arco-design/web-react';
import { tools } from './data';

const ToolPage = () => {
  return (
    <div className="tool-list">
      {tools.map((item, index) => (
        <Card hoverable className="tool-item" key={index}>
          <section className="tool-item-bg">{item.bg}</section>
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
