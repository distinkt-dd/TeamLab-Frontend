import { useNavigate } from 'react-router-dom';
import { getServices } from '@app';
import { ProfileSettings } from '@widgets/profileSettings';
import { useMyProfileParticipant } from '../model/useMyProfileParticipant';
import { CurrentProjects } from './CurrentProjects';
import { ParticipantProfile } from './ParticipantProfile';
import { ProfileHeader } from './ProfileHeader';
import styles from './MyProfileParticipantPage.module.css';

export const MyProfileParticipantPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    isUserPending,
    isUserError,
    projectCards,
    isProjectsPending,
    isProjectsError,
    waitingItems,
    updateNotifications,
    isNotificationUpdating,
    isNotificationUpdateError,
    updateVisibility,
    isVisibilityUpdating,
    isVisibilityUpdateError,
  } = useMyProfileParticipant();

  const handleLogout = () => {
    getServices().auth.logout();
  };

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <ProfileHeader onBack={() => navigate('/')} />
        <CurrentProjects
          projects={projectCards}
          isPending={isProjectsPending}
          isError={isProjectsError}
        />
        <ParticipantProfile
          user={user}
          isPending={isUserPending}
          isError={isUserError}
        />
        <ProfileSettings
          notificationEnabled={user?.notification_enabled}
          isNotificationUpdating={isNotificationUpdating}
          isNotificationUpdateError={isNotificationUpdateError}
          onNotificationChange={updateNotifications}
          profileVisibility={user?.profile_visibility}
          isVisibilityUpdating={isVisibilityUpdating}
          isVisibilityUpdateError={isVisibilityUpdateError}
          onVisibilityChange={updateVisibility}
          onLogout={handleLogout}
          profileEmail={user?.email}
          waitingItems={waitingItems}
          isWaitingPending={isProjectsPending}
          isWaitingError={isProjectsError}
          waitingPendingText="Загружаем приглашения..."
          waitingErrorText="Не удалось загрузить приглашения. Попробуйте обновить страницу."
          waitingEmptyText="Приглашений пока нет."
        />
      </div>
    </div>
  );
};
