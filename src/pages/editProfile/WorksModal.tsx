import { useRef, useState } from 'react';
import type { PortfolioWork } from '@entities/portfolioWork/types';
import { Button, Input, Tag } from '@shared/ui';
import { Icon } from '@shared/icons';
import { EditProfileModal } from './EditProfileModal';
import workImagePlaceholder from './assets/workImagePlaceholder.svg';
import styles from './WorksModal.module.css';

// Черновик одной работы: изображение проходит отдельный image lifecycle,
// поэтому файл и признак удаления хранятся отдельно от текстовых полей.
export interface WorkDraft {
  title: string;
  task: string;
  solution: string;
  technologies: string[];
  link: string;
  imageFile: File | null;
  removeExistingImage: boolean;
}

// Состояние карточки формы: к черновику добавляются ключ React, превью
// логотипа и текст ещё не добавленной технологии.
interface WorkCardState extends WorkDraft {
  key: number;
  imagePreview: string | null;
  technologyInput: string;
}

interface WorksModalProps {
  isSaving: boolean;
  error: string | null;
  initialWork?: PortfolioWork | null;
  onClose: () => void;
  onSave: (works: WorkDraft[]) => void;
}

const createEmptyCard = (key: number): WorkCardState => ({
  key,
  title: '',
  task: '',
  solution: '',
  technologies: [],
  link: '',
  imageFile: null,
  removeExistingImage: false,
  imagePreview: null,
  technologyInput: '',
});

const createCardFromWork = (work: PortfolioWork): WorkCardState => ({
  key: work.id,
  title: work.title,
  task: work.task ?? '',
  solution: work.solution ?? '',
  technologies: work.technologies ?? [],
  link: work.link ?? '',
  imageFile: null,
  removeExistingImage: false,
  imagePreview: work.image,
  technologyInput: '',
});

const appendTechnology = (technologies: string[], value: string) => {
  const technology = value.trim();
  if (!technology) return technologies;

  const normalizedTechnology = technology.toLocaleLowerCase();
  const isDuplicate = technologies.some(
    (item) => item.trim().toLocaleLowerCase() === normalizedTechnology
  );

  return isDuplicate ? technologies : [...technologies, technology];
};

const toDraft = (card: WorkCardState): WorkDraft => ({
  title: card.title,
  task: card.task,
  solution: card.solution,
  technologies: appendTechnology(card.technologies, card.technologyInput),
  link: card.link,
  imageFile: card.imageFile,
  removeExistingImage: card.removeExistingImage,
});

// Модалка «Мои работы»: в режиме создания плюс добавляет карточки,
// в режиме редактирования форма предзаполнена одной существующей работой.
export const WorksModal: React.FC<WorksModalProps> = ({
  isSaving,
  error,
  initialWork,
  onClose,
  onSave,
}) => {
  const nextKeyRef = useRef(1);
  const logoInputsRef = useRef(new Map<number, HTMLInputElement>());
  const [cards, setCards] = useState<WorkCardState[]>(() => [
    initialWork ? createCardFromWork(initialWork) : createEmptyCard(0),
  ]);

  const updateCard = (key: number, patch: Partial<WorkCardState>) => {
    setCards((prev) =>
      prev.map((card) => (card.key === key ? { ...card, ...patch } : card))
    );
  };

  const handleAddCard = () => {
    setCards((prev) => [...prev, createEmptyCard(nextKeyRef.current++)]);
  };

  const handleTechnologyAdd = (key: number) => {
    const card = cards.find((item) => item.key === key);
    if (!card || !card.technologyInput.trim()) return;

    updateCard(key, {
      technologies: appendTechnology(card.technologies, card.technologyInput),
      technologyInput: '',
    });
  };

  const handleTechnologyRemove = (key: number, technology: string) => {
    const card = cards.find((item) => item.key === key);
    if (!card) return;

    updateCard(key, {
      technologies: card.technologies.filter((item) => item !== technology),
    });
  };

  const handleLogoSelect = (key: number, file: File | undefined) => {
    if (!file) return;

    // Превью до сохранения читаем в data URL, чтобы не управлять
    // object URL и не отзывать его вручную.
    const reader = new FileReader();
    reader.onload = () => {
      updateCard(key, {
        imageFile: file,
        removeExistingImage: false,
        imagePreview: typeof reader.result === 'string' ? reader.result : null,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = (key: number) => {
    updateCard(key, {
      imageFile: null,
      imagePreview: null,
      removeExistingImage: Boolean(initialWork?.image),
    });
  };

  const setLogoInputRef =
    (key: number) => (element: HTMLInputElement | null) => {
      if (element) {
        logoInputsRef.current.set(key, element);
      } else {
        logoInputsRef.current.delete(key);
      }
    };

  const handleSave = () => {
    onSave(cards.map(toDraft));
  };

  // Бэкенд требует title у работы, поэтому пустое название блокирует сохранение.
  const isSaveDisabled = cards.some((card) => !card.title.trim());

  return (
    <EditProfileModal
      title={initialWork ? 'Редактировать работу' : 'Мои работы'}
      size="wide"
      isSaving={isSaving}
      error={error}
      isSaveDisabled={isSaveDisabled}
      onClose={onClose}
      onSave={handleSave}
    >
      <div className={styles.cards}>
        {cards.map((card, index) => (
          <div
            className={styles.card}
            key={card.key}
            role="group"
            aria-label={`Работа ${index + 1}`}
          >
            <div className={styles.logo}>
              <img
                className={styles.logoPreview}
                src={card.imagePreview ?? workImagePlaceholder}
                alt={
                  card.imagePreview
                    ? 'Логотип работы'
                    : 'Логотип работы по умолчанию'
                }
                width={120}
                height={120}
              />
              <input
                ref={setLogoInputRef(card.key)}
                className={styles.logoInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isSaving}
                onChange={(event) => {
                  handleLogoSelect(card.key, event.currentTarget.files?.[0]);
                  event.currentTarget.value = '';
                }}
                aria-label={`Выбрать логотип работы ${index + 1}`}
              />
              <Button
                variant="tertiary"
                disabled={isSaving}
                onClick={() => logoInputsRef.current.get(card.key)?.click()}
              >
                {card.imagePreview ? 'Заменить логотип' : 'Добавить логотип'}
              </Button>
              {card.imagePreview && (
                <button
                  type="button"
                  className={styles.logoRemove}
                  disabled={isSaving}
                  onClick={() => handleLogoRemove(card.key)}
                >
                  <Icon name="trashS" size={24} aria-hidden="true" />
                  Удалить логотип
                </button>
              )}
            </div>

            <div className={styles.fields}>
              <Input
                placeholder="Название проекта"
                value={card.title}
                disabled={isSaving}
                onChange={(event) =>
                  updateCard(card.key, { title: event.target.value })
                }
              />
              <Input
                placeholder="Какая задача ставилась?"
                value={card.task}
                disabled={isSaving}
                onChange={(event) =>
                  updateCard(card.key, { task: event.target.value })
                }
              />
              <Input
                placeholder="Какое решение было найдено?"
                value={card.solution}
                disabled={isSaving}
                onChange={(event) =>
                  updateCard(card.key, { solution: event.target.value })
                }
              />
            </div>

            <div className={styles.technologies}>
              <p className={styles.technologiesTitle}>
                Какие технологии использовали?
              </p>
              <div className={styles.technologiesList}>
                {card.technologies.map((technology) => (
                  <button
                    key={technology}
                    type="button"
                    className={styles.tagButton}
                    disabled={isSaving}
                    aria-label={`Удалить технологию ${technology}`}
                    onClick={() => handleTechnologyRemove(card.key, technology)}
                  >
                    <Tag
                      variant="select"
                      className={styles.technologyTag}
                      rightIconName="close"
                      rightIconSize={24}
                    >
                      {technology}
                    </Tag>
                  </button>
                ))}
                <div className={styles.technologyComposer}>
                  <input
                    className={styles.technologyInput}
                    value={card.technologyInput}
                    disabled={isSaving}
                    placeholder="Технология"
                    aria-label={`Добавить технологию в работу ${index + 1}`}
                    onChange={(event) =>
                      updateCard(card.key, {
                        technologyInput: event.target.value,
                      })
                    }
                    onBlur={() => handleTechnologyAdd(card.key)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      handleTechnologyAdd(card.key);
                    }}
                  />
                  <button
                    type="button"
                    className={styles.technologyAdd}
                    disabled={isSaving || !card.technologyInput.trim()}
                    aria-label={`Добавить введённую технологию в работу ${index + 1}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleTechnologyAdd(card.key)}
                  >
                    <Icon name="plus" size={20} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.linkField}>
              <Input
                placeholder="Вставьте ссылку"
                type="url"
                value={card.link}
                disabled={isSaving}
                onChange={(event) =>
                  updateCard(card.key, { link: event.target.value })
                }
              />
            </div>
          </div>
        ))}
      </div>

      {!initialWork && (
        <Button
          className={styles.addCard}
          iconName="plus"
          iconSize={24}
          disabled={isSaving}
          aria-label="Добавить ещё одну работу"
          onClick={handleAddCard}
        />
      )}

      {isSaveDisabled && (
        <p className={styles.hint} role="status">
          Укажите название каждой работы
        </p>
      )}
    </EditProfileModal>
  );
};
