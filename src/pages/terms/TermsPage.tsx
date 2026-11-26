import { Fragment, type ReactNode } from 'react';
import styles from '../policy/PolicyPage.module.css';
import { TERMS_TEXT } from './termsText';

const renderInline = (text: string): ReactNode =>
  text.split(/(\*\*.*?\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={`${part}-${index}`}>{part}</Fragment>
    )
  );

const termsBlocks = TERMS_TEXT.trim().split(/\n\s*\n/);

export const TermsPage: React.FC = () => {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Пользовательское соглашение TeamLab</h1>

        <article className={styles.article}>
          {termsBlocks.map((block, index) => {
            if (block.startsWith('## ')) {
              return <h2 key={block}>{block.slice(3)}</h2>;
            }

            const lines = block.split('\n');

            return (
              <p
                className={index === 0 ? styles.revision : undefined}
                key={`paragraph-${index}`}
              >
                {lines.map((line, lineIndex) => (
                  <Fragment key={`${line}-${lineIndex}`}>
                    {lineIndex > 0 && <br />}
                    {renderInline(line)}
                  </Fragment>
                ))}
              </p>
            );
          })}
        </article>
      </div>
    </main>
  );
};
