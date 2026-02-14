import { Routes, Route, useLocation } from "react-router-dom";

// Page Components
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
import EditRosterPage from "./pages/EditRosterPage";

// Shared UI component
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function App() {
  // Get current location
  const location = useLocation();

  // Routes where Navbar shouldn't appear
  // (auth and landing pages)
  const hideNavbarPaths = [
    "/",
    "/login",
    "/signup",
    "/verify-email",
    "/verify-email",
    "/forgotpassword",
  ];

  // Determine if Navbar should be hidden
  const shouldHideNavbar = hideNavbarPaths.includes(location.pathname);

  return (
    <>
      {!shouldHideNavbar && <Navbar />}

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit-profile"
          element={
            <ProtectedRoute>
              <EditProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/forgotpassword" element={<ForgotPasswordPage />} />
        <Route path="/delete-account" element={<DeleteAccountPage />} />
        <Route
          path="/verify-password-change"
          element={<VerifyPasswordChangePage />}
        />
        <Route
          path="/analyze-game"
          element={
            <ProtectedRoute>
              <AnalyzeGamePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team/:teamId"
          element={
            <ProtectedRoute>
              <TeamPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team/:teamId/match/:matchId"
          element={
            <ProtectedRoute>
              <AnalyzeGamePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams/:teamId/roster"
          element={
            <ProtectedRoute>
              <EditRosterPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

// Export root App component
export default App;