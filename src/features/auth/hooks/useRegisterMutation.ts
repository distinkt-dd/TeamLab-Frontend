import { getServices } from '@app';
import type { TokenPairResponse } from '@entities/auth/types';
import { FieldService } from '@entities/field';
import { SpecializationService } from '@entities/specialization';
import { UserService } from '@entities/user';
import type { AccountType } from '@entities/user/types';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { resolveSpecializationId } from '../lib/resolveSpecializationId';

// Данные формы регистрации: направление приходит слагом из формы.
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  direction: string;
  accountType: AccountType;
}

export const useRegisterMutation = (): UseMutationResult<
  TokenPairResponse,
  Error,
  RegisterRequest
> => {
  const { api, auth } = getServices();

  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const userService = new UserService(api);

      // Направление и специализации — публичные справочники, токен для них не нужен.
      const [fields, specializations] = await Promise.all([
        new FieldService(api).list(),
        new SpecializationService(api).list(),
      ]);

      // POST /users/: регистрация пользователя — участника или владельца.
      await userService.create({
        username: data.username,
        // Имени в форме нет: по умолчанию показываем логин, его можно изменить в профиле.
        display_name: data.username,
        email: data.email,
        password: data.password,
        account_type: data.accountType,
        specialization_id: resolveSpecializationId(
          data.direction,
          fields,
          specializations
        ),
      });

      // Сразу логиним созданного пользователя, чтобы открыть личный кабинет.
      return auth.login({ username: data.username, password: data.password });
    },
  });
};
