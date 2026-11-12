import { useRef, useState } from 'react';
import { Button, Input, Tag } from '@shared/ui';
import { Icon } from '@shared/icons';
import { EditProfileModal } from './EditProfileModal';
import workImagePlaceholder from './assets/workImagePlaceholder.svg';
import styles from './WorksModal.module.css';

// Черновик одной работы: логотип уходит в image lifecycle после создания
// работы, поэтому файл хранится отдельно от текстовых полей.
export interface WorkDraft {
  title: string;
  task: string;
  solution: string;
  technologies: string[];
  link: string;
  imageFile: File | null;
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
  imagePreview: null,
  technologyInput: '',
});

const toDraft = (card: WorkCardState): WorkDraft => ({
  title: card.title,
  task: card.task,
  solution: card.solution,
  technologies: card.technologies,
  link: card.link,
  imageFile: card.imageFile,
});

// Модалка «Мои работы»: плюс внизу добавляет ещё одну карточку формы,
// «Сохранить» создаёт все заполненные работы разом.
export const WorksModal: React.FC<WorksModalProps> = ({
  isSaving,
  error,
  onClose,
  onSave,
}) => {
  const nextKeyRef = useRef(1);
  const logoInputsRef = useRef(new Map<number, HTMLInputElement>());
  const [cards, setCards] = useState<WorkCardState[]>(() => [
    createEmptyCard(0),
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
    const technology = card?.technologyInput.trim() ?? '';
    if (!card || !technology) return;

    updateCard(key, {
      technologies: card.technologies.includes(technology)
        ? card.technologies
        : [...card.technologies, technology],
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
        imagePreview: typeof reader.result === 'string' ? reader.result : null,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = (key: number) => {
    updateCard(key, { imageFile: null, imagePreview: null });
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
      title="Мои работы"
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
                {card.imageFile ? 'Заменить логотип' : 'Добавить логотип'}
              </Button>
              {card.imageFile && (
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
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    handleTechnologyAdd(card.key);
                  }}
                />
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

      <Button
        className={styles.addCard}
        iconName="plus"
        iconSize={24}
        disabled={isSaving}
        aria-label="Добавить ещё одну работу"
        onClick={handleAddCard}
      />

      {isSaveDisabled && (
        <p className={styles.hint} role="status">
          Укажите название каждой работы
        </p>
      )}
    </EditProfileModal>
  );
};
