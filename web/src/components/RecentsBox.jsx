import { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  CardActions,
  Link,
} from "@mui/material";
import {
  Delete,
  ContentCopy,
  Launch,
  ClearAll,
  Refresh,
} from "@mui/icons-material";
import {
  StorageHelper,
  DateHelper,
  ClipboardHelper,
} from "../utils/helpers.js";

const RecentsBox = ({ addToast }) => {
  const [recentEndpoints, setRecentEndpoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRecentEndpoints = () => {
    setLoading(true);
    setError(null);

    try {
      // Clean up expired items first
      const cleanedEndpoints = StorageHelper.cleanupExpiredEndpoints();
      setRecentEndpoints(cleanedEndpoints);
    } catch (err) {
      setError("Failed to load recent endpoints");
      addToast("Failed to load recent endpoints", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecentEndpoints();
  }, []);

  const handleCopyUrl = async (url, type) => {
    const success = await ClipboardHelper.copy(url);
    if (success) {
      addToast(`${type} URL copied to clipboard!`, "success");
    } else {
      addToast("Failed to copy URL", "error");
    }
  };

  const handleDelete = (id) => {
    const updated = StorageHelper.removeRecentEndpoint(id);
    setRecentEndpoints(updated);
    addToast("Endpoint removed from recents", "success");
  };

  const handleClearAll = () => {
    StorageHelper.clearRecentEndpoints();
    setRecentEndpoints([]);
    addToast("All recent endpoints cleared", "success");
  };

  // /raw/{id} is the raw JSON endpoint served by the backend.
  const endpointUrl = (id) => `${window.location.origin}/raw/${id}`;

  const handleOpen = (id) => {
    window.open(`/raw/${id}`, "_blank");
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
        >
          <Typography>Loading recent endpoints...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={loadRecentEndpoints} startIcon={<Refresh />}>
          Retry
        </Button>
      </Container>
    );
  }

  if (recentEndpoints.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Recent Endpoints
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create some JSON endpoints to see them here!
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" component="h1">
          Recent Endpoints
        </Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={loadRecentEndpoints} sx={{ mr: 1 }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear All">
            <IconButton onClick={handleClearAll} color="error">
              <ClearAll />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {recentEndpoints.map((endpoint) => (
          <Grid item xs={12} md={6} lg={4} key={endpoint.id}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  mb={2}
                >
                  <Typography
                    variant="h6"
                    component="h2"
                    sx={{ wordBreak: "break-all" }}
                  >
                    {endpoint.id}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(endpoint.id)}
                    color="error"
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>

                <Box mb={2}>
                  <Chip
                    label={`Created: ${DateHelper.formatRelative(endpoint.createdAt)}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ mb: 1, display: "block" }}
                  />
                  {endpoint.expires && (
                    <Chip
                      label={`Expires: ${DateHelper.formatRelative(endpoint.expires)}`}
                      size="small"
                      color={
                        DateHelper.formatRelative(endpoint.expires) ===
                        "Expired"
                          ? "error"
                          : "secondary"
                      }
                      variant="outlined"
                      sx={{ display: "block" }}
                    />
                  )}
                </Box>

                <Box>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ flexGrow: 1 }}
                    >
                      Endpoint URL:
                    </Typography>
                    <Tooltip title="Copy URL">
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleCopyUrl(endpointUrl(endpoint.id), "Endpoint")
                        }
                        sx={{ ml: 1 }}
                      >
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Link
                    href={`/raw/${endpoint.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: "block",
                      fontFamily: "monospace",
                      wordBreak: "break-all",
                      backgroundColor: "grey.100",
                      p: 1,
                      borderRadius: 1,
                    }}
                  >
                    {endpointUrl(endpoint.id)}
                  </Link>
                </Box>
              </CardContent>

              <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
                <Button
                  size="small"
                  startIcon={<Launch />}
                  onClick={() => handleOpen(endpoint.id)}
                  variant="outlined"
                  fullWidth
                >
                  Open JSON
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default RecentsBox;
