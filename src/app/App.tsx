import { fetchUsers } from '@entities/user/model/actions';
import {
  EditProfilePage,
  EditProjectPage,
  ErrorPage,
  FavoritesPage,
  LoginPage,
  MainPage,
  ParticipantsPage,
  PolicyPage,
  ProfilePage,
  ProjectCardPage,
  ProjectsPage,
  QuestionsPage,
  RegisterPage,
  RequestsPage,
} from '@pages';
import { MainLayout } from '@shared/ui/layout/main/MainLayout';
import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import './App.css';
import { useAppDispatch } from './hooks';
import { ProtectedRoute } from './providers';
import { MyProfileRoute } from './router';
import './styles/index.css';

export function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchUsers()).then((res) => console.log('thunk result:', res));
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* Публичные маршруты */}
        <Route index element={<MainPage />} />
        <Route path="policy" element={<PolicyPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="participants" element={<ParticipantsPage />} />
        <Route path="*" element={<ErrorPage />} />
        <Route path="participants" element={<ParticipantsPage />} />
        <Route path="questions" element={<QuestionsPage />} />
        {/* Защищённые маршруты */}
        <Route element={<ProtectedRoute />}>
          <Route path="projects/:id" element={<ProjectCardPage />} />
          <Route path="profile/:id" element={<ProfilePage />} />
          <Route path="my-profile" element={<MyProfileRoute />} />
          <Route path="edit-profile" element={<EditProfilePage />} />
          <Route path="edit-project" element={<EditProjectPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
