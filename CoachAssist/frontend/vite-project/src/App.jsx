import { Routes, Route, useLocation } from "react-router-dom";

import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import EditProfilePage from "./pages/EditProfilePage.jsx";
import TutorialPage from "./pages/TutorialPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import DeleteAccountPage from "./pages/DeleteAccountPage.jsx";
import VerifyPasswordChangePage from "./pages/VerifyPasswordChangePage.jsx";
import AnalyzeGamePage from "./pages/AnalyzeGamePage.jsx";
import TeamPage from "./pages/TeamPage.jsx";
import WatchPage from "./pages/WatchPage";

import Navbar from "./components/Navbar.jsx";

function App() {
  const location = useLocation();

  const hideNavbarPaths = [
    "/",
    "/login",
    "/signup",
    "/verify-email",
    "/verify-email",
    "/forgotpassword",
  ];

  const shouldHideNavbar = hideNavbarPaths.includes(location.pathname);

  return (
    <>
      {!shouldHideNavbar && <Navbar />}

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/edit-profile" element={<EditProfilePage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/forgotpassword" element={<ForgotPasswordPage />} />
        <Route path="/delete-account" element={<DeleteAccountPage />} />
        <Route path="/verify-password-change" element={<VerifyPasswordChangePage />} />
        <Route path="/analyze-game" element={<AnalyzeGamePage />} />
        <Route path="/team/:teamId" element={<TeamPage />} />
        <Route path="/team/:teamId/match/:matchId" element={<AnalyzeGamePage />} />
      </Routes>
    </>
  );
}

export default App;