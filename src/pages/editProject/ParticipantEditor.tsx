import type { Skill } from '@entities/skill/types';
import { Icon } from '@shared/icons';
import { Select, Tag } from '@shared/ui';
import type { ProjectRoleDraft } from './model';
import type { RoleValidationErrors } from './saveProjectDraft';
import tasksDecoration from '../projectCard/assets/Orange Notepad Dark Void-no-bg-preview (carve.photos) 1.png';
import benefitsDecoration from '../projectCard/assets/Red Fur Oblique View-no-bg-preview (carve.photos) 1.png';
import styles from './EditProjectPage.module.css';

const PARTICIPANT_TEXT_MAX_LENGTH = 100;
const PARTICIPANT_PANEL_ID = 'participant-tabpanel';
const NEW_PARTICIPANT_LABEL = 'Новый участник';
const skillTagColors = ['pink', 'blue', 'green', 'purple'] as const;

interface ParticipantFieldsProps {
  participant: ProjectRoleDraft;
  availableSkills: Skill[];
  createSkillClientId: () => string;
  onChange: (participant: ProjectRoleDraft) => void;
  errors?: RoleValidationErrors;
}

const ParticipantFields: React.FC<ParticipantFieldsProps> = ({
  participant,
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
      ...participant,
      [field]: participant[field].map((item, itemIndex) =>
        itemIndex === index ? value : item
      ),
    });
  };

  const removeTextItem = (field: 'tasks' | 'benefits', index: number) => {
    onChange({
      ...participant,
      [field]: participant[field].filter((_, itemIndex) => itemIndex !== index),
    });
  };

  const addTextItem = (field: 'tasks' | 'benefits') => {
    onChange({ ...participant, [field]: [...participant[field], ''] });
  };

  const addSkill = (value: string) => {
    const skill = availableSkills.find(({ id }) => id === Number(value));
    if (!skill) return;

    const nextOrder =
      participant.skills.reduce(
        (maximum, current) => Math.max(maximum, current.order),
        0
      ) + 1;

    onChange({
      ...participant,
      skills: [
        ...participant.skills,
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
    const skills = participant.skills
      .filter((skill) => skill.clientId !== clientId)
      .map((skill, index) => ({ ...skill, order: index + 1 }));

    onChange({ ...participant, skills });
  };

  const updateSkillDescription = (clientId: string, description: string) => {
    onChange({
      ...participant,
      skills: participant.skills.map((skill) =>
        skill.clientId === clientId ? { ...skill, description } : skill
      ),
    });
  };

  const hasInvalidTasks =
    participant.tasks.length === 0 ||
    participant.tasks.some((task) => !task.trim());
  const hasInvalidSkills =
    participant.skills.length === 0 ||
    participant.skills.some((skill) => !skill.description.trim());
  const hasInvalidBenefits =
    participant.benefits.length === 0 ||
    participant.benefits.some((benefit) => !benefit.trim());

  return (
    <>
      <div className={styles.participantEditorHeader}>
        <p>Редактирование участника</p>
        <h2 id="participant-editor-title">
          {participant.specializationName || NEW_PARTICIPANT_LABEL}
        </h2>
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
            {participant.tasks.map((task, index) => (
              <div className={styles.repeatableItem} key={`task-${index}`}>
                <label htmlFor={`participant-task-${index}`}>
                  <span className={styles.visuallyHidden}>
                    Задача {index + 1}
                  </span>
                  <textarea
                    id={`participant-task-${index}`}
                    maxLength={PARTICIPANT_TEXT_MAX_LENGTH}
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
                    {task.length} / {PARTICIPANT_TEXT_MAX_LENGTH}
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
            {participant.skills.map((skill, index) => (
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
          {participant.skills.map((skill) => (
            <li key={skill.clientId} style={{ alignItems: 'baseline' }}>
              <div className={styles.skillMeta}>
                <span className={styles.skillOrder}>{skill.order}</span>
                <span className={styles.skillName}>{skill.name}</span>
              </div>
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
            {participant.benefits.map((benefit, index) => (
              <div className={styles.repeatableItem} key={`benefit-${index}`}>
                <label htmlFor={`participant-benefit-${index}`}>
                  <span className={styles.visuallyHidden}>
                    Преимущество {index + 1}
                  </span>
                  <textarea
                    id={`participant-benefit-${index}`}
                    maxLength={PARTICIPANT_TEXT_MAX_LENGTH}
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
                    {benefit.length} / {PARTICIPANT_TEXT_MAX_LENGTH}
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
    </>
  );
};

interface ParticipantEditorProps {
  participants: ProjectRoleDraft[];
  selectedParticipantId: string | null;
  onSelect: (clientId: string) => void;
  availableSkills: Skill[];
  createSkillClientId: () => string;
  onChange: (participant: ProjectRoleDraft) => void;
  errorsByParticipantId: Record<string, RoleValidationErrors>;
}

export const ParticipantEditor: React.FC<ParticipantEditorProps> = ({
  participants,
  selectedParticipantId,
  onSelect,
  availableSkills,
  createSkillClientId,
  onChange,
  errorsByParticipantId,
}) => {
  if (participants.length === 0) {
    return (
      <section className={styles.emptyParticipantEditor}>
        <h2 id="participant-editor-title">Добавьте участника проекта</h2>
        <p>
          После выбора специализации здесь появятся задачи, навыки и
          преимущества участника.
        </p>
      </section>
    );
  }

  const selectedParticipant =
    participants.find(({ clientId }) => clientId === selectedParticipantId) ??
    null;

  return (
    <section
      className={styles.participantEditor}
      aria-labelledby="participant-editor-title"
    >
      <div
        className={styles.participantTabs}
        role="tablist"
        aria-label="Участники проекта"
      >
        {participants.map((participant) => {
          const isSelected = participant.clientId === selectedParticipantId;
          const tabLabel =
            participant.specializationName || NEW_PARTICIPANT_LABEL;
          const hasErrors = Boolean(
            errorsByParticipantId[participant.clientId]
          );

          return (
            <button
              key={participant.clientId}
              type="button"
              role="tab"
              id={`participant-tab-${participant.clientId}`}
              title={tabLabel}
              aria-selected={isSelected}
              aria-controls={PARTICIPANT_PANEL_ID}
              className={[
                isSelected
                  ? styles.participantTabActive
                  : styles.participantTab,
                hasErrors ? styles.participantTabError : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelect(participant.clientId)}
            >
              <span className={styles.participantTabLabel}>{tabLabel}</span>
            </button>
          );
        })}
      </div>

      <div
        className={styles.participantPanel}
        id={PARTICIPANT_PANEL_ID}
        role="tabpanel"
        aria-labelledby={
          selectedParticipant
            ? `participant-tab-${selectedParticipant.clientId}`
            : undefined
        }
      >
        {selectedParticipant ? (
          <ParticipantFields
            participant={selectedParticipant}
            availableSkills={availableSkills}
            createSkillClientId={createSkillClientId}
            onChange={onChange}
            errors={errorsByParticipantId[selectedParticipant.clientId]}
          />
        ) : (
          <div className={styles.participantPlaceholder}>
            <h2 id="participant-editor-title">Выберите вкладку участника</h2>
            <p>
              Откройте вкладку участника, чтобы заполнить задачи, навыки и
              преимущества.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
