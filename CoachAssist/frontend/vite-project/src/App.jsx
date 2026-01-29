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
import AnalyzeGamePage from "./pages/AnalyzeGamePage.jsx";

import Navbar from "./components/Navbar.jsx";

function App() {
  const location = useLocation();

  // Paths where navbar should NOT appear:
  const hideNavbarPaths = [
    "/",
    "/login",
    "/signup",
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

        {/* NEW: Email Verification */}
        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/edit-profile" element={<EditProfilePage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/forgotpassword" element={<ForgotPasswordPage />} />
        <Route path="/analyze-game" element={<AnalyzeGamePage />} />
      </Routes>
    </>
  );
}

export default App;


