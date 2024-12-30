import { Alert } from '@arco-design/web-react';

export const UsualContent = (props) => {
  const { title, content, tips } = props;

  return (
    <div className="usual-content">
      <h1 className="usual-content-title">{title}工具</h1>

      <section className="usual-content-block">{content}</section>

      {tips && tips.length && (
        <>
          <h1 className="usual-content-title">提示</h1>
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
