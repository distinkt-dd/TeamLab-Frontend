import { ParticipantCard } from '@entities/user';
import type { UserPublicMock } from '@entities/user/types';
import styles from './ParticipantsList.module.css';

type ParticipantsListProps = {
  users: UserPublicMock[];
};

export const ParticipantsList = ({ users }: ParticipantsListProps) => {
  return (
    <ul className={styles.list}>
      {users.map((user) => (
        <li key={user.id}>
          <ParticipantCard user={user} />
        </li>
      ))}
    </ul>
  );
};
