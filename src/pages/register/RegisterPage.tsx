import { Stepper } from '@shared/ui/stepper';
import styles from './RegisterPage.module.css';
import {
  ChooseRole,
  RegisterOwnerForm,
  RegisterParticipantForm,
} from '@entities/user';
import type { RegisterFormData } from '@entities/user';
import { useState } from 'react';
import bottomImg from './assets/bottom.png';
import { Button } from '@shared/ui';
import { useNavigate } from 'react-router-dom';
import { getRegisterErrorMessage, useRegisterMutation } from '@features/auth';

export const RegisterPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('participant');

  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();

  const handleBack = () => {
    if (step === 2) {
      // Возврат к выбору роли: результат прошлого запроса больше не актуален.
      registerMutation.reset();
      setStep(1);
    } else {
      navigate(-1);
    }
  };

  const handleRoleChange = (nextRole: string) => {
    registerMutation.reset();
    setRole(nextRole);
  };

  // POST /users/ и сразу логин: после успеха пользователь попадает в личный кабинет.
  const handleRegister = (data: RegisterFormData) => {
    registerMutation.mutate(
      {
        ...data,
        accountType: role === 'participant' ? 'participant' : 'owner',
      },
      { onSuccess: () => navigate('/my-profile', { replace: true }) }
    );
  };

  const errorText = registerMutation.isError
    ? getRegisterErrorMessage(registerMutation.error)
    : undefined;

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <Button variant="back" onClick={handleBack}>
          Назад
        </Button>
      </div>
      <Stepper max={2} current={step} />
      <h2 className={styles.title}>Пожалуйста, зарегистрируйтесь</h2>
      <form>
        {step === 1 ? (
          <ChooseRole
            role={role}
            onChange={handleRoleChange}
            onNext={() => setStep(2)}
          />
        ) : role === 'participant' ? (
          <RegisterParticipantForm
            role={role}
            onSubmit={handleRegister}
            isPending={registerMutation.isPending}
            errorText={errorText}
            onResetError={registerMutation.reset}
          />
        ) : (
          <RegisterOwnerForm
            role={role}
            onSubmit={handleRegister}
            isPending={registerMutation.isPending}
            errorText={errorText}
            onResetError={registerMutation.reset}
          />
        )}
      </form>
      <img src={bottomImg} aria-hidden="true" className={styles.img} />
    </main>
  );
};
