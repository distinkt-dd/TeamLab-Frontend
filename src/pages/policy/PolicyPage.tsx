import { Fragment, type ReactNode } from 'react';
import styles from './PolicyPage.module.css';
import { POLICY_TEXT } from './policyText';

const renderInline = (text: string): ReactNode =>
  text.split(/(\*\*.*?\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={`${part}-${index}`}>{part}</Fragment>
    )
  );

const policyBlocks = POLICY_TEXT.trim().split(/\n\s*\n/);

export const PolicyPage: React.FC = () => {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>
          Политика в отношении обработки персональных данных
          пользователей платформы TeamLab
        </h1>

        <article className={styles.article}>
          {policyBlocks.map((block, index) => {
            if (block.startsWith('## ')) {
              return <h2 key={block}>{block.slice(3)}</h2>;
            }

            const lines = block.split('\n');
            if (lines.every((line) => line.startsWith('- '))) {
              return (
                <ul key={`list-${index}`}>
                  {lines.map((line) => (
                    <li key={line}>{renderInline(line.slice(2))}</li>
                  ))}
                </ul>
              );
            }

            if (/^\*\*.*\*\*$/.test(block)) {
              const heading = block.slice(2, -2);
              return index === 0 ? (
                <p className={styles.revision} key={block}>
                  <strong>{heading}</strong>
                </p>
              ) : (
                <h3 key={block}>{heading}</h3>
              );
            }

            return (
              <p key={`paragraph-${index}`}>
                {renderInline(lines.join(' '))}
              </p>
            );
          })}
        </article>
      </div>
    </main>
  );
};
