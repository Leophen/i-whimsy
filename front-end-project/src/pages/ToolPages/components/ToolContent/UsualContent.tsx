import { Alert } from '@arco-design/web-react';
import { useLocation } from 'react-router-dom';
import { EToolType } from '../../../../enums';

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

export const UsualContent = (props) => {
  const { children, tips } = props;

  const query = useQuery();
  const type = query.get('type');

  return (
    <div className="usual-content">
      <h1 className="tool-content-title-big">
        {EToolType.getLabelById(type)}工具
      </h1>

      <section className="usual-content-block">{children}</section>

      {tips && tips.length && (
        <>
          <h1 className="tool-content-title-big">提示</h1>
          {tips.map((item, index) => (
            <article className="usual-content-tips" key={index}>
              <Alert
                type="info"
                title={item.title}
                content={item.content}
                className="usual-content-tip"
              />
            </article>
          ))}
        </>
      )}
    </div>
  );
};
