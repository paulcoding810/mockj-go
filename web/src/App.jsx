import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Container, Box, Typography, Tabs, Tab } from "@mui/material";
import Home from "./components/Home.jsx";
import RecentsBox from "./components/RecentsBox.jsx";
import ToastContainer from "./components/ToastContainer.jsx";
import { StorageHelper } from "./utils/helpers.js";

// AppShell renders the header, tab navigation, and routed content. It lives
// inside <BrowserRouter> so it can use the router hooks.
function AppShell({ addToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const tabValue = location.pathname === "/recents" ? 1 : 0;

  const handleTabChange = (event, newValue) => {
    navigate(newValue === 1 ? "/recents" : "/");
  };

  return (
    <>
      {/* Header */}
      <Box
        sx={{
          textAlign: "center",
          py: 4,
          backgroundColor: "background.default",
        }}
      >
        <Typography variant="h3" component="h1" gutterBottom>
          {"{ }"} MockJ
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Create temporary JSON endpoints instantly
        </Typography>
      </Box>

      {/* Tabs */}
      <Container maxWidth="lg">
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="JSON endpoint tabs"
          >
            <Tab label="Create Endpoint" />
            <Tab label="Recent Endpoints" />
          </Tabs>
        </Box>

        <Box sx={{ py: 3 }}>
          <Routes>
            <Route path="/" element={<Home addToast={addToast} />} />
            <Route path="/recents" element={<RecentsBox addToast={addToast} />} />
            {/* Unknown paths fall back to Home. Live endpoint IDs are served
                as raw JSON by the backend and never reach the SPA. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
      </Container>
    </>
  );
}

function App() {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "info", duration = 5000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  };

  useEffect(() => {
    // Clean up expired endpoints on app initialization
    StorageHelper.cleanupExpiredEndpoints();
  }, []);

  return (
    <BrowserRouter>
      <div className="App">
        <AppShell addToast={addToast} />
        <ToastContainer toasts={toasts} />
      </div>
    </BrowserRouter>
  );
}

export default App;
