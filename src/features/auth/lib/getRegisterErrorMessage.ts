// Api оборачивает ошибки ответа в Error с префиксом статуса — оставляем только текст DRF,
// чтобы показать пользователю причину («Пароль слишком короткий», «Пользователь уже существует»).
const STATUS_PREFIX = /^Request failed with status \d+:\s*/;

const NETWORK_ERROR_PATTERN =
  /failed to fetch|load failed|networkerror|network request failed/i;

const NETWORK_ERROR_TEXT =
  'Не удалось связаться с сервером. Проверьте подключение и попробуйте ещё раз.';

const DEFAULT_ERROR_TEXT = 'Не удалось зарегистрироваться. Попробуйте ещё раз.';

export const getRegisterErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return DEFAULT_ERROR_TEXT;
  }

  const message = error.message.replace(STATUS_PREFIX, '').trim();

  if (message === '' || NETWORK_ERROR_PATTERN.test(message)) {
    return NETWORK_ERROR_TEXT;
  }

  return message;
};
