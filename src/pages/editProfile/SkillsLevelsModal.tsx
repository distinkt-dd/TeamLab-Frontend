import { useState } from 'react';
import type { Skill, SkillLevel, UserSkillUpdate } from '@entities/user/types';
import { Tag } from '@shared/ui';
import { EditProfileModal } from './EditProfileModal';
import { toSkillLevel } from './lib/skillLevel';
import styles from './SkillsLevelsModal.module.css';

// Карточки уровней из макета: порядок и подписи — как в макете.
const LEVEL_CARDS: { level: SkillLevel; title: string }[] = [
  { level: 'basic', title: 'Базовый' },
  { level: 'middle', title: 'Средний' },
  { level: 'advanced', title: 'Продвинутый' },
];

const LEVEL_CARD_CLASSES: Record<SkillLevel, string> = {
  basic: styles.cardBasic,
  middle: styles.cardMiddle,
  advanced: styles.cardAdvanced,
};

interface LevelSkill {
  skillId: number;
  name: string;
  // null — навык лежит в «Не распределённые».
  level: SkillLevel | null;
}

interface SkillsLevelsModalProps {
  selectedSkills: Skill[];
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (skills: UserSkillUpdate[]) => void;
}

// Навыки переносятся перетаскиванием: из «Не распределённых» в карточку уровня,
// между карточками и обратно; крестик на плашке возвращает навык в пул.
export const SkillsLevelsModal: React.FC<SkillsLevelsModalProps> = ({
  selectedSkills,
  isSaving,
  error,
  onClose,
  onSave,
}) => {
  const [items, setItems] = useState<LevelSkill[]>(() =>
    selectedSkills.map((skill) => ({
      skillId: skill.skill_id,
      name: skill.name,
      // У демо-пользователей level в БД пустой: такие навыки не распределены.
      level: toSkillLevel(skill.level),
    }))
  );
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [activeLevel, setActiveLevel] = useState<SkillLevel | null>(null);

  const unassigned = items.filter((item) => item.level === null);
  // Бэкенд требует level у каждого навыка, поэтому пул должен быть пустым.
  const isSaveDisabled = items.length === 0 || unassigned.length > 0;

  const moveToLevel = (skillId: number, level: SkillLevel | null) => {
    setItems((prev) =>
      prev.map((item) => (item.skillId === skillId ? { ...item, level } : item))
    );
  };

  const getDraggedSkillId = (
    event: React.DragEvent<HTMLElement>
  ): number | null => {
    if (draggingId !== null) return draggingId;

    const transferId = Number(event.dataTransfer?.getData('text/plain'));
    return Number.isInteger(transferId) && transferId > 0 ? transferId : null;
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLElement>,
    skillId: number
  ) => {
    // dataTransfer нужен браузеру, чтобы начать перетаскивание;
    // сам перенос опирается на состояние draggingId.
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', String(skillId));
      event.dataTransfer.effectAllowed = 'move';
    }
    setDraggingId(skillId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setActiveLevel(null);
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLElement>,
    level: SkillLevel | null
  ) => {
    // Без preventDefault браузер не разрешит drop.
    event.preventDefault();
    setActiveLevel(level);
  };

  const handleDrop = (
    event: React.DragEvent<HTMLElement>,
    level: SkillLevel | null
  ) => {
    event.preventDefault();
    const skillId = getDraggedSkillId(event);
    if (skillId !== null) {
      moveToLevel(skillId, level);
    }
    setDraggingId(null);
    setActiveLevel(null);
  };

  const handleSave = () => {
    const distributed: UserSkillUpdate[] = [];
    items.forEach((item) => {
      if (item.level) {
        distributed.push({ skill_id: item.skillId, level: item.level });
      }
    });
    onSave(distributed);
  };

  const getTagButtonClass = (skillId: number) =>
    [styles.tagButton, draggingId === skillId ? styles.dragging : '']
      .filter(Boolean)
      .join(' ');

  return (
    <EditProfileModal
      title="Уровни навыков"
      size="wide"
      isSaving={isSaving}
      error={error}
      isSaveDisabled={isSaveDisabled}
      onClose={onClose}
      onSave={handleSave}
    >
      <p className={styles.poolTitle}>Не распределённые</p>

      <div
        className={styles.pool}
        onDragOver={(event) => handleDragOver(event, null)}
        onDrop={(event) => handleDrop(event, null)}
      >
        {unassigned.length === 0 ? (
          <p className={styles.poolEmpty}>Все навыки распределены по уровням</p>
        ) : (
          unassigned.map((skill) => (
            <button
              key={skill.skillId}
              type="button"
              className={getTagButtonClass(skill.skillId)}
              disabled={isSaving}
              draggable={!isSaving}
              aria-label={`Перетащить навык ${skill.name} в уровень`}
              onDragStart={(event) => handleDragStart(event, skill.skillId)}
              onDragEnd={handleDragEnd}
            >
              <Tag variant="select" className={styles.poolTag}>
                {skill.name}
              </Tag>
            </button>
          ))
        )}
      </div>

      <div className={styles.levels}>
        {LEVEL_CARDS.map((card) => {
          const cardSkills = items.filter((item) => item.level === card.level);
          const cardClasses = [
            styles.card,
            LEVEL_CARD_CLASSES[card.level],
            activeLevel === card.level ? styles.cardActive : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={card.level}
              className={cardClasses}
              role="group"
              aria-label={card.title}
              onDragOver={(event) => handleDragOver(event, card.level)}
              onDrop={(event) => handleDrop(event, card.level)}
            >
              <h3 className={styles.cardTitle}>{card.title}</h3>

              <div className={styles.cardTags}>
                {cardSkills.length === 0 ? (
                  <p className={styles.cardEmpty}>Перетащите навыки сюда</p>
                ) : (
                  cardSkills.map((skill) => (
                    <button
                      key={skill.skillId}
                      type="button"
                      className={getTagButtonClass(skill.skillId)}
                      disabled={isSaving}
                      draggable={!isSaving}
                      aria-label={`Вернуть навык ${skill.name} в нераспределённые`}
                      onDragStart={(event) =>
                        handleDragStart(event, skill.skillId)
                      }
                      onDragEnd={handleDragEnd}
                      onClick={() => moveToLevel(skill.skillId, null)}
                    >
                      <Tag
                        variant="select"
                        className={styles.cardTag}
                        rightIconName="close"
                        rightIconSize={24}
                      >
                        {skill.name}
                      </Tag>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {unassigned.length > 0 && (
        <p className={styles.hint} role="status">
          Распределите все навыки по уровням (осталось: {unassigned.length})
        </p>
      )}
    </EditProfileModal>
  );
};
