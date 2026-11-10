import type { Skill } from '@entities/skill/types';
import type { Specialization } from '@entities/specialization/types';
import { Icon } from '@shared/icons';
import { Select, Tag } from '@shared/ui';
import type { ProjectRoleDraft } from './model';
import type { RoleValidationErrors } from './saveProjectDraft';
import tasksDecoration from '../projectCard/assets/Orange Notepad Dark Void-no-bg-preview (carve.photos) 1.png';
import benefitsDecoration from '../projectCard/assets/Red Fur Oblique View-no-bg-preview (carve.photos) 1.png';
import styles from './EditProjectPage.module.css';

const ROLE_TEXT_MAX_LENGTH = 100;
const skillTagColors = ['pink', 'blue', 'green', 'purple'] as const;

interface RoleEditorProps {
  role: ProjectRoleDraft;
  specializationOptions: Specialization[];
  availableSkills: Skill[];
  createSkillClientId: () => string;
  onChange: (role: ProjectRoleDraft) => void;
  errors?: RoleValidationErrors;
}

export const RoleEditor: React.FC<RoleEditorProps> = ({
  role,
  specializationOptions,
  availableSkills,
  createSkillClientId,
  onChange,
  errors,
}) => {
  const updateTextItem = (
    field: 'tasks' | 'benefits',
    index: number,
    value: string
  ) => {
    onChange({
      ...role,
      [field]: role[field].map((item, itemIndex) =>
        itemIndex === index ? value : item
      ),
    });
  };

  const removeTextItem = (field: 'tasks' | 'benefits', index: number) => {
    onChange({
      ...role,
      [field]: role[field].filter((_, itemIndex) => itemIndex !== index),
    });
  };

  const addTextItem = (field: 'tasks' | 'benefits') => {
    onChange({ ...role, [field]: [...role[field], ''] });
  };

  const addSkill = (value: string) => {
    const skill = availableSkills.find(({ id }) => id === Number(value));
    if (!skill) return;

    const nextOrder =
      role.skills.reduce(
        (maximum, current) => Math.max(maximum, current.order),
        0
      ) + 1;

    onChange({
      ...role,
      skills: [
        ...role.skills,
        {
          id: null,
          clientId: createSkillClientId(),
          skillId: skill.id,
          name: skill.name,
          description: '',
          order: nextOrder,
        },
      ],
    });
  };

  const removeSkill = (clientId: string) => {
    const skills = role.skills
      .filter((skill) => skill.clientId !== clientId)
      .map((skill, index) => ({ ...skill, order: index + 1 }));

    onChange({ ...role, skills });
  };

  const updateSkillDescription = (clientId: string, description: string) => {
    onChange({
      ...role,
      skills: role.skills.map((skill) =>
        skill.clientId === clientId ? { ...skill, description } : skill
      ),
    });
  };

  const hasInvalidTasks =
    role.tasks.length === 0 || role.tasks.some((task) => !task.trim());
  const hasInvalidSkills =
    role.skills.length === 0 ||
    role.skills.some((skill) => !skill.description.trim());
  const hasInvalidBenefits =
    role.benefits.length === 0 ||
    role.benefits.some((benefit) => !benefit.trim());

  return (
    <section className={styles.roleEditor} aria-labelledby="role-editor-title">
      <div className={styles.roleEditorHeader}>
        <p>Редактирование роли</p>
        <h2 id="role-editor-title">
          {role.specializationName || 'Новая роль'}
        </h2>
        <div className={styles.roleSpecializationSelect}>
          <label htmlFor="role-specialization">Специализация</label>
          <Select
            id="role-specialization"
            fullWidth
            labelText="Выберите специализацию"
            options={specializationOptions.map((specialization) => ({
              value: String(specialization.id),
              label: specialization.name,
            }))}
            value={String(role.specializationId)}
            onChange={(value) => {
              const specialization = specializationOptions.find(
                ({ id }) => id === Number(value)
              );
              if (!specialization) return;
              onChange({
                ...role,
                specializationId: specialization.id,
                specializationName: specialization.name,
              });
            }}
          />
          {errors?.specialization && (
            <p className={styles.validationHint} role="alert">
              {errors.specialization}
            </p>
          )}
        </div>
      </div>

      <section className={styles.tasksSection} aria-labelledby="tasks-title">
        <img
          className={styles.tasksDecoration}
          src={tasksDecoration}
          alt=""
          aria-hidden="true"
        />
        <div className={styles.tasksContent}>
          <h3 id="tasks-title">Задачи</h3>
          <div className={styles.repeatableList}>
            {role.tasks.map((task, index) => (
              <div className={styles.repeatableItem} key={`task-${index}`}>
                <label htmlFor={`role-task-${index}`}>
                  <span className={styles.visuallyHidden}>
                    Задача {index + 1}
                  </span>
                  <textarea
                    id={`role-task-${index}`}
                    maxLength={ROLE_TEXT_MAX_LENGTH}
                    value={task}
                    placeholder="Опишите задачу"
                    onChange={(event) =>
                      updateTextItem('tasks', index, event.target.value)
                    }
                  />
                </label>
                <div className={styles.repeatableMeta}>
                  <button
                    type="button"
                    onClick={() => removeTextItem('tasks', index)}
                  >
                    Удалить задачу
                  </button>
                  <span>
                    {task.length} / {ROLE_TEXT_MAX_LENGTH}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {(errors?.tasks || hasInvalidTasks) && (
            <p className={styles.validationHint}>
              {errors?.tasks ??
                'Для сохранения нужна хотя бы одна заполненная задача.'}
            </p>
          )}
          <button
            type="button"
            className={styles.addItemButton}
            onClick={() => addTextItem('tasks')}
          >
            <Icon name="plus" size={32} aria-hidden="true" />
            <span>Добавить задачу</span>
          </button>
        </div>
      </section>

      <section className={styles.skillsSection} aria-labelledby="skills-title">
        <div className={styles.skillsHeader}>
          <h3 id="skills-title">Ключевые навыки</h3>
          <div className={styles.skillTags}>
            {role.skills.map((skill, index) => (
              <button
                type="button"
                className={styles.skillTagButton}
                key={skill.clientId}
                aria-label={`Удалить навык «${skill.name}»`}
                onClick={() => removeSkill(skill.clientId)}
              >
                <Tag
                  bgColor={skillTagColors[index % skillTagColors.length]}
                  rightIconName="close"
                >
                  {skill.name}
                </Tag>
              </button>
            ))}
            <Select
              size="S"
              labelText="Добавить навык"
              options={availableSkills.map((skill) => ({
                value: String(skill.id),
                label: skill.name,
              }))}
              value=""
              disabled={availableSkills.length === 0}
              onChange={addSkill}
            />
          </div>
        </div>

        <ol className={styles.skillDescriptions}>
          {role.skills.map((skill) => (
            <li key={skill.clientId}>
              <span className={styles.skillOrder}>{skill.order}</span>
              <label htmlFor={`skill-description-${skill.clientId}`}>
                <span className={styles.visuallyHidden}>
                  Описание навыка {skill.name}
                </span>
                <textarea
                  id={`skill-description-${skill.clientId}`}
                  value={skill.description}
                  placeholder="Описание навыка"
                  rows={2}
                  onChange={(event) =>
                    updateSkillDescription(skill.clientId, event.target.value)
                  }
                />
              </label>
            </li>
          ))}
        </ol>
        {(errors?.skills || hasInvalidSkills) && (
          <p className={styles.validationHint}>
            {errors?.skills ??
              'Для сохранения добавьте навык и заполните его описание.'}
          </p>
        )}
      </section>

      <section
        className={styles.benefitsSection}
        aria-labelledby="benefits-title"
      >
        <img
          className={styles.benefitsDecoration}
          src={benefitsDecoration}
          alt=""
          aria-hidden="true"
        />
        <div className={styles.benefitsContent}>
          <h3 id="benefits-title">Напишите о выгодах участника</h3>
          <div className={styles.repeatableList}>
            {role.benefits.map((benefit, index) => (
              <div className={styles.repeatableItem} key={`benefit-${index}`}>
                <label htmlFor={`role-benefit-${index}`}>
                  <span className={styles.visuallyHidden}>
                    Преимущество {index + 1}
                  </span>
                  <textarea
                    id={`role-benefit-${index}`}
                    maxLength={ROLE_TEXT_MAX_LENGTH}
                    value={benefit}
                    placeholder="Например, кейс в портфолио"
                    onChange={(event) =>
                      updateTextItem('benefits', index, event.target.value)
                    }
                  />
                </label>
                <div className={styles.repeatableMeta}>
                  <button
                    type="button"
                    onClick={() => removeTextItem('benefits', index)}
                  >
                    Удалить
                  </button>
                  <span>
                    {benefit.length} / {ROLE_TEXT_MAX_LENGTH}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {(errors?.benefits || hasInvalidBenefits) && (
            <p className={styles.validationHint}>
              {errors?.benefits ??
                'Для сохранения нужно хотя бы одно заполненное преимущество.'}
            </p>
          )}
          <button
            type="button"
            className={styles.addItemButton}
            onClick={() => addTextItem('benefits')}
          >
            <Icon name="plus" size={32} aria-hidden="true" />
            <span>Добавить преимущество</span>
          </button>
        </div>
      </section>
    </section>
  );
};
