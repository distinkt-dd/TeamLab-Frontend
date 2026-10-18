import { getServices } from '@app';
import { StaleLoginError } from '@entities/auth/AuthService';
import type { TokenPairResponse } from '@entities/auth/types';
import { FieldService } from '@entities/field';
import { SpecializationService } from '@entities/specialization';
import { UserService } from '@entities/user';
import type { AccountType } from '@entities/user/types';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { resolveSpecializationId } from '../lib/resolveSpecializationId';

// Данные формы регистрации: направление приходит слагом из формы участника.
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  // Владельцу специализацию не выбирают, поэтому направление необязательное.
  direction?: string;
  accountType: AccountType;
}

class RegistrationAutoLoginCancelledError extends Error {
  constructor(accountCreated: boolean) {
    super(
      accountCreated
        ? 'Аккаунт создан, но автоматический вход отменён из-за изменения сессии. Войдите вручную.'
        : 'Регистрация отменена из-за изменения сессии. Повторите попытку.'
    );
    this.name = 'RegistrationAutoLoginCancelledError';
  }
}

export const useRegisterMutation = (): UseMutationResult<
  TokenPairResponse,
  Error,
  RegisterRequest
> => {
  const { api, auth } = getServices();

  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const operation = auth.beginAuthOperation();
      const userService = new UserService(api);

      const assertRegistrationIsCurrent = (accountCreated: boolean): void => {
        if (!auth.isAuthOperationCurrent(operation)) {
          throw new RegistrationAutoLoginCancelledError(accountCreated);
        }
      };

      // У владельца специализации нет, поэтому справочники нужны только участнику.
      let specializationId: number | null = null;

      if (data.direction) {
        // Направление и специализации — публичные справочники, токен для них не нужен.
        const [fields, specializations] = await Promise.all([
          new FieldService(api).list(),
          new SpecializationService(api).list(),
        ]);

        specializationId = resolveSpecializationId(
          data.direction,
          fields,
          specializations
        );
      }

      assertRegistrationIsCurrent(false);

      // POST /users/: регистрация пользователя — участника или владельца.
      await userService.create({
        username: data.username,
        // Имени в форме нет: по умолчанию показываем логин, его можно изменить в профиле.
        display_name: data.username,
        email: data.email,
        password: data.password,
        account_type: data.accountType,
        specialization_id: specializationId,
      });

      assertRegistrationIsCurrent(true);

      // Сразу логиним созданного пользователя, чтобы открыть личный кабинет.
      try {
        return await auth.login(
          { username: data.username, password: data.password },
          operation
        );
      } catch (error) {
        if (error instanceof StaleLoginError) {
          throw new RegistrationAutoLoginCancelledError(true);
        }
        throw error;
      }
    },
  });
};
