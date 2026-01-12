"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  IconButton,
  Chip,
} from "@mui/material";
import {
  ContentPaste,
  FormatAlignLeft,
  Edit,
  Delete,
  Close,
  Visibility,
} from "@mui/icons-material";
import MockJGoClient from "../../src/services/api";
import { JsonHelper, DateHelper, ClipboardHelper } from "../../utils/helpers";
import ToastContainer from "../../components/ToastContainer";

export default function EndpointPage() {
  const params = useParams();
  const id = params.id;

  const [endpoint, setEndpoint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [showUpdate, setShowUpdate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Update form state
  const [updateJson, setUpdateJson] = useState("");
  const [updatePassword, setUpdatePassword] = useState("");
  const [updateExpiresIn, setUpdateExpiresIn] = useState("720");
  const [updateValidation, setUpdateValidation] = useState({
    valid: false,
    error: null,
  });
  const [updateLoading, setUpdateLoading] = useState(false);

  // Delete form state
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const client = new MockJGoClient();

  const addToast = (message, type = "info", duration = 5000) => {
    const toastId = Date.now();
    setToasts((prev) => [...prev, { id: toastId, message, type, duration }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
    }, duration);
  };

  useEffect(() => {
    loadEndpoint();
  }, [id]);

  const loadEndpoint = async () => {
    try {
      const response = await client.getJson(id);
      setEndpoint(response.data);
      setUpdateJson(response.data.json);
      setUpdateValidation({ valid: true, error: null });
    } catch (error) {
      setError(error.message || "Failed to load endpoint");
      addToast(error.message || "Failed to load endpoint", "error");
    } finally {
      setLoading(false);
    }
  };

  const validateUpdateJson = (value) => {
    const result = JsonHelper.validate(value);
    setUpdateValidation(result);
    return result.valid;
  };

  const handleUpdateJsonChange = (value) => {
    setUpdateJson(value);
    if (value.trim()) {
      validateUpdateJson(value);
    } else {
      setUpdateValidation({ valid: false, error: null });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!updateJson.trim() || !updateValidation.valid) {
      addToast("Please enter valid JSON", "error");
      return;
    }

    if (!updatePassword) {
      addToast("Password is required for updates", "error");
      return;
    }

    setUpdateLoading(true);

    try {
      await client.updateJson(id, updateJson, updatePassword, updateExpiresIn);
      await loadEndpoint(); // Reload endpoint data
      setShowUpdate(false);
      setUpdatePassword("");
      addToast("Endpoint updated successfully!", "success");
    } catch (error) {
      addToast(error.message || "Failed to update endpoint", "error");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();

    if (!deletePassword) {
      addToast("Password is required for deletion", "error");
      return;
    }

    setDeleteLoading(true);

    try {
      await client.deleteJson(id, deletePassword);
      addToast("Endpoint deleted successfully!", "success");
      // Redirect to home after successful deletion
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error) {
      addToast(error.message || "Failed to delete endpoint", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatUpdateJson = () => {
    const formatted = JsonHelper.format(updateJson);
    setUpdateJson(formatted);
    validateUpdateJson(formatted);
  };

  const copyToClipboard = async (text, label) => {
    try {
      await ClipboardHelper.copy(text);
      addToast(`${label} copied to clipboard!`, "success");
    } catch (error) {
      addToast("Failed to copy to clipboard", "error");
    }
  };

  const viewRawJson = () => {
    window.open(`${window.location.origin}/api/json/${id}/content`, "_blank");
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6">Loading JSON endpoint...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            ❌ Endpoint Not Found
          </Typography>
          <Typography>{error}</Typography>
          <Button variant="contained" href="/" sx={{ mt: 2 }}>
            Create New Endpoint
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            📦 MockJ-Go
          </Typography>
          <Typography variant="h6" color="text.secondary">
            View and modify JSON endpoint
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Endpoint Info */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Endpoint Information
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    API Endpoint URL
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                    <TextField
                      fullWidth
                      value={`${window.location.origin}/api/json/${id}`}
                      InputProps={{ readOnly: true }}
                      size="small"
                    />
                    <IconButton
                      onClick={() =>
                        copyToClipboard(
                          `${window.location.origin}/api/json/${id}`,
                          "API URL"
                        )
                      }
                    >
                      <ContentPaste />
                    </IconButton>
                  </Box>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Endpoint Details
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Typography variant="body2">
                      <strong>ID:</strong> {endpoint.id}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Created:</strong>{" "}
                      {DateHelper.formatDateTime(endpoint.createdAt)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Modified:</strong>{" "}
                      {DateHelper.formatDateTime(endpoint.modifiedAt)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Expires:</strong>{" "}
                      {DateHelper.formatDateTime(endpoint.expires)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Status:</strong>
                      <Chip
                        label={DateHelper.formatRelative(endpoint.expires)}
                        color={
                          DateHelper.formatRelative(endpoint.expires) ===
                          "Expired"
                            ? "error"
                            : "success"
                        }
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={viewRawJson}
                  >
                    View Raw JSON
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => setShowUpdate(true)}
                    disabled={
                      DateHelper.formatRelative(endpoint.expires) === "Expired"
                    }
                  >
                    Update
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => setShowDelete(true)}
                    disabled={
                      DateHelper.formatRelative(endpoint.expires) === "Expired"
                    }
                  >
                    Delete
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* JSON Content */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  JSON Content
                </Typography>

                <Box className="json-display" sx={{ mb: 2, p: 2 }}>
                  <pre>{JsonHelper.formatForDisplay(endpoint.json)}</pre>
                </Box>

                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() =>
                      copyToClipboard(
                        JsonHelper.formatForDisplay(endpoint.json),
                        "JSON"
                      )
                    }
                  >
                    <ContentPaste sx={{ mr: 1 }} />
                    Copy JSON
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Update Form */}
          {showUpdate && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography variant="h5">Update JSON Endpoint</Typography>
                    <IconButton onClick={() => setShowUpdate(false)}>
                      <Close />
                    </IconButton>
                  </Box>

                  <Box component="form" onSubmit={handleUpdate}>
                    <TextField
                      fullWidth
                      multiline
                      rows={8}
                      label="New JSON Content"
                      value={updateJson}
                      onChange={(e) => handleUpdateJsonChange(e.target.value)}
                      error={
                        !updateValidation.valid &&
                        updateValidation.error !== null
                      }
                      helperText={
                        updateValidation.error || "Enter valid JSON data"
                      }
                      className="json-editor"
                      sx={{ mb: 2 }}
                    />

                    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<FormatAlignLeft />}
                        onClick={formatUpdateJson}
                        disabled={!updateJson.trim()}
                      >
                        Format JSON
                      </Button>

                      {updateJson.trim() && updateValidation.valid && (
                        <Chip
                          label="✓ Valid JSON"
                          color="success"
                          size="small"
                        />
                      )}
                    </Box>

                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="password"
                          label="Current Password"
                          value={updatePassword}
                          onChange={(e) => setUpdatePassword(e.target.value)}
                          helperText="Required to update this endpoint"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Expires In</InputLabel>
                          <Select
                            value={updateExpiresIn}
                            onChange={(e) => setUpdateExpiresIn(e.target.value)}
                            label="Expires In"
                          >
                            <MenuItem value="1">1 hour</MenuItem>
                            <MenuItem value="24">1 day</MenuItem>
                            <MenuItem value="168">1 week</MenuItem>
                            <MenuItem value="720">30 days</MenuItem>
                            <MenuItem value="1440">60 days</MenuItem>
                            <MenuItem value="4320">180 days</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>

                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={() => setShowUpdate(false)}
                        disabled={updateLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={
                          updateLoading ||
                          !updateJson.trim() ||
                          !updateValidation.valid
                        }
                      >
                        {updateLoading ? "Updating..." : "Update Endpoint"}
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Delete Confirmation */}
          {showDelete && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography variant="h5">Delete JSON Endpoint</Typography>
                    <IconButton onClick={() => setShowDelete(false)}>
                      <Close />
                    </IconButton>
                  </Box>

                  <Alert severity="warning" sx={{ mb: 2 }}>
                    ⚠️ This action cannot be undone. The endpoint will be
                    permanently deleted.
                  </Alert>

                  <Box component="form" onSubmit={handleDelete}>
                    <TextField
                      fullWidth
                      type="password"
                      label="Password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      helperText="Required to delete this endpoint"
                      sx={{ mb: 2 }}
                    />

                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={() => setShowDelete(false)}
                        disabled={deleteLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        color="error"
                        disabled={deleteLoading}
                      >
                        {deleteLoading ? "Deleting..." : "Delete Endpoint"}
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Container>

      <ToastContainer toasts={toasts} />
    </>
  );
}
