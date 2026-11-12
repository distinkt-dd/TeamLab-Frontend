import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getServices } from '@app';
import { SkillService } from '@entities/skill';
import type { Skill, SkillLevel, UserSkillUpdate } from '@entities/user/types';
import { Tag } from '@shared/ui';
import { EditProfileModal } from './EditProfileModal';
import { DEFAULT_SKILL_LEVEL, toSkillLevel } from './lib/skillLevel';
import styles from './SkillsModal.module.css';

const SKILLS_QUERY_KEY = ['skills'];

interface SelectedSkill {
  skillId: number;
  name: string;
  level: SkillLevel;
}

interface SkillsModalProps {
  // Навыки из /users/me/: их уровни сохраняются при редактировании.
  selectedSkills: Skill[];
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (skills: UserSkillUpdate[]) => void;
}

export const SkillsModal: React.FC<SkillsModalProps> = ({
  selectedSkills,
  isSaving,
  error,
  onClose,
  onSave,
}) => {
  const { api } = getServices();
  const skillService = useMemo(() => new SkillService(api), [api]);
  const [selected, setSelected] = useState<SelectedSkill[]>(() =>
    selectedSkills.map((skill) => ({
      skillId: skill.skill_id,
      name: skill.name,
      level: toSkillLevel(skill.level) ?? DEFAULT_SKILL_LEVEL,
    }))
  );

  // Справочник навыков: GET /skills/ отдаёт плоский массив без пагинации.
  const {
    data: dictionary,
    isPending,
    isError,
  } = useQuery({
    queryKey: SKILLS_QUERY_KEY,
    queryFn: () => skillService.list({ ordering: 'name' }),
  });

  const selectedIds = new Set(selected.map((skill) => skill.skillId));
  const availableSkills = (dictionary ?? []).filter(
    (skill) => !selectedIds.has(skill.id)
  );

  const handleAdd = (skill: { id: number; name: string }) => {
    setSelected((prev) => [
      ...prev,
      {
        skillId: skill.id,
        name: skill.name,
        level: DEFAULT_SKILL_LEVEL,
      },
    ]);
  };

  const handleRemove = (skillId: number) => {
    setSelected((prev) => prev.filter((skill) => skill.skillId !== skillId));
  };

  const handleSave = () => {
    onSave(
      selected.map((skill) => ({ skill_id: skill.skillId, level: skill.level }))
    );
  };

  return (
    <EditProfileModal
      title="Мои навыки"
      isSaving={isSaving}
      error={error}
      // Пустой список навыков бэкенд отклоняет (allow_empty=False),
      // поэтому сохранить профиль совсем без навыков нельзя.
      isSaveDisabled={selected.length === 0}
      onClose={onClose}
      onSave={handleSave}
    >
      <div className={styles.selectedField}>
        {selected.length === 0 ? (
          <p className={styles.selectedEmpty}>
            Навыки не выбраны. Добавьте их из списка ниже
          </p>
        ) : (
          selected.map((skill) => (
            <button
              key={skill.skillId}
              type="button"
              className={styles.tagButton}
              disabled={isSaving}
              aria-label={`Удалить навык ${skill.name}`}
              onClick={() => handleRemove(skill.skillId)}
            >
              <Tag
                variant="select"
                className={styles.selectedTag}
                rightIconName="close"
                rightIconSize={24}
              >
                {skill.name}
              </Tag>
            </button>
          ))
        )}
      </div>

      <p className={styles.recommendationTitle}>Рекомендуемые навыки</p>

      <div className={styles.availableField}>
        {isPending && (
          <p className={styles.availableStatus}>Загружаем навыки…</p>
        )}
        {isError && (
          <p className={styles.availableStatus} role="alert">
            Не удалось загрузить список навыков
          </p>
        )}
        {!isPending && !isError && availableSkills.length === 0 && (
          <p className={styles.availableStatus}>
            Все навыки из справочника уже выбраны
          </p>
        )}
        {availableSkills.map((skill) => (
          <button
            key={skill.id}
            type="button"
            className={styles.tagButton}
            disabled={isSaving}
            aria-label={`Добавить навык ${skill.name}`}
            onClick={() => handleAdd(skill)}
          >
            <Tag
              variant="select"
              className={styles.availableTag}
              rightIconName="plus"
              rightIconSize={24}
            >
              {skill.name}
            </Tag>
          </button>
        ))}
      </div>
    </EditProfileModal>
  );
};
