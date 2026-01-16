import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Container, Box, Typography, Tabs, Tab } from "@mui/material";
import Home from "./components/Home.jsx";
import ToastContainer from "./components/ToastContainer.jsx";

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function App() {
  const [tabValue, setTabValue] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [initialId, setInitialId] = useState("");

  const addToast = (message, type = "info", duration = 5000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  };

  useEffect(() => {
    // Extract ID from URL path (e.g., /abc-123-def)
    const path = window.location.pathname;
    if (path && path !== "/" && !path.startsWith("/api/")) {
      const id = path.replace(/^\//, "");
      if (id && id.length > 10) {
        // Likely a UUID
        setInitialId(id);
        setTabValue(1); // Switch to view/update tab
      }
    }
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Update URL without page reload
    if (newValue === 0) {
      window.history.pushState({}, "", "/");
    } else if (newValue === 1) {
      window.history.pushState({}, "", `/${initialId}`);
    }
  };

  return (
    <Router>
      <div className="App">
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
              <Tab label="View & Modify Endpoint" />
            </Tabs>
          </Box>

          {/* Tab Panels */}
          <TabPanel value={tabValue} index={0}>
            <Home addToast={addToast} />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Home addToast={addToast} initialId={initialId} viewMode={true} />
          </TabPanel>
        </Container>

        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} />
      </div>
    </Router>
  );
}

export default App;
