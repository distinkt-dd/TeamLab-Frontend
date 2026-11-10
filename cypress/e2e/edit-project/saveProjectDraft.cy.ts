const importAutModule = <T>(window: Window, path: string): Promise<T> =>
  (
    window as Window & {
      eval: (code: string) => unknown;
    }
  ).eval(`import(${JSON.stringify(path)})`) as Promise<T>;

const serverRole = (id: number, specializationId: number, name: string) => ({
  id,
  project_id: 42,
  specialization_id: specializationId,
  specialization_name: name,
  tasks: [`Задача ${name}`],
  benefits: [`Преимущество ${name}`],
  skills: [
    {
      id: id * 10,
      skill_id: specializationId,
      name: `Навык ${name}`,
      description: `Описание ${name}`,
      order: 1,
    },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const project = (roles = [serverRole(1, 1, 'Frontend')]) => ({
  id: 42,
  owner_id: 10,
  field_id: 1,
  title: 'TeamLab',
  description: 'Описание проекта',
  problem: 'Проблема проекта',
  image: 'https://signed.example/image.webp',
  status: 'open' as const,
  is_favorited: false,
  roles,
  matching_role_id: null,
  matching_role_name: null,
  my_interest_id: null,
  my_interest_status: null,
  my_interest_source: null,
  my_membership_id: null,
  my_membership_status: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

describe('сохранение черновика проекта', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/v1/users/**', {
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    cy.visit('http://localhost:5173/policy');
  });

  it('валидирует обязательные списки, уникальность ролей, навыков и order', () => {
    cy.window().then(async (window) => {
      const [{ toEditProjectDraft }, { validateProjectDraft }] =
        await Promise.all([
          importAutModule<
            typeof import('../../../src/pages/editProject/model')
          >(window, '/src/pages/editProject/model.ts'),
          importAutModule<
            typeof import('../../../src/pages/editProject/saveProjectDraft')
          >(window, '/src/pages/editProject/saveProjectDraft.ts'),
        ]);
      const draft = toEditProjectDraft(project());
      draft.title = ' ';
      draft.roles.push({
        ...draft.roles[0],
        id: null,
        clientId: 'local-role-1',
        tasks: [],
        benefits: [' '],
        skills: [
          ...draft.roles[0].skills,
          {
            ...draft.roles[0].skills[0],
            id: null,
            clientId: 'duplicate-skill',
          },
        ],
      });

      const errors = validateProjectDraft(draft);

      expect(errors.title).to.be.a('string');
      expect(errors.roles).to.be.a('string');
      expect(errors.roleErrors['role-1'].specialization).to.be.a('string');
      expect(errors.roleErrors['local-role-1']).to.include.keys(
        'specialization',
        'tasks',
        'skills',
        'benefits'
      );
    });
  });

  it('не отправляет запросы без изменений и не включает signed URL в PATCH', () => {
    cy.window().then(async (window) => {
      const [{ toEditProjectDraft }, saveModule] = await Promise.all([
        importAutModule<typeof import('../../../src/pages/editProject/model')>(
          window,
          '/src/pages/editProject/model.ts'
        ),
        importAutModule<
          typeof import('../../../src/pages/editProject/saveProjectDraft')
        >(window, '/src/pages/editProject/saveProjectDraft.ts'),
      ]);
      const baseline = project();
      const draft = toEditProjectDraft(baseline);
      const calls: unknown[] = [];
      const projectService = {
        updateProject: async (...args: unknown[]) => {
          calls.push(args);
          return baseline;
        },
      };
      const roleService = {
        create: async () => baseline.roles[0],
        update: async () => baseline.roles[0],
        delete: async () => undefined,
      };

      const unchanged = await saveModule.saveProjectDraft(
        draft,
        baseline,
        projectService,
        roleService
      );
      expect(unchanged.attempted).to.equal(false);
      expect(calls).to.have.length(0);

      draft.title = 'Новое название';
      await saveModule.saveProjectDraft(
        draft,
        baseline,
        projectService,
        roleService
      );
      expect(calls).to.deep.equal([[42, { title: 'Новое название' }]]);
      expect(calls[0][1]).not.to.have.property('image');
    });
  });

  it('освобождает специализацию явным удалением до конфликтующего PATCH', () => {
    cy.window().then(async (window) => {
      const [{ toEditProjectDraft }, { saveProjectDraft }] = await Promise.all([
        importAutModule<typeof import('../../../src/pages/editProject/model')>(
          window,
          '/src/pages/editProject/model.ts'
        ),
        importAutModule<
          typeof import('../../../src/pages/editProject/saveProjectDraft')
        >(window, '/src/pages/editProject/saveProjectDraft.ts'),
      ]);
      const baseline = project([
        serverRole(1, 1, 'Frontend'),
        serverRole(2, 2, 'Backend'),
      ]);
      const draft = toEditProjectDraft(baseline);
      draft.roles = [
        {
          ...draft.roles[1],
          specializationId: 1,
          specializationName: 'Frontend',
        },
      ];
      draft.deletedRoleIds = [1];
      const operations: string[] = [];

      const result = await saveProjectDraft(
        draft,
        baseline,
        { updateProject: async () => baseline },
        {
          create: async () => baseline.roles[0],
          delete: async (id) => {
            operations.push(`delete-${id}`);
          },
          update: async (id, data) => {
            operations.push(`update-${id}`);
            expect(data).to.deep.equal({ specialization_id: 1 });
            return baseline.roles[1];
          },
        }
      );

      expect(result.failures).to.deep.equal([]);
      expect(operations).to.deep.equal(['delete-1', 'update-2']);
    });
  });

  it('после частичного создания сопоставляет server ID и повторяет только сбой', () => {
    cy.window().then(async (window) => {
      const [{ toEditProjectDraft }, saveModule] = await Promise.all([
        importAutModule<typeof import('../../../src/pages/editProject/model')>(
          window,
          '/src/pages/editProject/model.ts'
        ),
        importAutModule<
          typeof import('../../../src/pages/editProject/saveProjectDraft')
        >(window, '/src/pages/editProject/saveProjectDraft.ts'),
      ]);
      const baseline = project([]);
      const draft = toEditProjectDraft(baseline);
      const makeDraftRole = (specializationId: number) => ({
        id: null,
        clientId: `local-role-${specializationId}`,
        specializationId,
        specializationName: `Role ${specializationId}`,
        tasks: ['Task'],
        benefits: ['Benefit'],
        skills: [
          {
            id: null,
            clientId: `local-skill-${specializationId}`,
            skillId: specializationId,
            name: `Skill ${specializationId}`,
            description: 'Description',
            order: 1,
          },
        ],
      });
      draft.roles = [makeDraftRole(1), makeDraftRole(2)];
      let createCalls = 0;
      const roleOne = serverRole(11, 1, 'Role 1');
      const writer = {
        create: async () => {
          createCalls += 1;
          if (createCalls === 2) throw new Error('temporary failure');
          return roleOne;
        },
        update: async () => roleOne,
        delete: async () => undefined,
      };

      const firstResult = await saveModule.saveProjectDraft(
        draft,
        baseline,
        { updateProject: async () => baseline },
        writer
      );
      expect(firstResult.failures).to.have.length(1);

      const refreshed = project([roleOne]);
      const reconciled = saveModule.reconcileDraftWithServer(draft, refreshed);
      expect(reconciled.roles[0].id).to.equal(11);
      expect(reconciled.roles[1].id).to.equal(null);

      await saveModule.saveProjectDraft(
        reconciled,
        refreshed,
        { updateProject: async () => refreshed },
        writer
      );
      expect(createCalls).to.equal(3);
    });
  });
});
