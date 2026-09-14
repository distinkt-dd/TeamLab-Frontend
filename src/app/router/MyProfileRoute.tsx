import { selectAuthUser } from '@features/auth';
import { MyProfileOwnerPage, MyProfileParticipantPage } from '@pages';
import { useAppSelector } from '../hooks';

// Личный кабинет зависит от типа аккаунта пользователя (account_type),
// который приходит при логине
export const MyProfileRoute = () => {
  const user = useAppSelector(selectAuthUser);

  if (user?.account_type === 'owner') {
    return <MyProfileOwnerPage />;
  }

  return <MyProfileParticipantPage />;
};
