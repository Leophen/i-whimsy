import { Alert } from '@arco-design/web-react';
import { useParams, useLocation } from 'react-router-dom';
import { EToolType } from '../../../../enums';
import { tools } from '../../data';

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

export const UsualContent = (props) => {
  const { toolPath } = useParams();
  const { children, tips } = props;

  const query = useQuery();

  const getToolName = () => {
    const queryType = query.get('type');
    if (queryType) {
      return EToolType.getLabelById(queryType);
    } else {
      return tools.find((item) => item.path === toolPath)?.list[0].name;
    }
  };

  return (
    <div className="usual-content">
      <h1 className="tool-content-title-big">{getToolName()}工具</h1>

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
